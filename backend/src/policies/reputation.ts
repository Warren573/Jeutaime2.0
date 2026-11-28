/**
 * Confiance et classement — règles PURES (aucune requête, aucune horloge implicite).
 *
 * Cette PR pose les FONDATIONS uniquement :
 *   - aucun barème (valeur de points) n'est défini ici : chaque événement porte le `delta` décidé par la
 *     fonctionnalité qui l'émet, dans une PR ultérieure validée ;
 *   - aucun seuil de pénalité, plafond, niveau public, fenêtre d'observation ou formule de sélection ;
 *   - la remise à zéro après inactivité reste DÉSACTIVÉE tant qu'aucun seuil n'est configuré.
 *
 * Invariants garantis par ce module et par le service :
 *   1. Trois axes strictement séparés (fiabilité, participation, popularité). Les pièces n'en font pas partie.
 *   2. Un événement n'est jamais modifié ni supprimé : on l'annule par un événement compensatoire.
 *   3. Un même fait (clé d'idempotence) ne produit jamais deux événements.
 *   4. Aucune valeur n'est calculée côté client.
 */
import { Role } from "@prisma/client";
import { BadRequestError, ForbiddenError } from "../core/errors";

/** Version des règles en vigueur (inscrite dans chaque événement ; aucun recalcul rétroactif n'existe). */
export const REPUTATION_RULE_VERSION = 1;

/** Borne technique de sécurité sur un événement (anti-erreur de saisie) : ce n'est PAS un barème. */
export const MAX_ABS_DELTA = 1_000;

export const AXES = ["RELIABILITY", "PARTICIPATION", "POPULARITY"] as const;
export type ReputationAxisName = (typeof AXES)[number];

/** Colonne de ReputationState correspondant à chaque axe. */
export const AXIS_FIELD = {
  RELIABILITY: "reliability",
  PARTICIPATION: "participation",
  POPULARITY: "popularity",
} as const satisfies Record<ReputationAxisName, string>;

export type DeltaRule = "ANY" | "ZERO" | "NON_NEGATIVE" | "NON_POSITIVE";

export interface KindDefinition {
  /** Axe imposé, ou « ANY » (réservé aux types système). */
  axis: ReputationAxisName | "ANY";
  delta: DeltaRule;
  /** Réservé au moteur : ne peut pas être enregistré directement par une fonctionnalité. */
  reserved?: boolean;
  /** L'événement exige un administrateur à l'origine (`actorId`). */
  requiresActor?: boolean;
}

/** Types SYSTÈME (aucun n'a de valeur de barème). */
export const SYSTEM_KINDS = {
  /** Ajustement manuel, ADMIN/OWNER uniquement. */
  ADMIN_ADJUST: { axis: "ANY", delta: "ANY", requiresActor: true },
  /** Annulation d'un événement (créé uniquement par `reverseReputationEvent`). */
  REVERSAL: { axis: "ANY", delta: "ANY", reserved: true, requiresActor: true },
  /** Repère d'une remise à zéro (delta 0 ; créé uniquement par le moteur). */
  INACTIVITY_RESET: { axis: "ANY", delta: "ZERO", reserved: true },
} as const satisfies Record<string, KindDefinition>;

const registry = new Map<string, KindDefinition>(Object.entries(SYSTEM_KINDS));

const KIND_PATTERN = /^[A-Z][A-Z0-9_]{2,63}$/;

/**
 * Déclare un type d'événement fonctionnel (ex. « LETTER_REPLIED »). À appeler à l'initialisation du module qui
 * l'émet, dans la PR qui fixe son barème. Un type est rattaché à UN SEUL axe : c'est la séparation des axes.
 */
export function registerReputationKind(kind: string, definition: KindDefinition): void {
  if (!KIND_PATTERN.test(kind)) throw new Error(`Type d'événement invalide : ${kind}`);
  if (definition.axis === "ANY" || definition.reserved) {
    throw new Error("Un type fonctionnel doit être rattaché à un axe précis et ne peut pas être réservé");
  }
  const existing = registry.get(kind);
  if (existing) {
    if (existing.axis === definition.axis && existing.delta === definition.delta) return; // idempotent
    throw new Error(`Type d'événement déjà déclaré avec une autre définition : ${kind}`);
  }
  registry.set(kind, { ...definition });
}

export function getKindDefinition(kind: string): KindDefinition | undefined {
  return registry.get(kind);
}

export interface EventInput {
  userId: string;
  axis: ReputationAxisName;
  kind: string;
  delta: number;
  /** Clé d'idempotence : doit identifier le FAIT (jamais la requête). Voir `buildDedupeKey`. */
  dedupeKey: string;
  commitment?: boolean;
  contestable?: boolean;
  visibleToUser?: boolean;
  sourceType?: string | null;
  sourceId?: string | null;
  actorId?: string | null;
  meta?: Record<string, unknown> | null;
  occurredAt?: Date;
  ruleVersion?: number;
}

/** Clé d'idempotence canonique : type, source et membre — jamais un horodatage de requête. */
export function buildDedupeKey(kind: string, sourceType: string, sourceId: string, userId: string): string {
  return `${kind}:${sourceType}:${sourceId}:${userId}`;
}

function assertDeltaAllowed(rule: DeltaRule, delta: number): void {
  const ok =
    rule === "ANY" ||
    (rule === "ZERO" && delta === 0) ||
    (rule === "NON_NEGATIVE" && delta >= 0) ||
    (rule === "NON_POSITIVE" && delta <= 0);
  if (!ok) throw new BadRequestError("Valeur de l'événement incompatible avec son type");
}

/**
 * Valide un événement à enregistrer. Refuse : type inconnu ou réservé, axe différent de celui du type,
 * delta non entier ou hors borne, clé d'idempotence vide, ajustement sans administrateur.
 */
export function validateEventInput(input: EventInput, options: { allowReserved?: boolean } = {}): KindDefinition {
  const def = registry.get(input.kind);
  if (!def) throw new BadRequestError(`Type d'événement inconnu : ${input.kind}`);
  if (def.reserved && !options.allowReserved) throw new BadRequestError("Type d'événement réservé au moteur");
  if (!AXES.includes(input.axis)) throw new BadRequestError("Axe inconnu");
  if (def.axis !== "ANY" && def.axis !== input.axis) {
    throw new BadRequestError("Cet événement n'appartient pas à cet axe (les axes sont strictement séparés)");
  }
  if (!Number.isInteger(input.delta) || Math.abs(input.delta) > MAX_ABS_DELTA) {
    throw new BadRequestError("Valeur de l'événement invalide");
  }
  assertDeltaAllowed(def.delta, input.delta);
  const key = input.dedupeKey?.trim();
  if (!key || key.length > 240) throw new BadRequestError("Clé d'idempotence invalide");
  if (!input.userId) throw new BadRequestError("Membre manquant");
  if (def.requiresActor && !input.actorId) throw new BadRequestError("Cet événement exige un administrateur à l'origine");
  return def;
}

/** Seuls ADMIN et OWNER peuvent ajuster, annuler ou arbitrer. (La double authentification est vérifiée par les routes.) */
export function assertCanAdjustReputation(role: Role | string): void {
  if (role !== Role.ADMIN && role !== Role.OWNER) {
    throw new ForbiddenError("Permissions insuffisantes");
  }
}

// ── Inactivité ────────────────────────────────────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Seuil technique d'inactivité, en jours, ou null (= remise à zéro DÉSACTIVÉE).
 * Le seuil définitif et la définition de l'activité réelle seront validés avant activation.
 */
export function parseInactivityThresholdDays(raw: number | string | undefined | null): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 3650) return null;
  return n;
}

/**
 * Une remise à zéro est due si ET SEULEMENT SI :
 *   - un seuil est configuré ;
 *   - la dernière activité réelle est CONNUE (jamais de remise à zéro déduite d'une donnée absente : pas de rétroactivité) ;
 *   - le délai est atteint ;
 *   - aucune remise à zéro n'a déjà eu lieu depuis cette activité (idempotence : une seule par période d'inactivité).
 * Le mode vacances n'intervient PAS : la règle validée l'ignore.
 */
export function isInactivityResetDue(
  state: { lastActivityAt: Date | null; lastResetAt: Date | null },
  now: Date,
  thresholdDays: number | null,
): boolean {
  if (thresholdDays === null || state.lastActivityAt === null) return false;
  if (state.lastResetAt !== null && state.lastResetAt.getTime() >= state.lastActivityAt.getTime()) return false;
  return now.getTime() - state.lastActivityAt.getTime() >= thresholdDays * DAY_MS;
}

// ── Accueil quotidien ─────────────────────────────────────────────────────────────────────────────────────

const LOCAL_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Date LOCALE du membre « AAAA-MM-JJ » fournie par l'appareil. Refusée si le format ou la date est invalide, ou si elle
 * s'écarte de plus d'un jour de l'instant serveur (tous les fuseaux, de −12 h à +14 h, restent dans cette tolérance).
 */
export function parseLocalDay(value: string, now: Date): string {
  const m = LOCAL_DAY.exec(value ?? "");
  if (!m) throw new BadRequestError("Date locale invalide");
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = Date.UTC(y, mo - 1, d);
  const check = new Date(t);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) {
    throw new BadRequestError("Date locale invalide");
  }
  if (Math.abs(t - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) > DAY_MS) {
    throw new BadRequestError("Date locale incohérente");
  }
  return value;
}

/** Contrainte de rédaction des motifs (contestation, ajustement). */
export function normalizeReason(value: string, max = 2000): string {
  const v = (value ?? "").trim();
  if (v.length < 3 || v.length > max) throw new BadRequestError("Motif invalide");
  return v;
}

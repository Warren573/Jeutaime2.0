import { randomUUID } from "crypto";
import { Prisma, ReputationState, Role } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../../core/errors";
import { isTestMode } from "../../core/testMode";
import { writeAudit } from "../admin/admin.audit";
import { isCalendarInactivityResetDue, parseInactivityMonths } from "../../policies/reputationRules";
import {
  AXIS_FIELD,
  REPUTATION_RULE_VERSION,
  assertCanAdjustReputation,
  isInactivityResetDue,
  normalizeReason,
  parseInactivityThresholdDays,
  parseLocalDay,
  validateEventInput,
  type EventInput,
  type ReputationAxisName,
} from "../../policies/reputation";

/**
 * Moteur de confiance et de classement — FONDATIONS.
 *
 * Aucune fonctionnalité de l'application n'appelle encore ce moteur (sauf la collecte de données décrite dans la PR) :
 * il est testé avant toute bascule. Toute écriture se fait côté serveur, dans une transaction, sous un verrou de ligne
 * par membre (`ReputationState`), ce qui sérialise les événements, annulations et remises à zéro d'un même membre.
 *
 * Les pièces (Wallet / CoinTransaction) ne sont JAMAIS lues ni écrites ici.
 */

export type Tx = Prisma.TransactionClient;
type Db = Tx | typeof prisma;

const TX_OPTIONS = { maxWait: 5_000, timeout: 10_000 } as const;

/** Exécute `fn` dans une transaction (point d'entrée pour les appels autonomes). */
export function runInTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn, TX_OPTIONS);
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}
function isForeignKeyViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2003";
}

// ============================================================
// État : création à la demande (base NEUTRE) et verrouillage
// ============================================================

/**
 * Crée l'état du membre s'il n'existe pas (tout à zéro). Aucun ancien score (discoveryActivityScore, points, etc.)
 * n'est lu ni converti : la base de départ est toujours neutre.
 */
export async function ensureReputationState(db: Db, userId: string): Promise<ReputationState> {
  const existing = await db.reputationState.findUnique({ where: { userId } });
  if (existing) return existing;
  try {
    await db.reputationState.createMany({ data: [{ userId }], skipDuplicates: true });
  } catch (err) {
    if (isForeignKeyViolation(err)) throw new NotFoundError("Utilisateur");
    throw err;
  }
  return db.reputationState.findUniqueOrThrow({ where: { userId } });
}

/** Crée si besoin puis verrouille la ligne d'état (FOR UPDATE) : sérialise tout ce qui touche ce membre. */
async function lockState(tx: Tx, userId: string): Promise<ReputationState> {
  try {
    await tx.reputationState.createMany({ data: [{ userId }], skipDuplicates: true });
  } catch (err) {
    if (isForeignKeyViolation(err)) throw new NotFoundError("Utilisateur");
    throw err;
  }
  await tx.$queryRaw`SELECT "userId" FROM "ReputationState" WHERE "userId" = ${userId} FOR UPDATE`;
  return tx.reputationState.findUniqueOrThrow({ where: { userId } });
}

// ============================================================
// Enregistrement d'un événement (idempotent, atomique)
// ============================================================

export interface RecordResult {
  /** Vrai si l'événement a été créé ; faux s'il existait déjà (même clé d'idempotence) : rien n'a été modifié. */
  applied: boolean;
  eventId: string | null;
}

/**
 * Enregistre un événement ET met à jour l'état dans la MÊME transaction `tx`.
 *  - Idempotent : la clé `dedupeKey` est unique ; un doublon ne modifie ni le registre ni l'état.
 *  - Concurrent : le verrou de ligne sérialise les écritures d'un même membre ; les incréments sont atomiques.
 *  - Axe : seul l'axe de l'événement est modifié (jamais les deux autres, jamais les pièces).
 */
export async function recordReputationEvent(tx: Tx, input: EventInput): Promise<RecordResult> {
  validateEventInput(input);
  return insertEvent(tx, input);
}

async function insertEvent(
  tx: Tx,
  input: EventInput,
  extra: { reversalOf?: string; forceAffectsState?: boolean } = {},
): Promise<RecordResult> {
  const state = await lockState(tx, input.userId);
  const id = randomUUID();
  const affectsState = extra.forceAffectsState ?? true;
  const created = await tx.reputationEvent.createMany({
    data: [
      {
        id,
        userId: input.userId,
        axis: input.axis,
        kind: input.kind,
        delta: input.delta,
        ruleVersion: input.ruleVersion ?? REPUTATION_RULE_VERSION,
        epoch: state.epoch,
        commitment: input.commitment ?? false,
        affectsState,
        contestable: input.contestable ?? false,
        visibleToUser: input.visibleToUser ?? true,
        sourceType: input.sourceType ?? null,
        sourceId: input.sourceId ?? null,
        actorId: input.actorId ?? null,
        meta: (input.meta ?? undefined) as Prisma.InputJsonValue | undefined,
        dedupeKey: input.dedupeKey.trim(),
        reversalOf: extra.reversalOf ?? null,
        occurredAt: input.occurredAt ?? new Date(),
      },
    ],
    skipDuplicates: true,
  });
  if (created.count === 0) return { applied: false, eventId: null };

  if (affectsState) {
    await tx.reputationState.update({
      where: { userId: input.userId },
      data: {
        [AXIS_FIELD[input.axis]]: { increment: input.delta },
        ...(input.commitment ? { evaluatedCommitments: { increment: 1 } } : {}),
        ruleVersion: input.ruleVersion ?? REPUTATION_RULE_VERSION,
      },
    });
  }
  return { applied: true, eventId: id };
}

/** Variante autonome (ouvre sa propre transaction). */
export function recordReputationEventStandalone(input: EventInput): Promise<RecordResult> {
  return runInTransaction((tx) => recordReputationEvent(tx, input));
}

// ============================================================
// Annulation par événement compensatoire
// ============================================================

export interface Actor {
  id: string;
  role: Role | string;
}

export interface ReversalResult {
  /** Faux si l'événement avait déjà été annulé (opération idempotente). */
  applied: boolean;
  reversalEventId: string | null;
  alreadyReversed: boolean;
}

/**
 * Annule un événement injustifié par un événement COMPENSATOIRE (delta opposé, même axe). L'original reste intact.
 * Un événement ne peut être annulé qu'une fois (index unique sur `reversalOf`). Si l'événement date d'une époque
 * révolue (remise à zéro intervenue), la compensation est journalisée mais ne touche pas l'état courant.
 */
export async function reverseReputationEventTx(
  tx: Tx,
  params: { eventId: string; actor: Actor; reason: string },
): Promise<ReversalResult> {
  assertCanAdjustReputation(params.actor.role);
  const reason = normalizeReason(params.reason);

  const original = await tx.reputationEvent.findUnique({ where: { id: params.eventId } });
  if (!original) throw new NotFoundError("Événement");
  if (original.reversalOf !== null || original.kind === "REVERSAL") {
    throw new BadRequestError("Une annulation ne peut pas être annulée");
  }
  if (original.kind === "INACTIVITY_RESET") {
    throw new BadRequestError("Une remise à zéro ne s'annule pas par un événement compensatoire");
  }

  const state = await lockState(tx, original.userId);
  const alreadyReversed = await tx.reputationEvent.findUnique({ where: { reversalOf: original.id }, select: { id: true } });
  if (alreadyReversed) return { applied: false, reversalEventId: alreadyReversed.id, alreadyReversed: true };

  const currentEpoch = original.epoch === state.epoch && original.affectsState;
  const result = await insertEvent(
    tx,
    {
      userId: original.userId,
      axis: original.axis,
      kind: "REVERSAL",
      delta: -original.delta,
      dedupeKey: `reversal:${original.id}`,
      actorId: params.actor.id,
      sourceType: "ReputationEvent",
      sourceId: original.id,
      visibleToUser: original.visibleToUser,
      meta: { reason, originalKind: original.kind, originalEpoch: original.epoch },
    },
    { reversalOf: original.id, forceAffectsState: currentEpoch },
  );
  // Insertion refusée par l'index unique : une annulation concurrente l'a devancée.
  if (!result.applied) {
    const winner = await tx.reputationEvent.findUnique({ where: { reversalOf: original.id }, select: { id: true } });
    return { applied: false, reversalEventId: winner?.id ?? null, alreadyReversed: true };
  }
  return { applied: true, reversalEventId: result.eventId, alreadyReversed: false };
}

/** Annulation autonome + trace d'audit (réservée ADMIN / OWNER). */
export async function reverseReputationEvent(params: { eventId: string; actor: Actor; reason: string }): Promise<ReversalResult> {
  assertCanAdjustReputation(params.actor.role);
  const result = await runInTransaction((tx) => reverseReputationEventTx(tx, params));
  if (result.applied) {
    await writeAudit({
      actorId: params.actor.id,
      action: "reputation.event.reverse",
      target: params.eventId,
      meta: { reversalEventId: result.reversalEventId } as Prisma.InputJsonValue,
    });
  }
  return result;
}

/** Ajustement manuel (événement ADMIN_ADJUST) : ADMIN / OWNER, motif obligatoire, journalisé. */
export async function adjustReputation(params: {
  actor: Actor;
  userId: string;
  axis: ReputationAxisName;
  delta: number;
  reason: string;
  dedupeKey: string;
}): Promise<RecordResult> {
  assertCanAdjustReputation(params.actor.role);
  const reason = normalizeReason(params.reason);
  const result = await runInTransaction((tx) =>
    recordReputationEvent(tx, {
      userId: params.userId,
      axis: params.axis,
      kind: "ADMIN_ADJUST",
      delta: params.delta,
      dedupeKey: params.dedupeKey,
      actorId: params.actor.id,
      sourceType: "AdminAdjust",
      sourceId: params.dedupeKey,
      meta: { reason },
    }),
  );
  if (result.applied) {
    await writeAudit({
      actorId: params.actor.id,
      action: "reputation.adjust",
      target: params.userId,
      meta: { axis: params.axis, delta: params.delta, eventId: result.eventId } as Prisma.InputJsonValue,
    });
  }
  return result;
}

// ============================================================
// Contestation (préparation : aucune route, aucune interface)
// ============================================================

/** Un membre conteste une pénalité qui le concerne (visible, contestable, non annulée, époque courante). */
export async function openReputationDispute(params: { userId: string; eventId: string; reason: string }) {
  const reason = normalizeReason(params.reason);
  return runInTransaction(async (tx) => {
    const event = await tx.reputationEvent.findUnique({ where: { id: params.eventId } });
    // Même message pour « inexistant » et « appartient à un autre » : aucune fuite.
    if (!event || event.userId !== params.userId || !event.visibleToUser) throw new NotFoundError("Événement");
    if (!event.contestable || event.delta >= 0) throw new BadRequestError("Cet événement n'est pas contestable");
    const state = await lockState(tx, params.userId);
    if (event.epoch !== state.epoch || !event.affectsState) throw new BadRequestError("Cet événement n'a plus d'effet");
    if (await tx.reputationEvent.findUnique({ where: { reversalOf: event.id }, select: { id: true } })) {
      throw new ConflictError("Cet événement a déjà été annulé");
    }
    try {
      return await tx.reputationDispute.create({
        data: { eventId: event.id, userId: params.userId, reason },
        select: { id: true, status: true, eventId: true, createdAt: true },
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictError("Cet événement a déjà été contesté");
      throw err;
    }
  });
}

/** Le membre retire sa contestation (seulement si elle est encore ouverte). */
export async function withdrawReputationDispute(params: { userId: string; disputeId: string }): Promise<boolean> {
  const res = await prisma.reputationDispute.updateMany({
    where: { id: params.disputeId, userId: params.userId, status: "OPEN" },
    data: { status: "WITHDRAWN", resolvedAt: new Date() },
  });
  return res.count === 1;
}

/**
 * Arbitrage (ADMIN / OWNER). Garde conditionnelle : un seul arbitrage par contestation, même en concurrence.
 * Acceptation = événement compensatoire créé dans la même transaction.
 */
export async function resolveReputationDispute(params: {
  disputeId: string;
  actor: Actor;
  accept: boolean;
  resolution: string;
}) {
  assertCanAdjustReputation(params.actor.role);
  const resolution = normalizeReason(params.resolution);
  const out = await runInTransaction(async (tx) => {
    const dispute = await tx.reputationDispute.findUnique({ where: { id: params.disputeId } });
    if (!dispute) throw new NotFoundError("Contestation");
    const claimed = await tx.reputationDispute.updateMany({
      where: { id: dispute.id, status: "OPEN" },
      data: {
        status: params.accept ? "ACCEPTED" : "REJECTED",
        resolution,
        resolvedBy: params.actor.id,
        resolvedAt: new Date(),
      },
    });
    if (claimed.count !== 1) throw new ConflictError("Cette contestation a déjà été traitée");
    let reversalEventId: string | null = null;
    if (params.accept) {
      const rev = await reverseReputationEventTx(tx, { eventId: dispute.eventId, actor: params.actor, reason: resolution });
      reversalEventId = rev.reversalEventId;
      await tx.reputationDispute.update({ where: { id: dispute.id }, data: { reversalEventId } });
    }
    return { disputeId: dispute.id, accepted: params.accept, reversalEventId, eventId: dispute.eventId };
  });
  await writeAudit({
    actorId: params.actor.id,
    action: params.accept ? "reputation.dispute.accept" : "reputation.dispute.reject",
    target: out.eventId,
    meta: { disputeId: out.disputeId, reversalEventId: out.reversalEventId } as Prisma.InputJsonValue,
  });
  return out;
}

// ============================================================
// Activité réelle et remise à zéro après inactivité (aucune tâche planifiée : évaluation À LA DEMANDE)
// ============================================================

/** Seuil technique lu de l'environnement ; absent = remise à zéro DÉSACTIVÉE (état par défaut). */
export function getConfiguredInactivityThresholdDays(): number | null {
  return parseInactivityThresholdDays(env.REPUTATION_INACTIVITY_RESET_DAYS);
}

/** Seuil en MOIS CALENDAIRES lu de l'environnement ; absent = désactivé. S'il est défini, il l'emporte sur le seuil en jours. */
export function getConfiguredInactivityMonths(): number | null {
  return parseInactivityMonths(env.REPUTATION_INACTIVITY_RESET_MONTHS);
}

function inactivityDue(
  state: { lastActivityAt: Date | null; lastResetAt: Date | null },
  now: Date,
  days: number | null,
  months: number | null,
): boolean {
  return months !== null ? isCalendarInactivityResetDue(state, now, months) : isInactivityResetDue(state, now, days);
}

/** Écriture de `lastActivityAt` au plus une fois par heure (limite les écritures sur Neon). */
const ACTIVITY_WRITE_THROTTLE_MS = 60 * 60 * 1000;

export interface ResetResult {
  reset: boolean;
  epoch: number;
}

/**
 * Remise à zéro des POINTS uniquement (fiabilité, participation, popularité, engagements évalués).
 * Idempotente : sous le verrou de ligne, la condition (`isInactivityResetDue`) est réévaluée et devient fausse dès que
 * `lastResetAt` dépasse `lastActivityAt` ; la clé `inactivity-reset:<membre>:<époque>` est de plus unique.
 * Ne touche à aucune autre donnée : pièces, Plus, profil, photos, correspondances, historiques, titres, modération.
 */
export async function applyInactivityResetTx(
  tx: Tx,
  params: { userId: string; now?: Date; thresholdDays?: number | null; thresholdMonths?: number | null },
): Promise<ResetResult> {
  const now = params.now ?? new Date();
  const threshold = params.thresholdDays === undefined ? getConfiguredInactivityThresholdDays() : params.thresholdDays;
  const months = params.thresholdMonths === undefined ? getConfiguredInactivityMonths() : params.thresholdMonths;
  const state = await lockState(tx, params.userId);
  if (!inactivityDue(state, now, threshold, months)) return { reset: false, epoch: state.epoch };

  const nextEpoch = state.epoch + 1;
  // Repère dans le registre (le détail des valeurs précédentes est conservé dans `meta`, rien n'est perdu).
  await tx.reputationEvent.createMany({
    data: [
      {
        id: randomUUID(),
        userId: params.userId,
        axis: "RELIABILITY",
        kind: "INACTIVITY_RESET",
        delta: 0,
        ruleVersion: REPUTATION_RULE_VERSION,
        epoch: nextEpoch,
        affectsState: false,
        visibleToUser: true,
        sourceType: "Inactivity",
        sourceId: String(nextEpoch),
        dedupeKey: `inactivity-reset:${params.userId}:${nextEpoch}`,
        occurredAt: now,
        meta: {
          thresholdDays: months === null ? threshold : null,
          thresholdMonths: months,
          lastActivityAt: state.lastActivityAt?.toISOString() ?? null,
          previous: {
            reliability: state.reliability,
            participation: state.participation,
            popularity: state.popularity,
            evaluatedCommitments: state.evaluatedCommitments,
          },
        },
      },
    ],
    skipDuplicates: true,
  });
  await tx.reputationState.update({
    where: { userId: params.userId },
    data: {
      reliability: 0,
      participation: 0,
      popularity: 0,
      evaluatedCommitments: 0,
      epoch: nextEpoch,
      lastResetAt: now,
      resetCount: { increment: 1 },
      reliabilityReassessment: true,
      welcomeBackPendingAt: now,
      ruleVersion: REPUTATION_RULE_VERSION,
    },
  });
  return { reset: true, epoch: nextEpoch };
}

/**
 * Enregistre une participation réelle (la définition exacte des actions sera validée avant branchement).
 * Ordre garanti : la remise à zéro éventuelle est évaluée AVANT de rafraîchir `lastActivityAt`.
 * Chemin courant (aucune remise à zéro due, activité récente) : UNE lecture, aucune écriture.
 */
export async function registerParticipationActivity(params: {
  userId: string;
  at?: Date;
  thresholdDays?: number | null;
  thresholdMonths?: number | null;
}): Promise<ResetResult> {
  const at = params.at ?? new Date();
  const threshold = params.thresholdDays === undefined ? getConfiguredInactivityThresholdDays() : params.thresholdDays;
  const months = params.thresholdMonths === undefined ? getConfiguredInactivityMonths() : params.thresholdMonths;
  const state = await prisma.reputationState.findUnique({ where: { userId: params.userId } });

  if (state && !inactivityDue(state, at, threshold, months)) {
    const fresh = state.lastActivityAt && at.getTime() - state.lastActivityAt.getTime() < ACTIVITY_WRITE_THROTTLE_MS;
    if (!fresh) {
      await prisma.reputationState.updateMany({
        where: { userId: params.userId, OR: [{ lastActivityAt: null }, { lastActivityAt: { lt: at } }] },
        data: { lastActivityAt: at },
      });
    }
    return { reset: false, epoch: state.epoch };
  }

  return runInTransaction(async (tx) => {
    const res = await applyInactivityResetTx(tx, { userId: params.userId, now: at, thresholdDays: threshold, thresholdMonths: months });
    await tx.reputationState.updateMany({
      where: { userId: params.userId, OR: [{ lastActivityAt: null }, { lastActivityAt: { lt: at } }] },
      data: { lastActivityAt: at },
    });
    return res;
  });
}

// ============================================================
// Données des deux accueils (aucune interface ici)
// ============================================================

export interface WelcomeState {
  lastWelcomeDay: string | null;
  welcomeBackPending: boolean;
  lastSummaryAt: Date | null;
}

export async function getWelcomeState(userId: string): Promise<WelcomeState> {
  const s = await prisma.reputationState.findUnique({
    where: { userId },
    select: { lastWelcomeDay: true, welcomeBackPendingAt: true, lastSummaryAt: true },
  });
  return {
    lastWelcomeDay: s?.lastWelcomeDay ?? null,
    welcomeBackPending: s?.welcomeBackPendingAt != null,
    lastSummaryAt: s?.lastSummaryAt ?? null,
  };
}

/**
 * Marque l'accueil quotidien comme affiché pour la date LOCALE donnée. Vrai si c'est la première fois ce jour-là
 * (un seul affichage par jour, même avec des appels simultanés : la condition est évaluée par la base).
 */
export async function markDailyWelcomeShown(userId: string, localDay: string, now: Date = new Date()): Promise<boolean> {
  const day = parseLocalDay(localDay, now);
  await ensureReputationState(prisma, userId);
  const res = await prisma.reputationState.updateMany({
    where: { userId, OR: [{ lastWelcomeDay: null }, { lastWelcomeDay: { lt: day } }] },
    data: { lastWelcomeDay: day, lastSummaryAt: now },
  });
  return res.count === 1;
}

/** Acquitte l'accueil « après une longue absence » : une seule fois par période d'inactivité. */
export async function acknowledgeWelcomeBack(userId: string): Promise<boolean> {
  const res = await prisma.reputationState.updateMany({
    where: { userId, welcomeBackPendingAt: { not: null } },
    data: { welcomeBackPendingAt: null },
  });
  return res.count === 1;
}

// ============================================================
// Outils de réinitialisation des comptes de TEST
// ============================================================

/**
 * Efface la réputation (événements, contestations, état) des comptes indiqués. Réservé aux environnements de test :
 * refuse en production. Ne touche à aucune autre donnée ; l'état repartira neutre à la demande.
 */
export async function resetReputationForTestAccounts(userIds: string[]): Promise<{ events: number; disputes: number; states: number }> {
  if (!isTestMode()) throw new ForbiddenError("Réinitialisation de la réputation interdite hors environnement de test");
  if (userIds.length === 0) return { events: 0, disputes: 0, states: 0 };
  return runInTransaction(async (tx) => {
    const disputes = await tx.reputationDispute.deleteMany({ where: { userId: { in: userIds } } });
    const events = await tx.reputationEvent.deleteMany({ where: { userId: { in: userIds } } });
    const states = await tx.reputationState.deleteMany({ where: { userId: { in: userIds } } });
    return { events: events.count, disputes: disputes.count, states: states.count };
  });
}

// Primitives réservées à la couche des règles (reputation.rules.service.ts) : même transaction, même verrou de ligne.
export const lockReputationState = lockState;
export const insertReputationEvent = insertEvent;

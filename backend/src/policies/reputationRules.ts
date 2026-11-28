/**
 * Confiance et classement — BARÈME, plafonds, pénalités, niveaux (règles PURES, versionnées).
 *
 * STATUT : PROPOSITION À VALIDER. Rien de ce fichier n'est actif : le moteur ne s'exécute que si `REPUTATION_RULES_MODE`
 * vaut « shadow » (calcul sans écriture) ou « active » ; sa valeur par défaut est « off ». Chaque valeur ci-dessous est
 * une base de travail destinée à être testée puis validée avant activation.
 *
 * Invariants (testés) :
 *   1. Fiabilité, participation et popularité sont des axes indépendants ; les pièces n'en font pas partie.
 *   2. Aucune différence de barème entre Gratuit et Plus : aucune fonction de ce module ne reçoit l'abonnement.
 *   3. Récompenser plus souvent que pénaliser : les pénalités n'existent qu'en cas de répétition réelle, avec tolérance,
 *      prise en compte des engagements respectés, plafonds et récupération par glissement de fenêtre.
 *   4. Un doute sur la nature d'une rupture n'entraîne jamais de pénalité automatique.
 */
import type { ReputationAxisName } from "./reputation";

/** Version du jeu de règles (inscrite dans chaque événement qu'il produit). */
export const RULESET_VERSION = 2;
export const RULESET_STATUS = "PROPOSED_NOT_ACTIVE" as const;

export type RulesMode = "off" | "shadow" | "active";
export const DEFAULT_RULES_MODE: RulesMode = "off";

// ============================================================
// 1. Récompenses (barème proposé)
// ============================================================

export type RewardKey =
  | "RECIPROCAL_SMILE"
  | "QUESTIONS_COMPLETED"
  | "CORRESPONDENCE_ENGAGED"
  | "FIRST_LETTER"
  | "LETTER_REPLY"
  | "CORRESPONDENCE_SUSTAINED"
  | "BOTTLE_REPLY"
  | "BOTTLE_SUSTAINED"
  | "SALON_ACTIVE_DAY"
  | "SALON_COMPLETED"
  | "REFUGE_DAY_HONORED"
  | "REFUGE_COMPLETED"
  | "DUEL_COMPLETED"
  | "ELECTION_VOTE"
  | "JOURNAL_PARTICIPATION";

/** Plafonds exprimés en NOMBRE D'ATTRIBUTIONS (jamais en points : le barème peut évoluer sans les réécrire). */
export interface RuleCaps {
  perDay?: number;
  perWeek?: number;
  /** Nombre maximal d'attributions pour une même source (ex. un match, une bouteille, une session de salon). */
  perSource?: number;
  /** Nombre maximal d'attributions par semaine avec un même interlocuteur. */
  perPartnerPerWeek?: number;
}

export interface RewardRule {
  key: RewardKey;
  /** Fonctionnalité existante qui fournit l'événement ; « AUCUNE » si elle n'existe pas. */
  feature: string;
  /** Faux : aucune fonctionnalité ne produit cette action (règle définie, jamais appliquée). */
  available: boolean;
  reliability: number;
  participation: number;
  /** Compte comme engagement RESPECTÉ dans le calcul de la proportion (fiabilité). */
  commitment: boolean;
  /** Interrompt la période d'inactivité (activité réelle). */
  countsAsActivity: boolean;
  caps: RuleCaps;
  /** Condition objective (lisible) que l'appelant doit vérifier avant d'invoquer la règle. */
  objective: string;
}

const MIN_CHARS = 40;

export const REWARD_RULES: Readonly<Record<RewardKey, RewardRule>> = {
  RECIPROCAL_SMILE: {
    key: "RECIPROCAL_SMILE", feature: "Sourires (Reaction) → Match", available: true,
    reliability: 0, participation: 1, commitment: false, countsAsActivity: true,
    caps: { perSource: 1, perDay: 5 },
    objective: "Un Match est créé par deux sourires réciproques ; une attribution par match et par membre.",
  },
  QUESTIONS_COMPLETED: {
    key: "QUESTIONS_COMPLETED", feature: "Jeu des trois questions (MatchQuestionAttempt)", available: true,
    reliability: 0, participation: 2, commitment: false, countsAsActivity: true,
    caps: { perSource: 1, perDay: 4 },
    objective: "Le membre a soumis ses trois réponses (réussite ou non) ; une attribution par match.",
  },
  CORRESPONDENCE_ENGAGED: {
    key: "CORRESPONDENCE_ENGAGED", feature: "Lettres après validation des questions", available: true,
    reliability: 5, participation: 2, commitment: true, countsAsActivity: true,
    caps: { perSource: 1, perWeek: 4 },
    objective: `Questions validées ET chaque membre a envoyé au moins une lettre substantielle (≥ ${MIN_CHARS} caractères, hors relance) ; une attribution par match.`,
  },
  FIRST_LETTER: {
    key: "FIRST_LETTER", feature: "Lettres (Letter)", available: true,
    reliability: 0, participation: 2, commitment: false, countsAsActivity: true,
    caps: { perSource: 1, perDay: 4 },
    objective: `Première lettre substantielle (≥ ${MIN_CHARS} caractères, hors relance) du membre dans ce match.`,
  },
  LETTER_REPLY: {
    key: "LETTER_REPLY", feature: "Lettres (alternance stricte)", available: true,
    reliability: 2, participation: 2, commitment: false, countsAsActivity: true,
    caps: { perDay: 6, perWeek: 7, perPartnerPerWeek: 3 },
    objective: `Lettre substantielle envoyée en réponse à une lettre de l'autre membre ; au plus 1 attribution par correspondance et par jour.`,
  },
  CORRESPONDENCE_SUSTAINED: {
    key: "CORRESPONDENCE_SUSTAINED", feature: "Lettres (compteurs letterCountA/B)", available: true,
    reliability: 5, participation: 3, commitment: true, countsAsActivity: true,
    caps: { perSource: 2, perWeek: 3 },
    objective: "Paliers de correspondance entretenue : 3 lettres de chaque côté (palier 1), 8 de chaque côté (palier 2) ; deux paliers au maximum par match.",
  },
  BOTTLE_REPLY: {
    key: "BOTTLE_REPLY", feature: "Bouteille à la mer (claimBottleWithReply)", available: true,
    reliability: 0, participation: 2, commitment: false, countsAsActivity: true,
    caps: { perSource: 1, perDay: 3 },
    objective: `Réponse substantielle (≥ ${MIN_CHARS} caractères) à une bouteille acceptée ; une attribution par bouteille.`,
  },
  BOTTLE_SUSTAINED: {
    key: "BOTTLE_SUSTAINED", feature: "Bouteille à la mer (AnonymousMessage)", available: true,
    reliability: 5, participation: 3, commitment: true, countsAsActivity: true,
    caps: { perSource: 1, perWeek: 2 },
    objective: "Échange réciproque entretenu : au moins 3 messages substantiels de chaque côté ; une attribution par bouteille.",
  },
  SALON_ACTIVE_DAY: {
    key: "SALON_ACTIVE_DAY", feature: "Salons (SalonMessage)", available: true,
    reliability: 0, participation: 2, commitment: false, countsAsActivity: true,
    caps: { perDay: 1, perWeek: 7, perSource: 7 },
    objective: "Au moins 2 messages substantiels (≥ 20 caractères, espacés de 5 minutes) le même jour UTC dans la même session ; une attribution par jour et par session.",
  },
  SALON_COMPLETED: {
    key: "SALON_COMPLETED", feature: "Salons (SalonSessionParticipant)", available: true,
    reliability: 10, participation: 5, commitment: true, countsAsActivity: true,
    caps: { perSource: 1 },
    objective: "Session arrivée à son terme (7 jours), membre resté ACTIF jusqu'au bout et ayant totalisé au moins 3 jours actifs.",
  },
  REFUGE_DAY_HONORED: {
    key: "REFUGE_DAY_HONORED", feature: "Refuge (RefugeDayResult.adopteAssiduous / adoptantAssiduous)", available: true,
    reliability: 2, participation: 2, commitment: true, countsAsActivity: true,
    caps: { perSource: 1, perWeek: 7 },
    objective: "Jour clôturé avec assiduité reconnue pour ce membre ; une attribution par jour de l'aventure.",
  },
  REFUGE_COMPLETED: {
    key: "REFUGE_COMPLETED", feature: "Refuge (règlement final)", available: true,
    reliability: 10, participation: 5, commitment: true, countsAsActivity: true,
    caps: { perSource: 1 },
    objective: "Aventure terminée avec au moins 6 jours d'assiduité sur 7 pour ce membre (une absence occasionnelle est tolérée).",
  },
  DUEL_COMPLETED: {
    key: "DUEL_COMPLETED", feature: "Duels privés (PrivateDuel RESOLVED)", available: true,
    reliability: 3, participation: 2, commitment: true, countsAsActivity: true,
    caps: { perSource: 1, perWeek: 5, perPartnerPerWeek: 1 },
    objective: "Duel RESOLVED auquel le membre a participé (les deux choix soumis) ; au plus 1 attribution par semaine avec le même adversaire.",
  },
  ELECTION_VOTE: {
    key: "ELECTION_VOTE", feature: "Élections (WeeklyProfileDuel)", available: true,
    reliability: 0, participation: 1, commitment: false, countsAsActivity: true,
    // Le plafond journalier est IDENTIQUE pour Gratuit et Plus (la limite de votes de Plus ne donne aucun point de plus).
    caps: { perSource: 1, perDay: 5 },
    objective: "Vote enregistré (duel utilisé) ; une attribution par vote, 5 par jour au maximum pour tous les membres.",
  },
  JOURNAL_PARTICIPATION: {
    key: "JOURNAL_PARTICIPATION", feature: "AUCUNE (le Journal est en lecture seule : articles publiés par l'administrateur)", available: false,
    reliability: 0, participation: 2, commitment: false, countsAsActivity: false,
    caps: { perSource: 1, perDay: 1 },
    objective: "Aucune action de participation n'existe côté membre : règle définie mais INDISPONIBLE jusqu'à l'ajout d'une vraie fonctionnalité.",
  },
};

export const REWARD_KEYS = Object.keys(REWARD_RULES) as RewardKey[];

/** Plafonds globaux hebdomadaires de gains par axe (hors bonus de diversité, qui a son propre plafond). */
export const WEEKLY_AXIS_GAIN_CAP: Readonly<Record<"RELIABILITY" | "PARTICIPATION", number>> = {
  RELIABILITY: 60,
  PARTICIPATION: 100,
};

export type RewardAxis = "RELIABILITY" | "PARTICIPATION";

/** Nom du type d'événement pour (règle, axe) : un type n'appartient qu'à UN axe. */
export function kindFor(key: string, axis: RewardAxis): string {
  return `${key}_${axis === "RELIABILITY" ? "REL" : "PART"}`;
}

/** Effets (axe, points) d'une règle : uniquement les axes dont la valeur est strictement positive. */
export function rewardEffects(rule: RewardRule): Array<{ axis: RewardAxis; delta: number }> {
  const out: Array<{ axis: RewardAxis; delta: number }> = [];
  if (rule.reliability > 0) out.push({ axis: "RELIABILITY", delta: rule.reliability });
  if (rule.participation > 0) out.push({ axis: "PARTICIPATION", delta: rule.participation });
  return out;
}

// ============================================================
// 2. Pénalités exceptionnelles
// ============================================================

export type PenaltyFamily =
  | "MATCH_BREAK_AFTER_QUESTIONS"
  | "SALON_ABANDONED"
  | "CORRESPONDENCE_ABANDONED"
  | "BOTTLE_ABANDONED"
  | "REFUGE_NEGLECTED"
  | "DUEL_ABANDONED";

export const PENALTY_WINDOW_DAYS = 60;
/** Incidents ordinaires tolérés (sans perte) dans la fenêtre : la pénalité ne commence qu'au troisième. */
export const FREE_INCIDENTS = 2;
/**
 * Part minimale des incidents parmi les engagements observés pour qu'une pénalité s'applique.
 * Ex. 3 incidents pour 30 engagements respectés = 9 % : aucune pénalité ; 3 sur 3 = 100 % : pénalité.
 */
export const PENALTY_RATIO_THRESHOLD = 0.3;

export const PENALTY_VALUES: Readonly<Record<PenaltyFamily, number>> = {
  MATCH_BREAK_AFTER_QUESTIONS: 8,
  SALON_ABANDONED: 4,
  CORRESPONDENCE_ABANDONED: 3,
  BOTTLE_ABANDONED: 3,
  REFUGE_NEGLECTED: 3,
  DUEL_ABANDONED: 2,
};
export const PENALTY_FAMILIES = Object.keys(PENALTY_VALUES) as PenaltyFamily[];

/** Plafonds de pénalités (valeurs absolues) sur la fenêtre glissante. */
export const PENALTY_CAP_PER_FAMILY = 12;
export const PENALTY_CAP_TOTAL = 24;

export function incidentKind(family: PenaltyFamily): string {
  return `${family}_INCIDENT`;
}
export function penaltyKind(family: PenaltyFamily): string {
  return `${family}_PENALTY`;
}

/** Nature d'un évènement observé, telle que fournie par l'appelant à partir de données objectives. */
export type IncidentClassification = "CLEAR_BREACH" | "LEGITIMATE" | "UNKNOWN";

export interface IncidentExemptions {
  /** Absence protégée par le mode vacances (du membre OU de son interlocuteur). */
  vacation?: boolean;
  /** Interruption justifiée par la sécurité : blocage, départ après blocage ou signalement. */
  safety?: boolean;
  /** Refus respectueux (demande refusée, bouteille refusée…). */
  refusal?: boolean;
  /** Incompatibilité déclarée. */
  incompatibility?: boolean;
  /** Un blocage existe entre les deux membres. */
  blocked?: boolean;
  /** Le seul élément défavorable est un signalement : jamais une pénalité automatique. */
  reportOnly?: boolean;
  /** Fait antérieur à la date d'entrée en vigueur, ou donnée historique incomplète : jamais de pénalité rétroactive. */
  beforeEffectiveDate?: boolean;
}

/** Raison pour laquelle un évènement n'est PAS retenu comme incident (null = retenu). */
export function incidentExclusion(classification: IncidentClassification, ex: IncidentExemptions = {}): string | null {
  if (ex.beforeEffectiveDate) return "BEFORE_EFFECTIVE_DATE";
  if (ex.safety) return "SAFETY";
  if (ex.blocked) return "BLOCKED";
  if (ex.reportOnly) return "REPORT_ONLY";
  if (ex.vacation) return "VACATION_PROTECTED";
  if (ex.refusal) return "REFUSAL";
  if (ex.incompatibility) return "INCOMPATIBILITY";
  if (classification === "LEGITIMATE") return "LEGITIMATE";
  if (classification === "UNKNOWN") return "INDISTINGUISHABLE_FROM_LEGITIMATE";
  return null;
}

export interface PenaltyContext {
  family: PenaltyFamily;
  /** Incidents de cette famille dans la fenêtre, CET INCIDENT COMPRIS, hors incidents annulés. */
  incidentsInWindow: number;
  /** Engagements respectés (toutes familles) dans la fenêtre. */
  respectedInWindow: number;
  /** Pénalités déjà appliquées dans la fenêtre (valeurs absolues). */
  penaltyFamilySoFar: number;
  penaltyTotalSoFar: number;
}

export interface PenaltyDecision {
  penalize: boolean;
  /** Valeur négative à appliquer (0 si aucune). */
  delta: number;
  reason: string;
  ratio: number;
}

export function decidePenalty(ctx: PenaltyContext): PenaltyDecision {
  const ratio = ctx.incidentsInWindow / Math.max(1, ctx.incidentsInWindow + ctx.respectedInWindow);
  if (ctx.incidentsInWindow <= FREE_INCIDENTS) return { penalize: false, delta: 0, reason: "TOLERATED_INCIDENT", ratio };
  if (ratio < PENALTY_RATIO_THRESHOLD) return { penalize: false, delta: 0, reason: "ISOLATED_AMONG_RESPECTED_COMMITMENTS", ratio };
  const value = PENALTY_VALUES[ctx.family];
  const room = Math.min(PENALTY_CAP_PER_FAMILY - ctx.penaltyFamilySoFar, PENALTY_CAP_TOTAL - ctx.penaltyTotalSoFar);
  if (room <= 0) return { penalize: false, delta: 0, reason: "PENALTY_CAP_REACHED", ratio };
  return { penalize: true, delta: -Math.min(value, room), reason: "REPEATED_BREACH", ratio };
}

// ============================================================
// 3. Niveaux de fiabilité (les points exacts restent privés)
// ============================================================

export type ReliabilityLevel =
  | "EXEMPLARY"
  | "VERY_RELIABLE"
  | "RELIABLE"
  | "FRAGILE"
  | "UNRELIABLE"
  | "NEW_MEMBER"
  | "REASSESSMENT";

/** Libellés proposés (à finaliser). Le niveau n'est PAS une certification d'identité ni de sécurité. */
export const LEVEL_LABELS: Readonly<Record<ReliabilityLevel, string>> = {
  EXEMPLARY: "Exemplaire",
  VERY_RELIABLE: "Très fiable",
  RELIABLE: "Fiable",
  FRAGILE: "Fiabilité fragile",
  UNRELIABLE: "Peu fiable",
  NEW_MEMBER: "Nouveau membre",
  REASSESSMENT: "Fiabilité à réévaluer",
};

/** Fenêtre d'observation des engagements pour le niveau (proposition à valider). */
export const LEVEL_WINDOW_DAYS = 180;
/** Engagements observés minimum avant d'attribuer un niveau autre que « nouveau » / « à réévaluer ». */
export const LEVEL_MIN_OBSERVATIONS = 5;
const WILSON_Z = 1.28;

/** Borne basse de Wilson (≈ 90 %) : tient compte du VOLUME d'observations, pas seulement de la proportion. */
export function wilsonLowerBound(successes: number, total: number, z = WILSON_Z): number {
  if (total <= 0) return 0;
  const p = successes / total;
  const z2 = z * z;
  const denom = 1 + z2 / total;
  const centre = p + z2 / (2 * total);
  const margin = z * Math.sqrt((p * (1 - p)) / total + z2 / (4 * total * total));
  return Math.max(0, (centre - margin) / denom);
}

export interface LevelInput {
  respected: number;
  incidents: number;
  /** Points de fiabilité (garde-fou : un cumul négatif empêche les niveaux supérieurs). */
  reliabilityPoints: number;
  /** Pénalités appliquées dans les 60 derniers jours (valeur absolue). */
  recentPenalty: number;
  reassessment: boolean;
}

export function computeReliabilityLevel(i: LevelInput): ReliabilityLevel {
  const observed = i.respected + i.incidents;
  if (observed < LEVEL_MIN_OBSERVATIONS) return i.reassessment ? "REASSESSMENT" : "NEW_MEMBER";
  const lb = wilsonLowerBound(i.respected, observed);
  if (observed >= 15 && lb >= 0.85 && i.recentPenalty === 0 && i.reliabilityPoints >= 50) return "EXEMPLARY";
  if (observed >= 8 && lb >= 0.75 && i.reliabilityPoints >= 20) return "VERY_RELIABLE";
  if (lb >= 0.55 && i.reliabilityPoints >= 0) return "RELIABLE";
  if (lb >= 0.35) return "FRAGILE";
  // « Peu fiable » exige une RÉPÉTITION documentée (jamais le seul score) et au moins une pénalité appliquée.
  if (i.incidents >= 4 && i.recentPenalty > 0) return "UNRELIABLE";
  return "FRAGILE";
}

// ============================================================
// 4. Activité réelle et trois mois calendaires (non activé)
// ============================================================

/**
 * ACTIVITÉ RÉELLE (proposition) : toute action de participation produite par une règle de récompense disponible, ou toute
 * soumission d'un fait de ce barème. Ne comptent PAS : se connecter, renouveler un jeton, consulter des profils ou ses
 * lettres, ouvrir l'application, recevoir une notification, voter « à vide » sans vote enregistré.
 */
export const REAL_ACTIVITY_RULE_KEYS: readonly RewardKey[] = REWARD_KEYS.filter((k) => REWARD_RULES[k].available && REWARD_RULES[k].countsAsActivity);

export function isRealActivityRule(key: string): boolean {
  return (REAL_ACTIVITY_RULE_KEYS as readonly string[]).includes(key);
}

export const INACTIVITY_CALENDAR_MONTHS = 3;

/**
 * Ajoute des mois CALENDAIRES en UTC, en conservant l'heure ; le quantième est ramené au dernier jour du mois d'arrivée si
 * nécessaire (31 août + 3 mois → 30 novembre ; 30 novembre + 3 mois → 28/29 février).
 */
export function addCalendarMonthsUTC(date: Date, months: number): Date {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + months;
  const targetYear = y + Math.floor(m / 12);
  const targetMonth = ((m % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      Math.min(date.getUTCDate(), lastDay),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
}

/**
 * Remise à zéro due en mois calendaires : même garanties que la version en jours (activité connue, une seule remise à
 * zéro par période d'inactivité, mode vacances ignoré).
 */
export function isCalendarInactivityResetDue(
  state: { lastActivityAt: Date | null; lastResetAt: Date | null },
  now: Date,
  months: number | null,
): boolean {
  if (months === null || state.lastActivityAt === null) return false;
  if (state.lastResetAt !== null && state.lastResetAt.getTime() >= state.lastActivityAt.getTime()) return false;
  return now.getTime() >= addCalendarMonthsUTC(state.lastActivityAt, months).getTime();
}

export function parseInactivityMonths(raw: number | string | undefined | null): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 36 ? n : null;
}

// ============================================================
// 5. Protections contre les messages artificiels
// ============================================================

export const SUBSTANTIVE_MIN_CHARS = MIN_CHARS;
export const SUBSTANTIVE_MIN_WORDS = 6;
export const SUBSTANTIVE_MIN_DISTINCT_CHARS = 8;

export function normalizeText(text: string): string {
  return (text ?? "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

/** Message « substantiel » : assez long, assez de mots, assez de variété (pas « aaaaaa… » ni « ok ok ok… »). */
export function isSubstantiveText(text: string, minChars = SUBSTANTIVE_MIN_CHARS): boolean {
  const raw = (text ?? "").trim();
  if (raw.length < minChars) return false;
  const norm = normalizeText(raw);
  const words = norm.split(" ").filter(Boolean);
  if (words.length < SUBSTANTIVE_MIN_WORDS) return false;
  if (new Set(words).size < Math.ceil(words.length / 2)) return false; // répétitions de mots
  return new Set(norm.replace(/\s/g, "")).size >= SUBSTANTIVE_MIN_DISTINCT_CHARS;
}

/** Empreinte stable d'un texte normalisé (jamais stockée avec le texte) pour repérer les copier-coller. */
export function textFingerprint(text: string): string {
  let h = 2166136261;
  for (const c of normalizeText(text)) {
    h ^= c.codePointAt(0)!;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

// ============================================================
// 6. Semaines et jours UTC
// ============================================================

const DAY_MS = 86_400_000;
export function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
/** Début de la semaine calendaire UTC (lundi 00:00). */
export function startOfUtcWeek(d: Date): Date {
  const day = startOfUtcDay(d);
  const dow = (day.getUTCDay() + 6) % 7;
  return new Date(day.getTime() - dow * DAY_MS);
}
export function utcDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}
export const msDays = (n: number): number => n * DAY_MS;

export type { ReputationAxisName };

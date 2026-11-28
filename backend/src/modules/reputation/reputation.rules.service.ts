import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { registerReputationKind, type ReputationAxisName } from "../../policies/reputation";
import {
  DEFAULT_RULES_MODE,
  LEVEL_LABELS,
  LEVEL_MIN_OBSERVATIONS,
  LEVEL_WINDOW_DAYS,
  PENALTY_FAMILIES,
  PENALTY_WINDOW_DAYS,
  REWARD_KEYS,
  REWARD_RULES,
  RULESET_VERSION,
  WEEKLY_AXIS_GAIN_CAP,
  computeReliabilityLevel,
  decidePenalty,
  incidentExclusion,
  incidentKind,
  kindFor,
  msDays,
  penaltyKind,
  rewardEffects,
  startOfUtcDay,
  startOfUtcWeek,
  utcDayKey,
  type IncidentClassification,
  type IncidentExemptions,
  type PenaltyFamily,
  type ReliabilityLevel,
  type RewardKey,
  type RulesMode,
} from "../../policies/reputationRules";
import {
  DIVERSITY,
  decideDiversityBonus,
  isDiversityTarget,
  isGenuineContinuation,
  isGenuineFirstExchange,
  type DiversityMetrics,
  type ThreadMessage,
} from "../../policies/reputationDiversity";
import {
  applyInactivityResetTx,
  insertReputationEvent,
  lockReputationState,
  type Tx,
} from "./reputation.service";

/**
 * Application du barème. STATUT : préparation — rien n'appelle ce module dans l'application.
 *
 *  - `REPUTATION_RULES_MODE` : « off » (défaut) → aucune règle ne s'exécute, aucune lecture, aucune écriture ;
 *    « shadow » → décisions calculées SANS aucune écriture ; « active » → écriture dans la transaction de l'appelant.
 *  - Aucun fait antérieur à `REPUTATION_RULES_EFFECTIVE_FROM` n'est évalué (jamais de rétroactivité).
 *  - Toute écriture s'exécute sous le verrou de ligne du membre : plafonds et idempotence sont donc exacts même en
 *    concurrence. Les plafonds se lisent dans le REGISTRE (aucun compteur parallèle à tenir à jour).
 *  - Aucun paramètre ne porte l'abonnement : le barème est identique pour Gratuit et Plus.
 *  - Les pièces ne sont jamais lues ni écrites.
 */

type Db = Tx | typeof prisma;

export interface RuleOptions {
  now?: Date;
  mode?: RulesMode;
  /** Date d'entrée en vigueur ; `null` = aucune restriction. Par défaut : variable d'environnement. */
  effectiveFrom?: Date | null;
}

export function getRulesMode(): RulesMode {
  return (env.REPUTATION_RULES_MODE as RulesMode | undefined) ?? DEFAULT_RULES_MODE;
}

function getEffectiveFrom(): Date | null {
  return env.REPUTATION_RULES_EFFECTIVE_FROM ? new Date(env.REPUTATION_RULES_EFFECTIVE_FROM) : null;
}

function resolve(o: RuleOptions | undefined) {
  return {
    now: o?.now ?? new Date(),
    mode: o?.mode ?? getRulesMode(),
    effectiveFrom: o?.effectiveFrom === undefined ? getEffectiveFrom() : o.effectiveFrom,
  };
}

function gate(mode: RulesMode, effectiveFrom: Date | null, occurredAt: Date): string | null {
  if (mode === "off") return "RULES_OFF";
  if (effectiveFrom && occurredAt.getTime() < effectiveFrom.getTime()) return "BEFORE_EFFECTIVE_DATE";
  return null;
}

// ============================================================
// Déclaration des types d'événements (chacun rattaché à UN axe)
// ============================================================

export const DIVERSITY_KIND = "DIVERSITY_BONUS_PART";

function registerAllKinds(): void {
  for (const key of REWARD_KEYS) {
    const rule = REWARD_RULES[key];
    if (!rule.available) continue; // une règle sans fonctionnalité ne peut produire aucun événement
    if (rule.reliability > 0) registerReputationKind(kindFor(key, "RELIABILITY"), { axis: "RELIABILITY", delta: "NON_NEGATIVE" });
    if (rule.participation > 0) registerReputationKind(kindFor(key, "PARTICIPATION"), { axis: "PARTICIPATION", delta: "NON_NEGATIVE" });
  }
  for (const family of PENALTY_FAMILIES) {
    registerReputationKind(incidentKind(family), { axis: "RELIABILITY", delta: "ZERO" });
    registerReputationKind(penaltyKind(family), { axis: "RELIABILITY", delta: "NON_POSITIVE" });
  }
  registerReputationKind(DIVERSITY_KIND, { axis: "PARTICIPATION", delta: "NON_NEGATIVE" });
}
registerAllKinds();

/** Types « récompense » d'un axe (hors diversité), pour le plafond hebdomadaire global. */
function rewardKindsFor(axis: "RELIABILITY" | "PARTICIPATION"): string[] {
  return REWARD_KEYS.filter((k) => REWARD_RULES[k].available).flatMap((k) => {
    const r = REWARD_RULES[k];
    const has = axis === "RELIABILITY" ? r.reliability > 0 : r.participation > 0;
    return has ? [kindFor(k, axis)] : [];
  });
}

// ============================================================
// Lectures du registre (annulations exclues)
// ============================================================

const notReversed: Prisma.ReputationEventWhereInput = { reversedBy: { is: null } };

function countEvents(db: Db, where: Prisma.ReputationEventWhereInput): Promise<number> {
  return db.reputationEvent.count({ where: { AND: [where, notReversed] } });
}

async function sumDelta(db: Db, where: Prisma.ReputationEventWhereInput): Promise<number> {
  const r = await db.reputationEvent.aggregate({ _sum: { delta: true }, where: { AND: [where, notReversed] } });
  return r._sum.delta ?? 0;
}

// ============================================================
// Récompenses
// ============================================================

export interface RewardFacts {
  sourceType: string;
  sourceId: string;
  /** L'appelant atteste que la condition OBJECTIVE de la règle (voir `REWARD_RULES[...].objective`) est remplie. */
  conditionsMet: boolean;
  partnerId?: string;
  /** Palier (CORRESPONDENCE_SUSTAINED). */
  tier?: number;
  /** Jour UTC « AAAA-MM-JJ » pour les règles attribuées par jour et par source. */
  dayKey?: string;
  occurredAt?: Date;
  /** Empreinte du texte (voir `textFingerprint`) pour refuser un même message réutilisé. */
  fingerprint?: string;
}

export interface RewardDecision {
  axis: ReputationAxisName;
  kind: string;
  requested: number;
  granted: number;
  reason: string;
  eventId?: string | null;
}

export interface RewardResult {
  mode: RulesMode;
  ruleKey: RewardKey;
  applied: boolean;
  reason: string;
  decisions: RewardDecision[];
}

const DAY_SCOPED: ReadonlySet<RewardKey> = new Set<RewardKey>(["LETTER_REPLY", "SALON_ACTIVE_DAY"]);
const FINGERPRINT_RULES: ReadonlySet<RewardKey> = new Set<RewardKey>(["FIRST_LETTER", "LETTER_REPLY", "BOTTLE_REPLY"]);
const FINGERPRINT_WINDOW_DAYS = 30;

function dedupeFor(kind: string, facts: RewardFacts, userId: string, key: RewardKey): string {
  const parts = [kind, facts.sourceType, facts.sourceId, userId];
  if (facts.tier !== undefined) parts.push(`t${facts.tier}`);
  if (DAY_SCOPED.has(key)) parts.push(facts.dayKey ?? "");
  return parts.join(":");
}

/** Dernière activité réelle : écriture au plus une fois par heure, après la remise à zéro éventuelle. */
async function touchActivityTx(tx: Tx, userId: string, at: Date): Promise<void> {
  await applyInactivityResetTx(tx, { userId, now: at });
  await tx.reputationState.updateMany({
    where: {
      userId,
      OR: [{ lastActivityAt: null }, { lastActivityAt: { lt: new Date(at.getTime() - 60 * 60 * 1000) } }],
    },
    data: { lastActivityAt: at },
  });
}

export async function applyReputationReward(
  tx: Tx,
  key: RewardKey,
  userId: string,
  facts: RewardFacts,
  options?: RuleOptions,
): Promise<RewardResult> {
  const { now, mode, effectiveFrom } = resolve(options);
  const rule = REWARD_RULES[key];
  const none = (reason: string): RewardResult => ({ mode, ruleKey: key, applied: false, reason, decisions: [] });
  const occurredAt = facts.occurredAt ?? now;

  const blocked = gate(mode, effectiveFrom, occurredAt);
  if (blocked) return none(blocked);
  if (!rule.available) return none("RULE_UNAVAILABLE");
  const effects = rewardEffects(rule);
  if (effects.length === 0) return none("NO_EFFECT");
  if (DAY_SCOPED.has(key) && !facts.dayKey) return none("DAY_KEY_REQUIRED");

  const write = mode === "active";
  // Activité réelle : enregistrée même si le plafond est atteint (la participation a bien eu lieu).
  if (write) {
    await lockReputationState(tx, userId);
    if (rule.countsAsActivity) await touchActivityTx(tx, userId, now);
  }

  const deny = (reason: string): RewardResult => ({
    mode,
    ruleKey: key,
    applied: false,
    reason,
    decisions: effects.map((e) => ({ axis: e.axis, kind: kindFor(key, e.axis), requested: e.delta, granted: 0, reason })),
  });

  if (!facts.conditionsMet) return deny("OBJECTIVE_NOT_MET");
  if (facts.partnerId && facts.partnerId === userId) return deny("SELF_INTERACTION");

  const primaryKind = kindFor(key, effects[0]!.axis);
  const dayStart = startOfUtcDay(now);
  const weekStart = startOfUtcWeek(now);
  const base: Prisma.ReputationEventWhereInput = { userId, kind: primaryKind };

  if (rule.caps.perSource !== undefined) {
    const used = await countEvents(tx, { ...base, sourceType: facts.sourceType, sourceId: facts.sourceId });
    if (used >= rule.caps.perSource) return deny("SOURCE_CAP");
  }
  if (rule.caps.perDay !== undefined && (await countEvents(tx, { ...base, occurredAt: { gte: dayStart } })) >= rule.caps.perDay) return deny("DAILY_CAP");
  if (rule.caps.perWeek !== undefined && (await countEvents(tx, { ...base, occurredAt: { gte: weekStart } })) >= rule.caps.perWeek) return deny("WEEKLY_CAP");
  if (rule.caps.perPartnerPerWeek !== undefined && facts.partnerId) {
    const used = await countEvents(tx, { ...base, occurredAt: { gte: weekStart }, meta: { path: ["partnerId"], equals: facts.partnerId } });
    if (used >= rule.caps.perPartnerPerWeek) return deny("PARTNER_WEEKLY_CAP");
  }
  if (facts.fingerprint && FINGERPRINT_RULES.has(key)) {
    const since = new Date(now.getTime() - msDays(FINGERPRINT_WINDOW_DAYS));
    const reused = await countEvents(tx, { userId, kind: { in: [kindFor(key, "PARTICIPATION"), kindFor(key, "RELIABILITY")] }, occurredAt: { gte: since }, meta: { path: ["fp"], equals: facts.fingerprint } });
    if (reused > 0) return deny("REPEATED_CONTENT");
  }

  const decisions: RewardDecision[] = [];
  let anyApplied = false;
  for (const e of effects) {
    const kind = kindFor(key, e.axis);
    // Plafond global hebdomadaire de l'axe : gain partiel possible, jamais de dépassement.
    const used = await sumDelta(tx, { userId, axis: e.axis, delta: { gt: 0 }, kind: { in: rewardKindsFor(e.axis) }, occurredAt: { gte: weekStart }, affectsState: true });
    const room = WEEKLY_AXIS_GAIN_CAP[e.axis] - used;
    const granted = Math.max(0, Math.min(e.delta, room));
    if (granted === 0) {
      decisions.push({ axis: e.axis, kind, requested: e.delta, granted: 0, reason: "AXIS_WEEKLY_CAP" });
      continue;
    }
    if (!write) {
      decisions.push({ axis: e.axis, kind, requested: e.delta, granted, reason: "WOULD_GRANT" });
      continue;
    }
    const res = await insertReputationEvent(tx, {
      userId,
      axis: e.axis,
      kind,
      delta: granted,
      dedupeKey: dedupeFor(kind, facts, userId, key),
      commitment: rule.commitment && e.axis === "RELIABILITY",
      sourceType: facts.sourceType,
      sourceId: facts.sourceId,
      occurredAt,
      ruleVersion: RULESET_VERSION,
      meta: {
        rule: key,
        ...(facts.partnerId ? { partnerId: facts.partnerId } : {}),
        ...(facts.tier !== undefined ? { tier: facts.tier } : {}),
        ...(facts.dayKey ? { day: facts.dayKey } : {}),
        ...(facts.fingerprint ? { fp: facts.fingerprint } : {}),
        ...(granted < e.delta ? { clamped: true } : {}),
      },
    });
    if (res.applied) anyApplied = true;
    decisions.push({ axis: e.axis, kind, requested: e.delta, granted: res.applied ? granted : 0, reason: res.applied ? (granted < e.delta ? "GRANTED_CLAMPED" : "GRANTED") : "ALREADY_RECORDED", eventId: res.eventId });
  }

  if (write && anyApplied) await clearReassessmentIfDue(tx, userId);
  return { mode, ruleKey: key, applied: anyApplied, reason: anyApplied ? "GRANTED" : (decisions[0]?.reason ?? "NONE"), decisions };
}

/** La fiabilité est « à réévaluer » jusqu'à ce que assez d'engagements aient été observés depuis la remise à zéro. */
async function clearReassessmentIfDue(tx: Tx, userId: string): Promise<void> {
  await tx.reputationState.updateMany({
    where: { userId, reliabilityReassessment: true, evaluatedCommitments: { gte: LEVEL_MIN_OBSERVATIONS } },
    data: { reliabilityReassessment: false },
  });
}

// ============================================================
// Incidents et pénalités exceptionnelles
// ============================================================

export interface IncidentFacts {
  sourceType: string;
  sourceId: string;
  classification: IncidentClassification;
  exemptions?: IncidentExemptions;
  occurredAt?: Date;
}

export interface IncidentResult {
  mode: RulesMode;
  family: PenaltyFamily;
  recorded: boolean;
  reason: string;
  penalty: { delta: number; reason: string; ratio: number; incidentsInWindow: number; respectedInWindow: number } | null;
  penaltyEventId?: string | null;
}

export async function recordReliabilityIncident(
  tx: Tx,
  family: PenaltyFamily,
  userId: string,
  facts: IncidentFacts,
  options?: RuleOptions,
): Promise<IncidentResult> {
  const { now, mode, effectiveFrom } = resolve(options);
  const occurredAt = facts.occurredAt ?? now;
  const out = (recorded: boolean, reason: string, penalty: IncidentResult["penalty"] = null, penaltyEventId?: string | null): IncidentResult => ({ mode, family, recorded, reason, penalty, penaltyEventId });

  const blocked = gate(mode, effectiveFrom, occurredAt);
  if (blocked) return out(false, blocked);
  // Aucune pénalité automatique si la nature n'est pas établie, si l'événement est protégé ou s'il est antérieur à l'entrée en vigueur.
  const excluded = incidentExclusion(facts.classification, facts.exemptions);
  if (excluded) return out(false, excluded);

  const write = mode === "active";
  const since = new Date(occurredAt.getTime() - msDays(PENALTY_WINDOW_DAYS));
  const iKind = incidentKind(family);
  const dedupe = `${iKind}:${facts.sourceType}:${facts.sourceId}:${userId}`;

  let alreadyCounted = false;
  let epoch = 0;
  if (write) {
    const state = await lockReputationState(tx, userId);
    epoch = state.epoch;
    const res = await insertReputationEvent(tx, {
      userId,
      axis: "RELIABILITY",
      kind: iKind,
      delta: 0,
      dedupeKey: dedupe,
      commitment: true,
      sourceType: facts.sourceType,
      sourceId: facts.sourceId,
      occurredAt,
      ruleVersion: RULESET_VERSION,
      meta: { family },
    });
    if (!res.applied) return out(false, "ALREADY_RECORDED");
    alreadyCounted = true; // l'incident est maintenant dans le registre
  } else {
    const st = await tx.reputationState.findUnique({ where: { userId } });
    epoch = st?.epoch ?? 0;
  }

  const incidents = (await countEvents(tx, { userId, kind: iKind, epoch, occurredAt: { gte: since } })) + (alreadyCounted ? 0 : 1);
  const respected = await countEvents(tx, { userId, axis: "RELIABILITY", delta: { gt: 0 }, commitment: true, affectsState: true, epoch, occurredAt: { gte: since } });
  const famPenalty = Math.abs(await sumDelta(tx, { userId, kind: penaltyKind(family), epoch, occurredAt: { gte: since } }));
  const totalPenalty = Math.abs(await sumDelta(tx, { userId, kind: { endsWith: "_PENALTY" }, epoch, occurredAt: { gte: since } }));

  const decision = decidePenalty({ family, incidentsInWindow: incidents, respectedInWindow: respected, penaltyFamilySoFar: famPenalty, penaltyTotalSoFar: totalPenalty });
  const penalty = { delta: decision.delta, reason: decision.reason, ratio: Math.round(decision.ratio * 1000) / 1000, incidentsInWindow: incidents, respectedInWindow: respected };
  if (!decision.penalize) return out(write, decision.reason, penalty);
  if (!write) return out(false, "WOULD_PENALIZE", penalty);

  const pen = await insertReputationEvent(tx, {
    userId,
    axis: "RELIABILITY",
    kind: penaltyKind(family),
    delta: decision.delta,
    dedupeKey: `${penaltyKind(family)}:${facts.sourceType}:${facts.sourceId}:${userId}`,
    contestable: true,
    sourceType: facts.sourceType,
    sourceId: facts.sourceId,
    occurredAt,
    ruleVersion: RULESET_VERSION,
    meta: { family, incidents, respected, ratio: penalty.ratio },
  });
  return out(true, pen.applied ? "PENALIZED" : "ALREADY_RECORDED", penalty, pen.eventId);
}

// ============================================================
// Niveau de fiabilité
// ============================================================

export interface ReliabilityObservations {
  respected: number;
  incidents: number;
  recentPenalty: number;
  reliabilityPoints: number;
  reassessment: boolean;
}

export async function loadReliabilityObservations(db: Db, userId: string, now: Date = new Date()): Promise<ReliabilityObservations> {
  const state = await db.reputationState.findUnique({ where: { userId } });
  if (!state) return { respected: 0, incidents: 0, recentPenalty: 0, reliabilityPoints: 0, reassessment: false };
  const since = new Date(now.getTime() - msDays(LEVEL_WINDOW_DAYS));
  const penaltySince = new Date(now.getTime() - msDays(PENALTY_WINDOW_DAYS));
  const epoch = state.epoch;
  const [respected, incidents, penalty] = await Promise.all([
    countEvents(db, { userId, axis: "RELIABILITY", delta: { gt: 0 }, commitment: true, affectsState: true, epoch, occurredAt: { gte: since } }),
    countEvents(db, { userId, kind: { endsWith: "_INCIDENT" }, epoch, occurredAt: { gte: since } }),
    sumDelta(db, { userId, kind: { endsWith: "_PENALTY" }, epoch, occurredAt: { gte: penaltySince } }),
  ]);
  return { respected, incidents, recentPenalty: Math.abs(penalty), reliabilityPoints: state.reliability, reassessment: state.reliabilityReassessment };
}

/** Niveau uniquement (jamais les points) : c'est tout ce qu'une interface future pourra afficher. */
export async function getReliabilityLevel(db: Db, userId: string, now: Date = new Date()): Promise<{ level: ReliabilityLevel; label: string }> {
  const obs = await loadReliabilityObservations(db, userId, now);
  const level = computeReliabilityLevel(obs);
  return { level, label: LEVEL_LABELS[level] };
}

// ============================================================
// Bonus de diversité des rencontres
// ============================================================

export interface DiversityFacts {
  partnerId: string;
  stage: 1 | 2;
  /** Fil d'échange du binôme (messages, auteurs, horodatage) : fourni par l'appelant, jamais stocké. */
  thread: readonly ThreadMessage[];
  /** Indicateurs objectifs du partenaire (calculés côté serveur par l'appelant). */
  partner: DiversityMetrics;
  occurredAt?: Date;
}

export interface DiversityResult {
  mode: RulesMode;
  granted: number;
  reason: string;
  eventId?: string | null;
}

/**
 * Bonus « diversité ». Le motif (nouveau membre, peu sollicité, rarement sélectionné, retour) n'est NI renvoyé NI stocké :
 * seul l'identifiant de l'interlocuteur et l'étape sont conservés.
 */
export async function applyDiversityBonus(tx: Tx, memberId: string, facts: DiversityFacts, options?: RuleOptions): Promise<DiversityResult> {
  const { now, mode, effectiveFrom } = resolve(options);
  const occurredAt = facts.occurredAt ?? now;
  const res = (granted: number, reason: string, eventId?: string | null): DiversityResult => ({ mode, granted, reason, eventId });

  const blocked = gate(mode, effectiveFrom, occurredAt);
  if (blocked) return res(0, blocked);
  if (memberId === facts.partnerId) return res(0, "SELF_INTERACTION");
  if (!isDiversityTarget(facts.partner)) return res(0, "NOT_ELIGIBLE");
  if (!isGenuineFirstExchange(facts.thread, memberId, facts.partnerId)) return res(0, "NOT_A_GENUINE_EXCHANGE");

  const write = mode === "active";
  if (write) {
    await lockReputationState(tx, memberId);
    await touchActivityTx(tx, memberId, now);
  }
  const pairKey = [memberId, facts.partnerId].sort().join("~");
  const partnerFilter: Prisma.ReputationEventWhereInput = { userId: memberId, kind: DIVERSITY_KIND, meta: { path: ["partnerId"], equals: facts.partnerId } };

  if (facts.stage === 2) {
    if (!isGenuineContinuation(facts.thread, memberId, facts.partnerId)) return res(0, "NOT_CONTINUED");
    const stage1 = await countEvents(tx, { ...partnerFilter, dedupeKey: `DIVERSITY:1:${pairKey}:${memberId}` });
    if (stage1 === 0) return res(0, "STAGE_ONE_MISSING");
  }

  const pairSoFar = await sumDelta(tx, partnerFilter);
  const weekSoFar = await sumDelta(tx, { userId: memberId, kind: DIVERSITY_KIND, occurredAt: { gte: startOfUtcWeek(now) } });
  const decision = decideDiversityBonus({ stage: facts.stage, pairSoFar, weekSoFar });
  if (decision.points === 0) return res(0, decision.reason);
  if (!write) return res(decision.points, "WOULD_GRANT");

  const ins = await insertReputationEvent(tx, {
    userId: memberId,
    axis: "PARTICIPATION",
    kind: DIVERSITY_KIND,
    delta: decision.points,
    dedupeKey: `DIVERSITY:${facts.stage}:${pairKey}:${memberId}`,
    sourceType: "Dyad",
    sourceId: pairKey,
    occurredAt,
    ruleVersion: RULESET_VERSION,
    meta: { partnerId: facts.partnerId, stage: facts.stage },
  });
  return res(ins.applied ? decision.points : 0, ins.applied ? "GRANTED" : "ALREADY_RECORDED", ins.eventId);
}

export { DIVERSITY, utcDayKey };

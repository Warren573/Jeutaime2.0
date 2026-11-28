/**
 * Diversité des rencontres — règles PURES (aucune requête, aucune horloge implicite, aucun effet).
 *
 * STATUT : PRÉPARATION. Rien n'est branché : ni le bonus, ni le classement de sélection des profils. Les valeurs sont des
 * propositions à valider avant activation.
 *
 * Principes :
 *  - favoriser naturellement les échanges avec les nouveaux membres, les membres peu sollicités, les membres actifs rarement
 *    sélectionnés et les membres de retour après une remise à zéro ;
 *  - NE JAMAIS identifier ces membres : aucun motif n'est renvoyé au client ni inscrit dans le registre ; les fonctions
 *    « cible » restent côté serveur ;
 *  - la visibilité est répartie SANS contourner la compatibilité, les blocages ni les préférences : le classement ne fait que
 *    ré-ordonner un ensemble déjà filtré (permutation, jamais d'ajout ni de retrait) ;
 *  - popularité (élections) ≠ volume d'interactions ≠ exposition : un membre peu présenté n'est pas « peu apprécié ».
 */
import { isSubstantiveText, textFingerprint, type ReliabilityLevel } from "./reputationRules";

export const DIVERSITY = {
  FIRST_EXCHANGE_POINTS: 5,
  CONTINUED_POINTS: 5,
  /** Maximum par binôme (par membre bénéficiaire et par interlocuteur) pour ce dispositif. */
  PER_PAIR_CAP: 10,
  /** Plafond hebdomadaire par membre (semaine calendaire UTC). */
  WEEKLY_CAP: 30,
  NEW_MEMBER_DAYS: 30,
  /** Membre « peu sollicité » : au plus ce nombre d'expéditeurs DISTINCTS lui ont écrit dans les 30 derniers jours. */
  LOW_RECEIVED_MAX_DISTINCT_SENDERS: 2,
  /** Membre « actif mais rarement sélectionné ». */
  RARELY_SELECTED_MIN_EXPOSURES: 20,
  RARELY_SELECTED_MAX_RATE: 0.05,
  RETURNING_DAYS: 30,
  /** Un compte trop récent ne peut pas servir de cible (fabrication de comptes). */
  MIN_PARTNER_AGE_HOURS: 24,
  /** Délai minimal entre deux messages de membres différents pour parler d'échange (anti-automatisme). */
  MIN_GAP_MINUTES: 2,
  CONTINUATION_MIN_SUBSTANTIVE_PER_SIDE: 3,
  CONTINUATION_MIN_DISTINCT_DAYS: 2,
  /** Lissage bayésien de l'appréciation (voir `smoothedAppreciation`). */
  APPRECIATION_PRIOR_MEAN: 0.1,
  APPRECIATION_PRIOR_WEIGHT: 20,
} as const;

export interface DiversityMetrics {
  accountAgeDays: number;
  /** Expéditeurs distincts (lettres, bouteilles) ayant écrit au membre dans les 30 derniers jours. */
  distinctSendersReceived30d: number;
  /** Nombre de fois où le profil a été présenté dans la sélection (30 jours). */
  exposures30d: number;
  /** Signaux positifs reçus pendant ces expositions (sourires). */
  positiveSignals30d: number;
  /** Le membre a participé dans les 14 derniers jours. */
  activeRecently: boolean;
  /** Jours écoulés depuis une remise à zéro pour inactivité, ou null. */
  daysSinceReset: number | null;
  /** Garde-fous : un compte non vérifié, incomplet ou sanctionné n'est jamais une cible. */
  verified: boolean;
  profileComplete: boolean;
  banned: boolean;
  accountAgeHours: number;
}

/** Motifs INTERNES : ne jamais les renvoyer au client ni les stocker dans le registre. */
export type DiversityReason = "NEW_MEMBER" | "LOW_RECEIVED" | "RARELY_SELECTED" | "RETURNING";

/** Appréciation lissée : peu d'expositions → l'estimation reste proche de la moyenne, jamais « impopulaire ». */
export function smoothedAppreciation(
  positives: number,
  exposures: number,
  priorMean: number = DIVERSITY.APPRECIATION_PRIOR_MEAN,
  priorWeight: number = DIVERSITY.APPRECIATION_PRIOR_WEIGHT,
): number {
  return (positives + priorMean * priorWeight) / (exposures + priorWeight);
}

export function diversityReasons(m: DiversityMetrics): DiversityReason[] {
  if (!m.verified || !m.profileComplete || m.banned) return [];
  if (m.accountAgeHours < DIVERSITY.MIN_PARTNER_AGE_HOURS) return [];
  const reasons: DiversityReason[] = [];
  if (m.accountAgeDays <= DIVERSITY.NEW_MEMBER_DAYS) reasons.push("NEW_MEMBER");
  if (m.distinctSendersReceived30d <= DIVERSITY.LOW_RECEIVED_MAX_DISTINCT_SENDERS) reasons.push("LOW_RECEIVED");
  if (
    m.activeRecently &&
    m.exposures30d >= DIVERSITY.RARELY_SELECTED_MIN_EXPOSURES &&
    m.positiveSignals30d / Math.max(1, m.exposures30d) <= DIVERSITY.RARELY_SELECTED_MAX_RATE
  ) {
    reasons.push("RARELY_SELECTED");
  }
  if (m.daysSinceReset !== null && m.daysSinceReset <= DIVERSITY.RETURNING_DAYS) reasons.push("RETURNING");
  return reasons;
}

export function isDiversityTarget(m: DiversityMetrics): boolean {
  return diversityReasons(m).length > 0;
}

// ── Échange réciproque « véritable » ────────────────────────────────────────────────────────────────────

export interface ThreadMessage {
  fromId: string;
  text: string;
  sentAt: Date;
}

/** Messages substantiels et non répétés (un copier-coller de la même empreinte n'est compté qu'une fois, tous auteurs confondus). */
export function substantiveMessages(thread: readonly ThreadMessage[]): ThreadMessage[] {
  const seen = new Set<string>();
  const out: ThreadMessage[] = [];
  for (const m of [...thread].sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime())) {
    if (!isSubstantiveText(m.text)) continue;
    const fp = textFingerprint(m.text);
    if (seen.has(fp)) continue;
    seen.add(fp);
    out.push(m);
  }
  return out;
}

/**
 * Premier véritable échange : chacun a écrit au moins un message substantiel, et le second auteur répond APRÈS le premier
 * avec un délai minimal. Un simple sourire, une invitation, un message sans réponse ou des messages artificiels ne suffisent pas.
 */
export function isGenuineFirstExchange(thread: readonly ThreadMessage[], a: string, b: string): boolean {
  if (a === b) return false;
  const msgs = substantiveMessages(thread).filter((m) => m.fromId === a || m.fromId === b);
  for (let i = 0; i < msgs.length; i++) {
    for (let j = i + 1; j < msgs.length; j++) {
      const first = msgs[i]!;
      const second = msgs[j]!;
      if (first.fromId !== second.fromId && second.sentAt.getTime() - first.sentAt.getTime() >= DIVERSITY.MIN_GAP_MINUTES * 60_000) return true;
    }
  }
  return false;
}

/** L'échange « se poursuit réellement » : plusieurs messages substantiels de chaque côté, sur plusieurs jours distincts. */
export function isGenuineContinuation(thread: readonly ThreadMessage[], a: string, b: string): boolean {
  if (a === b || !isGenuineFirstExchange(thread, a, b)) return false;
  const msgs = substantiveMessages(thread);
  const perSide = (id: string) => msgs.filter((m) => m.fromId === id).length;
  if (perSide(a) < DIVERSITY.CONTINUATION_MIN_SUBSTANTIVE_PER_SIDE || perSide(b) < DIVERSITY.CONTINUATION_MIN_SUBSTANTIVE_PER_SIDE) return false;
  const days = new Set(msgs.filter((m) => m.fromId === a || m.fromId === b).map((m) => m.sentAt.toISOString().slice(0, 10)));
  return days.size >= DIVERSITY.CONTINUATION_MIN_DISTINCT_DAYS;
}

export interface BonusContext {
  stage: 1 | 2;
  /** Points de diversité déjà attribués à ce membre pour CE binôme. */
  pairSoFar: number;
  /** Points de diversité déjà attribués à ce membre pendant la semaine courante. */
  weekSoFar: number;
}

export interface BonusDecision {
  points: number;
  reason: "GRANTED" | "PAIR_CAP" | "WEEKLY_CAP";
}

export function decideDiversityBonus(ctx: BonusContext): BonusDecision {
  const base = ctx.stage === 1 ? DIVERSITY.FIRST_EXCHANGE_POINTS : DIVERSITY.CONTINUED_POINTS;
  const pairRoom = DIVERSITY.PER_PAIR_CAP - ctx.pairSoFar;
  const weekRoom = DIVERSITY.WEEKLY_CAP - ctx.weekSoFar;
  if (pairRoom <= 0) return { points: 0, reason: "PAIR_CAP" };
  if (weekRoom <= 0) return { points: 0, reason: "WEEKLY_CAP" };
  return { points: Math.min(base, pairRoom, weekRoom), reason: "GRANTED" };
}

// ── Sélection des profils : répartition de la visibilité ────────────────────────────────────────────────────

export interface DiscoveryCandidate {
  id: string;
  level: ReliabilityLevel;
  /** Participation récente (points sur une fenêtre glissante, pas l'ancienneté). */
  participationRecent: number;
  exposures30d: number;
  accountAgeDays: number;
  /** Jours depuis une remise à zéro, ou null. */
  daysSinceReset: number | null;
  distinctSendersReceived30d: number;
}

/**
 * Poids de niveau. « Nouveau membre » et « à réévaluer » sont NEUTRES (équivalents à « fiable ») : ils ne partent pas
 * désavantagés. Aucune donnée d'abonnement n'entre dans ce calcul.
 */
const LEVEL_WEIGHT: Readonly<Record<ReliabilityLevel, number>> = {
  EXEMPLARY: 5,
  VERY_RELIABLE: 4,
  RELIABLE: 3,
  NEW_MEMBER: 3,
  REASSESSMENT: 3,
  FRAGILE: 2,
  UNRELIABLE: 1,
};

export interface DiscoveryParams {
  /** Une position sur N est réservée à la répartition de la visibilité (4 → 25 %). */
  fairnessEvery: number;
}
export const DEFAULT_DISCOVERY_PARAMS: DiscoveryParams = { fairnessEvery: 4 };

/** Hachage déterministe → [0,1) : stable pour un même (spectateur, jour, candidat), donc compatible avec la pagination. */
export function seededUnit(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995) >>> 0;
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

function isUnderExposed(c: DiscoveryCandidate, medianExposure: number): boolean {
  return (
    c.accountAgeDays <= DIVERSITY.NEW_MEMBER_DAYS ||
    c.distinctSendersReceived30d <= DIVERSITY.LOW_RECEIVED_MAX_DISTINCT_SENDERS ||
    (c.daysSinceReset !== null && c.daysSinceReset <= DIVERSITY.RETURNING_DAYS) ||
    c.exposures30d < medianExposure
  );
}

/**
 * Ordonne un ensemble de candidats DÉJÀ FILTRÉ (compatibilité, blocages, préférences, vacances, bannis : tout cela reste en
 * amont). Résultat = permutation des mêmes identifiants. Un candidat sur `fairnessEvery` est issu de la file « peu exposé »,
 * triée par exposition croissante ; les autres positions suivent la fiabilité puis la participation récente. Un hachage
 * déterministe (spectateur + jour) départage les égalités.
 */
export function rankProfilesForDiscovery(
  candidates: readonly DiscoveryCandidate[],
  viewerId: string,
  dayKey: string,
  params: DiscoveryParams = DEFAULT_DISCOVERY_PARAMS,
): string[] {
  const jitter = (id: string) => seededUnit(`${viewerId}|${dayKey}|${id}`);
  const base = (c: DiscoveryCandidate) => LEVEL_WEIGHT[c.level] * 10 + Math.min(4, Math.floor(Math.max(0, c.participationRecent) / 25));

  const byBase = [...candidates].sort((x, y) => base(y) - base(x) || jitter(x.id) - jitter(y.id));
  const exposures = candidates.map((c) => c.exposures30d).sort((a, b) => a - b);
  const median = exposures.length ? exposures[Math.floor(exposures.length / 2)]! : 0;
  const lane = candidates
    .filter((c) => isUnderExposed(c, median))
    .sort((x, y) => x.exposures30d - y.exposures30d || jitter(x.id) - jitter(y.id));

  const used = new Set<string>();
  const out: string[] = [];
  let laneIdx = 0;
  let baseIdx = 0;
  const every = Math.max(2, Math.floor(params.fairnessEvery));
  while (out.length < candidates.length) {
    const position = out.length + 1;
    let pick: DiscoveryCandidate | undefined;
    if (position % every === 0) {
      while (laneIdx < lane.length && used.has(lane[laneIdx]!.id)) laneIdx++;
      pick = lane[laneIdx];
    }
    if (!pick) {
      while (baseIdx < byBase.length && used.has(byBase[baseIdx]!.id)) baseIdx++;
      pick = byBase[baseIdx];
    }
    if (!pick) break;
    used.add(pick.id);
    out.push(pick.id);
  }
  return out;
}

// ── Suggestions générales et occasionnelles (aucune interface ici) ────────────────────────────────────────

export const DISCOVERY_SUGGESTIONS: readonly string[] = [
  "Diversifier tes échanges te rapporte des points de participation.",
  "Fais connaissance avec de nouveaux membres.",
  "Pense aussi aux profils que tu n'as pas encore découverts.",
];

const SUGGESTION_MIN_INTERVAL_DAYS = 7;

/**
 * Suggestion GÉNÉRALE, jamais liée à un profil précis : au plus une par semaine, et seulement certains jours (tirage
 * déterministe), pour rester discret. Retourne null la plupart du temps.
 */
export function pickDiscoverySuggestion(params: { viewerId: string; now: Date; lastShownAt: Date | null }): string | null {
  const { viewerId, now, lastShownAt } = params;
  if (lastShownAt && now.getTime() - lastShownAt.getTime() < SUGGESTION_MIN_INTERVAL_DAYS * 86_400_000) return null;
  const day = now.toISOString().slice(0, 10);
  if (seededUnit(`suggest|${viewerId}|${day}`) >= 1 / 3) return null;
  return DISCOVERY_SUGGESTIONS[Math.floor(seededUnit(`pick|${viewerId}|${day}`) * DISCOVERY_SUGGESTIONS.length)] ?? null;
}

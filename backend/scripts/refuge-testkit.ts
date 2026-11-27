/**
 * Refuge — outillage de TEST accéléré (logique PURE : aucune base, aucune horloge, aucun réseau).
 *
 * Sert au script `backend/scripts/refuge-accelerated-test.ts` (lancé uniquement par le workflow manuel
 * `.github/workflows/refuge-accelerated-test.yml`). Aucune règle de production n'est définie ni modifiée ici : les valeurs
 * attendues sont CALCULÉES avec les fonctions de règles de production (refuge.rules.ts).
 *
 * Principe : on ne change jamais la durée réelle du Refuge ni l'horloge du serveur. Pour une session de test, on recule
 * `startedAt` ET les horodatages de ses propres choix / réponses du même écart (la session « vit » plus vite).
 */
import {
  DAILY_ASSIDUITY_COINS,
  computeFinalSettlement,
  evaluateDayV2,
  type FinalDayRow,
} from "../src/modules/refuge/refuge.rules";

// ============================================================
// Comptes autorisés
// ============================================================
export const TEST_EMAIL_DOMAIN = "jeutaime.test";
export const TEST_ACCOUNT_NUMBERS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

export interface AccountFacts {
  email: string;
  role: string;
  isBanned: boolean;
}

/** Numéro du compte de test (testuser2 à testuser11) ou null. Comparaison EXACTE : aucun autre e-mail n'est accepté. */
export function testAccountNumber(email: string | null | undefined): number | null {
  const m = /^testuser([2-9]|10|11)@jeutaime\.test$/.exec((email ?? "").trim().toLowerCase());
  if (!m) return null;
  const n = Number(m[1]);
  return (TEST_ACCOUNT_NUMBERS as readonly number[]).includes(n) ? n : null;
}

/** Raisons de refus d'un compte (liste vide = autorisé). Un compte d'administration n'est JAMAIS autorisé, même de test. */
export function accountRefusals(a: AccountFacts, excludedEmails: readonly string[] = []): string[] {
  const out: string[] = [];
  if (testAccountNumber(a.email) === null) out.push("n'est pas un compte de test (seuls les comptes n°2 à n°11 sont autorisés)");
  if (a.role !== "USER") out.push(`rôle ${a.role} : compte d'administration, jamais utilisé`);
  if (a.isBanned) out.push("compte suspendu");
  if (excludedEmails.map((e) => e.trim().toLowerCase()).includes(a.email.trim().toLowerCase())) out.push("exclu explicitement");
  return out;
}

// ============================================================
// Scénarios
// ============================================================
export type GuessKind = "perfect" | "half" | "none";
export type SponsorAction = "answer" | "consult" | "absent";

export interface DayScript {
  day: number;
  /** Le compagnon valide ses deux actions ? */
  companion: boolean;
  /** Heure (dans la journée de 24 h) de la validation du compagnon. ≥ 18 h = validation tardive (moins de 6 h restantes). */
  companionAtHour?: number;
  sponsor: SponsorAction;
  /** Qualité de la réponse du parrain / de la marraine (si elle répond). */
  guess?: GuessKind;
}

/** `null` : cette personne n'a rien à faire (la session est déjà terminée par le refus de l'autre). */
export type RevealPlan = { companion: "ACCEPT" | "REFUSE" | null; sponsor: "ACCEPT" | "REFUSE" | null };

export interface Scenario {
  id: "S1" | "S2" | "S3";
  title: string;
  days: DayScript[];
  reveal: RevealPlan;
}

const day = (d: number, over: Partial<DayScript> = {}): DayScript => ({ day: d, companion: true, companionAtHour: 2, sponsor: "answer", guess: "perfect", ...over });

export const SCENARIOS: Record<Scenario["id"], Scenario> = {
  S1: {
    id: "S1",
    title: "Parcours parfait (14/14), dévoilement mutuel accepté",
    days: [1, 2, 3, 4, 5, 6, 7].map((d) => day(d)),
    reveal: { companion: "ACCEPT", sponsor: "ACCEPT" },
  },
  S2: {
    id: "S2",
    title: "Parcours incomplet, dévoilement refusé",
    days: [
      day(1),
      day(2, { guess: "half" }),
      day(3, { companion: false, companionAtHour: undefined, sponsor: "consult", guess: undefined }), // compagnon absent, parrain consulte
      day(4, { sponsor: "absent", guess: undefined }), // compagnon valide tôt, parrain absent → −5 points
      day(5, { companionAtHour: 20, sponsor: "absent", guess: undefined }), // validation tardive, sans consultation → ni gain ni pénalité
      day(6, { companion: false, companionAtHour: undefined, sponsor: "absent", guess: undefined }), // personne → −5 chacun
      day(7, { guess: "none" }), // 0/2
    ],
    reveal: { companion: "REFUSE", sponsor: null }, // le refus du compagnon termine la session ; le parrain/la marraine le constate
  },
  S3: {
    id: "S3",
    title: "7/7 d'assiduité, scores mixtes (bonus de 50), un accepte et l'autre refuse",
    days: [day(1), day(2, { guess: "half" }), day(3, { guess: "none" }), day(4), day(5, { guess: "half" }), day(6), day(7, { guess: "none" })],
    reveal: { companion: "ACCEPT", sponsor: "REFUSE" },
  },
};

/** Étapes (une exécution du workflow = une étape = une pause pour vérifier sur l'iPhone). */
export const STAGES = ["adopt", "days-1-3", "days-4-6", "day-7", "fast-forward", "decision", "status"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_DAYS: Partial<Record<Stage, readonly number[]>> = {
  "days-1-3": [1, 2, 3],
  "days-4-6": [4, 5, 6],
  "day-7": [7],
};

// ============================================================
// Valeurs attendues (calculées avec les règles de PRODUCTION)
// ============================================================
export const SYMBOLS: Record<string, string> = {
  PERFECT: "❤️", PARTIAL: "♡", FAILED: "❌", OPEN: "🤍", NOT_PLAYED: "—", INCOMPLETE_ADOPTE_MISSING: "⚠️", INCOMPLETE_ADOPTANT_MISSING: "⚠️",
};

const GUESS_MATCHES: Record<GuessKind, number> = { perfect: 2, half: 1, none: 0 };
const HOUR = 3600000;
const REF_END = new Date("2026-01-02T00:00:00Z"); // fin de journée fictive : seules les DIFFÉRENCES comptent

export interface ExpectedParticipant {
  coins: number;
  points: number;
  participationDays: number;
  bonus: number;
  totalCoins: number;
}
export interface Expected {
  companion: ExpectedParticipant;
  sponsor: ExpectedParticipant;
  perfectDays: number;
  correctActions: number;
  perfectCourse: boolean;
  calendar: string[];
}

export function expectedOutcome(s: Scenario): Expected {
  const rows: FinalDayRow[] = s.days.map((d) => {
    const choiceAt = d.companion ? new Date(REF_END.getTime() - (24 - (d.companionAtHour ?? 2)) * HOUR) : null;
    const answered = d.companion && d.sponsor === "answer";
    const e = evaluateDayV2({
      choiceAt,
      guessAt: answered ? REF_END : null,
      matches: answered ? GUESS_MATCHES[d.guess ?? "perfect"] : null,
      consulted: d.sponsor === "consult",
      windowEnd: REF_END,
    });
    return {
      dayNumber: d.day,
      status: e.status,
      matchCount: e.matchCount,
      adopteAssiduous: e.companion.assiduous,
      adoptantAssiduous: e.sponsor.assiduous,
      adopteScoreDelta: e.companion.points,
      adoptantScoreDelta: e.sponsor.points,
    };
  });
  const f = computeFinalSettlement(rows);
  return {
    companion: { coins: f.companionDailyCoins, points: f.companionPoints, participationDays: f.companionDays, bonus: f.companionBonus, totalCoins: f.companionDailyCoins + f.companionBonus },
    sponsor: { coins: f.sponsorDailyCoins, points: f.sponsorPoints, participationDays: f.sponsorDays, bonus: f.sponsorBonus, totalCoins: f.sponsorDailyCoins + f.sponsorBonus },
    perfectDays: f.perfectDays,
    correctActions: f.correctActions,
    perfectCourse: f.perfectCourse,
    calendar: rows.map((r) => SYMBOLS[r.status] ?? "?"),
  };
}

// ============================================================
// Préconditions (pures : évaluées sur des faits lus par le script)
// ============================================================
export interface OpenSessionFact {
  id: string;
  status: string;
  companionEmail: string;
  sponsorEmail: string | null;
}

export interface PreconditionInput {
  stage: Stage;
  companion: AccountFacts;
  sponsor: AccountFacts;
  excludedEmails: readonly string[];
  protectedSessionIds: readonly string[];
  /** Sessions ouvertes (en préparation, active, en attente de dévoilement) de CHACUN des deux comptes. */
  openSessions: readonly OpenSessionFact[];
  /** Session ciblée (étapes après « adopt »). */
  target: { id: string; companionEmail: string; sponsorEmail: string | null; status: string; rulesVersion: number } | null;
  /** Une session existe déjà pour CE couple (compagnon, parrain) : le couple est consommé (unicité en base). */
  pairAlreadyUsed: boolean;
}

/** Liste des raisons de refus. Vide = l'étape peut s'exécuter. */
export function preconditionFailures(p: PreconditionInput): string[] {
  const out: string[] = [];
  if (p.companion.email.toLowerCase() === p.sponsor.email.toLowerCase()) out.push("le compagnon et le parrain doivent être deux comptes différents");
  for (const [label, a] of [["compagnon", p.companion], ["parrain/marraine", p.sponsor]] as const) {
    for (const r of accountRefusals(a, p.excludedEmails)) out.push(`${label} ${accountLabel(a.email)} : ${r}`);
  }
  if (p.target && p.protectedSessionIds.includes(p.target.id)) out.push(`session ${sessionCode(p.target.id)} protégée (adoption en cours à préserver)`);
  if (p.stage === "adopt") {
    if (p.pairAlreadyUsed) out.push("ce couple a déjà eu un Refuge (un couple ne peut en avoir qu'un seul) : choisis un autre couple");
    for (const s of p.openSessions) out.push(`un Refuge est déjà ouvert pour ces comptes (session ${sessionCode(s.id)}, ${s.status}) : adoption en cours préservée, compte inutilisable`);
    return out;
  }
  if (!p.target) {
    out.push("session introuvable pour ce couple et cet identifiant");
    return out;
  }
  if (p.target.rulesVersion < 2) out.push("session en règles v1 : les règles v2 ne s'y appliquent pas, session refusée");
  if (p.target.companionEmail.toLowerCase() !== p.companion.email.toLowerCase() || (p.target.sponsorEmail ?? "").toLowerCase() !== p.sponsor.email.toLowerCase()) {
    out.push("la session ne correspond pas au couple indiqué");
  }
  for (const s of p.openSessions) {
    if (s.id !== p.target.id) out.push(`un AUTRE Refuge est ouvert pour ces comptes (session ${sessionCode(s.id)}) : étape refusée`);
  }
  return out;
}

/** Code public d'une session : ses 6 derniers caractères. L'identifiant complet n'est jamais écrit dans un journal public. */
export function sessionCode(id: string): string {
  return id.slice(-6);
}

/** Libellé public d'un compte : « compte n°5 » (jamais l'adresse). */
export function accountLabel(email: string | null | undefined): string {
  const n = testAccountNumber(email);
  return n === null ? "compte inconnu" : `compte n°${n}`;
}

/**
 * Phrase de confirmation à recopier pour une exécution réelle : scénario, étape, numéros des comptes (2 à 11) et, après
 * l'adoption, code de la session. Aucune adresse ni identifiant complet.
 */
export function confirmationPhrase(scenario: string, stage: string, companionNumber: number | null, sponsorNumber: number | null, code?: string): string {
  return `JE CONFIRME ${scenario} ${stage} ${companionNumber ?? "?"} ${sponsorNumber ?? "?"}${code ? ` ${code}` : ""}`;
}

export const GAINS_REMINDER = { daily: DAILY_ASSIDUITY_COINS };

// ============================================================
// Journaux : jamais l'URL de connexion (ni ses éléments)
// ============================================================
/**
 * Masque, dans un texte destiné aux journaux publics, l'URL de connexion à la base et chacun de ses éléments (utilisateur,
 * mot de passe, hôte, base), ainsi que toute URL `postgres://…`. GitHub masque déjà la valeur exacte du secret, mais pas
 * l'hôte seul ni un message d'erreur qui le cite : cette fonction couvre ces cas.
 */
export function redactSecrets(text: string, connectionUrls: ReadonlyArray<string | undefined> = []): string {
  let out = text.replace(/postgres(?:ql)?:\/\/[^\s'"`)]+/gi, "[URL masquée]");
  const pieces = new Set<string>();
  for (const raw of connectionUrls) {
    if (!raw) continue;
    pieces.add(raw);
    try {
      const u = new URL(raw);
      for (const v of [u.username, decodeURIComponent(u.username), u.password, decodeURIComponent(u.password), u.hostname, u.pathname.replace(/^\//, "")]) {
        if (v && v.length >= 3) pieces.add(v);
      }
    } catch {
      // URL illisible : seule la valeur brute est masquée.
    }
  }
  for (const p of [...pieces].sort((a, b) => b.length - a.length)) out = out.split(p).join("[masqué]");
  return out;
}

/**
 * Dernier filtre de TOUT texte destiné à un journal public : URL de connexion (redactSecrets), adresses des comptes de test
 * (→ « compte n°5 ») et identifiants longs de la base (→ « … » + 6 derniers caractères).
 */
export function maskPublic(text: string, connectionUrls: ReadonlyArray<string | undefined> = []): string {
  return redactSecrets(text, connectionUrls)
    .replace(/testuser(\d{1,2})@jeutaime\.test/gi, "compte n°$1")
    .replace(/\bc[0-9a-z]{24}\b/g, (m) => `…${m.slice(-6)}`);
}

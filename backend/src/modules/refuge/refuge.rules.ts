/**
 * Refuge — règles de la version 2 (fonctions PURES : aucune requête, aucune horloge implicite).
 *
 * Fixées à l'adoption (`RefugeSession.rulesVersion = 2`) ; les sessions existantes restent en version 1 et gardent les
 * règles de refuge.utils.ts. Jamais d'application rétroactive.
 *
 *   - 10 pièces par participant assidu et par jour, quel que soit le score (0/2, 1/2, 2/2). Aucune pénalité en pièces.
 *   - Absence : −5 points de classement de sélection des profils, par jour d'absence, sans plafond ni plancher.
 *   - Protection contre les validations tardives : les six dernières heures de chaque journée.
 *   - Bonus final non cumulables : 50 pièces (7/7 jours d'assiduité individuelle) ou 100 pièces chacun (14/14).
 *   - Une mauvaise réponse n'est JAMAIS pénalisée.
 */
import type { RefugeDayStatusName } from "./refuge.utils";

export const RULES_VERSION_V2 = 2;
export const DAILY_ASSIDUITY_COINS = 10;
export const ABSENCE_SCORE_PENALTY = 5;
export const LATE_VALIDATION_GRACE_MS = 6 * 60 * 60 * 1000;
export const FINAL_BONUS_ASSIDUITY = 50;
export const FINAL_BONUS_PERFECT = 100;
export const MAX_COINS_PER_ADVENTURE = 170;
export const REFUGE_DAYS = 7;
export const PERFECT_ACTIONS = 14;

/** Bit du jour (1 à 7) dans `adoptantConsultMask`. */
export function dayBit(dayNumber: number): number {
  return dayNumber >= 1 && dayNumber <= REFUGE_DAYS ? 1 << (dayNumber - 1) : 0;
}

export function hasConsulted(mask: number, dayNumber: number): boolean {
  const bit = dayBit(dayNumber);
  return bit !== 0 && (mask & bit) === bit;
}

export interface DayFacts {
  /** Horodatage de validation des actions du compagnon (null : absent). */
  choiceAt: Date | null;
  /** Horodatage de la réponse du parrain / de la marraine (null : pas de réponse). */
  guessAt: Date | null;
  /** Bonnes réponses (0, 1, 2) quand les deux ont joué. */
  matches: number | null;
  /** Le parrain / la marraine a consulté le Refuge ce jour-là. */
  consulted: boolean;
  /** Fin de la fenêtre de 24 h de la journée. */
  windowEnd: Date;
}

export interface ParticipantDay {
  /** Assiduité reconnue pour ce jour. */
  assiduous: boolean;
  /** Pièces du jour (10 ou 0) — jamais négatif. */
  coins: number;
  /** Points de classement du jour (0 ou −5). */
  points: number;
}

export interface DayEvaluation {
  status: Exclude<RefugeDayStatusName, "OPEN">;
  matchCount: number | null;
  companion: ParticipantDay;
  sponsor: ParticipantDay;
  /** Pièces restant à verser À LA CLÔTURE (le compagnon et la réponse du parrain sont payés immédiatement). */
  payAtClosure: { companion: number; sponsor: number };
}

const PAID: ParticipantDay = { assiduous: true, coins: DAILY_ASSIDUITY_COINS, points: 0 };
const ABSENT: ParticipantDay = { assiduous: false, coins: 0, points: -ABSENCE_SCORE_PENALTY };
const NEUTRAL: ParticipantDay = { assiduous: false, coins: 0, points: 0 };

/** Vrai si les actions du compagnon n'ont été disponibles que pendant moins de six heures. */
export function isLateValidation(choiceAt: Date, windowEnd: Date): boolean {
  return windowEnd.getTime() - choiceAt.getTime() < LATE_VALIDATION_GRACE_MS;
}

/** Issue d'une journée (réglée à sa clôture, ou à la réponse du parrain / de la marraine). Idempotente par construction. */
export function evaluateDayV2(f: DayFacts): DayEvaluation {
  if (f.choiceAt && f.guessAt) {
    const m = f.matches ?? 0;
    const status = m === 2 ? "PERFECT" : m === 1 ? "PARTIAL" : "FAILED";
    return { status, matchCount: m, companion: PAID, sponsor: PAID, payAtClosure: { companion: 0, sponsor: 0 } };
  }
  if (f.choiceAt) {
    // Le compagnon a validé ; le parrain / la marraine n'a pas répondu.
    if (!isLateValidation(f.choiceAt, f.windowEnd)) {
      // Actions disponibles au moins six heures : absence → −5 points, aucune pièce.
      return { status: "INCOMPLETE_ADOPTANT_MISSING", matchCount: null, companion: PAID, sponsor: ABSENT, payAtClosure: { companion: 0, sponsor: 0 } };
    }
    if (f.consulted) {
      // Validation tardive, mais le Refuge a été consulté : assiduité reconnue, +10, aucune pénalité.
      return { status: "INCOMPLETE_ADOPTANT_MISSING", matchCount: null, companion: PAID, sponsor: PAID, payAtClosure: { companion: 0, sponsor: DAILY_ASSIDUITY_COINS } };
    }
    // Validation tardive sans consultation : ni récompense ni pénalité.
    return { status: "INCOMPLETE_ADOPTANT_MISSING", matchCount: null, companion: PAID, sponsor: NEUTRAL, payAtClosure: { companion: 0, sponsor: 0 } };
  }
  // Le compagnon n'a pas validé.
  if (f.consulted) {
    return { status: "INCOMPLETE_ADOPTE_MISSING", matchCount: null, companion: ABSENT, sponsor: PAID, payAtClosure: { companion: 0, sponsor: DAILY_ASSIDUITY_COINS } };
  }
  // Personne : −5 points chacun.
  return { status: "NOT_PLAYED", matchCount: null, companion: ABSENT, sponsor: ABSENT, payAtClosure: { companion: 0, sponsor: 0 } };
}

export interface FinalDayRow {
  dayNumber: number;
  status: string;
  matchCount: number | null;
  adopteAssiduous: boolean;
  adoptantAssiduous: boolean;
  adopteScoreDelta: number;
  adoptantScoreDelta: number;
}

export interface FinalSettlement {
  companionDays: number;
  sponsorDays: number;
  perfectDays: number;
  correctActions: number;
  perfectCourse: boolean;
  companionDailyCoins: number;
  sponsorDailyCoins: number;
  companionBonus: number;
  sponsorBonus: number;
  companionPoints: number;
  sponsorPoints: number;
}

/** Plafond : jamais plus de 170 pièces par personne et par aventure (pièces du jour + bonus). */
export function capBonus(dailyCoins: number, bonus: number): number {
  return Math.max(0, Math.min(bonus, MAX_COINS_PER_ADVENTURE - dailyCoins));
}

/** Règlement final à partir des sept résultats de journée. Bonus NON cumulables : 100 (14/14) OU 50 (7/7), jamais les deux. */
export function computeFinalSettlement(rows: readonly FinalDayRow[]): FinalSettlement {
  const byDay = new Map(rows.map((r) => [r.dayNumber, r]));
  const days = Array.from({ length: REFUGE_DAYS }, (_, i) => byDay.get(i + 1));
  const companionDays = days.filter((d) => d?.adopteAssiduous).length;
  const sponsorDays = days.filter((d) => d?.adoptantAssiduous).length;
  const perfectDays = days.filter((d) => d?.status === "PERFECT").length;
  const correctActions = days.reduce((sum, d) => sum + (d?.matchCount ?? 0), 0);
  const perfectCourse = correctActions === PERFECT_ACTIONS && companionDays === REFUGE_DAYS && sponsorDays === REFUGE_DAYS;
  const companionDailyCoins = companionDays * DAILY_ASSIDUITY_COINS;
  const sponsorDailyCoins = sponsorDays * DAILY_ASSIDUITY_COINS;
  const bonusFor = (assiduousDays: number) => (perfectCourse ? FINAL_BONUS_PERFECT : assiduousDays === REFUGE_DAYS ? FINAL_BONUS_ASSIDUITY : 0);
  return {
    companionDays,
    sponsorDays,
    perfectDays,
    correctActions,
    perfectCourse,
    companionDailyCoins,
    sponsorDailyCoins,
    companionBonus: capBonus(companionDailyCoins, bonusFor(companionDays)),
    sponsorBonus: capBonus(sponsorDailyCoins, bonusFor(sponsorDays)),
    companionPoints: days.reduce((sum, d) => sum + (d?.adopteScoreDelta ?? 0), 0),
    sponsorPoints: days.reduce((sum, d) => sum + (d?.adoptantScoreDelta ?? 0), 0),
  };
}

// ============================================================
// Bilan final des sept jours (vu par UN participant) — calculé à partir de données déjà persistées
// ============================================================

export interface FinalReportDay {
  dayNumber: number;
  /** Symbole du jour (cœur plein, cœur vide, croix, avertissement…). */
  symbol: string;
  status: string;
  /** Bonnes réponses du jour (0 à 2), null si la journée n'a pas été jouée à deux. */
  matches: number | null;
  /** Assiduité reconnue pour CE participant. */
  assiduous: boolean;
  /** Pièces gagnées par CE participant ce jour-là (jamais négatif). */
  coins: number;
  /** Points de classement de CE participant ce jour-là (0 ou −5). */
  points: number;
}

export interface FinalReport {
  days: FinalReportDay[];
  /** Journées d'assiduité individuelle (sur 7). */
  participationDays: number;
  /** Journées parfaites (2/2) sur 7. */
  perfectDays: number;
  /** Actions correctement devinées, sur 14. */
  correctActions: number;
  perfectCourse: boolean;
  /** Pièces des journées + bonus final = total gagné. */
  dailyCoins: number;
  finalBonus: number;
  bonusTier: "perfect" | "assiduity" | null;
  totalCoins: number;
  /** Total des points de classement retirés (0 ou négatif). */
  penaltyPoints: number;
}

export function buildFinalReport(
  rows: readonly FinalDayRow[],
  role: "adopte" | "adoptant",
  finalBonus: number,
  symbols: Record<string, string>
): FinalReport {
  const settlement = computeFinalSettlement(rows);
  const byDay = new Map(rows.map((r) => [r.dayNumber, r]));
  const mine = role === "adopte";
  const days: FinalReportDay[] = Array.from({ length: REFUGE_DAYS }, (_, i) => {
    const r = byDay.get(i + 1);
    const assiduous = !!(mine ? r?.adopteAssiduous : r?.adoptantAssiduous);
    return {
      dayNumber: i + 1,
      symbol: symbols[r?.status ?? "OPEN"] ?? symbols["OPEN"] ?? "",
      status: r?.status ?? "OPEN",
      matches: r?.matchCount ?? null,
      assiduous,
      coins: assiduous ? DAILY_ASSIDUITY_COINS : 0,
      points: (mine ? r?.adopteScoreDelta : r?.adoptantScoreDelta) ?? 0,
    };
  });
  const dailyCoins = mine ? settlement.companionDailyCoins : settlement.sponsorDailyCoins;
  return {
    days,
    participationDays: mine ? settlement.companionDays : settlement.sponsorDays,
    perfectDays: settlement.perfectDays,
    correctActions: settlement.correctActions,
    perfectCourse: settlement.perfectCourse,
    dailyCoins,
    finalBonus,
    bonusTier: finalBonus <= 0 ? null : settlement.perfectCourse ? "perfect" : "assiduity",
    totalCoins: dailyCoins + finalBonus,
    penaltyPoints: mine ? settlement.companionPoints : settlement.sponsorPoints,
  };
}

import { RefugeAction, RefugeSessionStatus, RefugeAnimalType, RefugeAnimalCategory, RefugeAnimalSexe } from "@prisma/client";
import { differenceInDays, differenceInHours, differenceInMilliseconds } from "date-fns";
import type { RefugeTimeRemaining } from "./refuge.types";

// ============================================================
// Constantes Refuge
// ============================================================

export const REFUGE_DURATION_DAYS = 7;
export const REFUGE_INACTIVITY_ALERT_HOURS = 24;
export const REFUGE_FINAL_ALERT_HOURS = 48;
export const REFUGE_AUTO_ABANDON_HOURS = 72;
// Économie du Refuge — montants centralisés (passent par le Wallet officiel)
export const REFUGE_PERFECT_REWARD = 10; // 2/2 : +10 chacun
export const REFUGE_PARTIAL_REWARD = 5; // 1/2 : +5 chacun
export const REFUGE_PARTICIPATION_REWARD = 5; // jour incomplet : +5 pour celui qui a participé
export const REFUGE_INACTIVITY_PENALTY = 5; // jour incomplet : -5 pour l'absent (jamais de solde négatif)

// ============================================================
// Utilitaires de calcul
// ============================================================

export function calculateRefugeEndsAt(createdAt: Date): Date {
  const endsAt = new Date(createdAt);
  endsAt.setDate(endsAt.getDate() + REFUGE_DURATION_DAYS);
  return endsAt;
}

export function getCurrentDay(createdAt: Date | null, startedAt: Date | null, now: Date = new Date()): number {
  if (!startedAt) return 0; // Pas commencé
  const daysPassed = differenceInDays(now, startedAt);
  const currentDay = Math.min(daysPassed + 1, REFUGE_DURATION_DAYS);
  return Math.max(1, currentDay);
}

export function getTimeRemaining(endsAt: Date, now: Date = new Date()): RefugeTimeRemaining {
  const millisRemaining = Math.max(0, differenceInMilliseconds(endsAt, now));
  const daysRemaining = Math.ceil(millisRemaining / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.ceil(millisRemaining / (1000 * 60 * 60));

  return {
    days: daysRemaining,
    hours: hoursRemaining,
    milliseconds: millisRemaining,
  };
}

export function isRefugeExpired(endsAt: Date | null, now: Date = new Date()): boolean {
  if (!endsAt) return false;
  return now >= endsAt;
}

export function canSubmitDailyChoice(status: RefugeSessionStatus): boolean {
  return status === RefugeSessionStatus.ACTIVE;
}

// ============================================================
// Validations
// ============================================================

export function validateActionsAreDifferent(action1: RefugeAction, action2: RefugeAction): boolean {
  return action1 !== action2;
}

export function isValidDay(dayNumber: number): boolean {
  return dayNumber >= 1 && dayNumber <= REFUGE_DURATION_DAYS;
}

export function shouldSendInactivityAlert(lastActivityAt: Date, now: Date = new Date()): boolean {
  const hoursElapsed = differenceInHours(now, lastActivityAt);
  return hoursElapsed >= REFUGE_INACTIVITY_ALERT_HOURS && hoursElapsed < REFUGE_FINAL_ALERT_HOURS;
}

export function shouldSendFinalAlert(lastActivityAt: Date, now: Date = new Date()): boolean {
  const hoursElapsed = differenceInHours(now, lastActivityAt);
  return hoursElapsed >= REFUGE_FINAL_ALERT_HOURS && hoursElapsed < REFUGE_AUTO_ABANDON_HOURS;
}

export function shouldAutoAbandon(lastActivityAt: Date, now: Date = new Date()): boolean {
  const hoursElapsed = differenceInHours(now, lastActivityAt);
  return hoursElapsed >= REFUGE_AUTO_ABANDON_HOURS;
}

export function calculateHearts(
  dailyChoices: any[],
  guesses: any[],
  _currentDay: number
): string[] {
  const hearts: string[] = [];

  for (let day = 1; day <= REFUGE_DURATION_DAYS; day++) {
    const dailyChoice = dailyChoices.find((dc) => dc.dayNumber === day);
    const guess = guesses.find((g) => g.dayNumber === day);

    if (!dailyChoice) {
      // No choice submitted yet
      hearts.push("🤍");
    } else if (!guess) {
      // Choice submitted but no guess yet
      hearts.push("🤍");
    } else {
      // Même source de vérité que le message/récompense du jour :
      // 1 ou 2 bonnes réponses → ❤️, 0 → ❌ (ordre sans importance)
      hearts.push(calculateDayResult(dailyChoice, guess).emoji);
    }
  }

  return hearts;
}

export interface DayResult {
  matches: number;
  message: string;
  reward: number;
  emoji: string;
}

export function calculateDayResult(dailyChoice: any, guess: any): DayResult {
  if (!dailyChoice || !guess) {
    return {
      matches: 0,
      message: "Attente du résultat",
      reward: 0,
      emoji: "🤍",
    };
  }

  // Count how many actions match (in either order)
  let matches = 0;
  if (guess.guessedAction1 === dailyChoice.action1 || guess.guessedAction1 === dailyChoice.action2) {
    matches++;
  }
  if (guess.guessedAction2 === dailyChoice.action1 || guess.guessedAction2 === dailyChoice.action2) {
    matches++;
  }

  // Remove duplicates if both guesses are the same action
  if (guess.guessedAction1 === guess.guessedAction2) {
    matches = 0;
  }

  if (matches === 2) {
    return {
      matches: 2,
      message: "Vous étiez sur la même longueur d'onde aujourd'hui !",
      reward: REFUGE_PERFECT_REWARD,
      emoji: "❤️",
    };
  } else if (matches === 1) {
    return {
      matches: 1,
      message: "Vous n'étiez pas loin d'être sur la même longueur d'onde.",
      reward: REFUGE_PARTIAL_REWARD,
      emoji: "♡",
    };
  } else {
    return {
      matches: 0,
      message: "Vous n'étiez pas sur la même longueur d'onde aujourd'hui.",
      reward: 0,
      emoji: "❌",
    };
  }
}

// ============================================================
// Statuts finaux des journées — symboles, messages, deltas
// ============================================================

export type RefugeDayStatusName =
  | "OPEN"
  | "FAILED"
  | "PARTIAL"
  | "PERFECT"
  | "INCOMPLETE_ADOPTE_MISSING"
  | "INCOMPLETE_ADOPTANT_MISSING"
  | "NOT_PLAYED";

export const DAY_STATUS_SYMBOLS: Record<RefugeDayStatusName, string> = {
  OPEN: "🤍",
  FAILED: "❌",
  PARTIAL: "♡",
  PERFECT: "❤️",
  INCOMPLETE_ADOPTE_MISSING: "⚠️",
  INCOMPLETE_ADOPTANT_MISSING: "⚠️",
  NOT_PLAYED: "—",
};

export const DAY_STATUS_MESSAGES: Record<RefugeDayStatusName, string> = {
  OPEN: "Journée en cours.",
  FAILED: "Vous n'étiez pas sur la même longueur d'onde aujourd'hui.",
  PARTIAL: "Vous n'étiez pas loin d'être sur la même longueur d'onde.",
  PERFECT: "Vous étiez sur la même longueur d'onde aujourd'hui !",
  INCOMPLETE_ADOPTE_MISSING: "Le jour s'est terminé sans choix de l'autre personne.",
  INCOMPLETE_ADOPTANT_MISSING: "Le jour s'est terminé sans réponse de l'autre personne.",
  NOT_PLAYED: "Cette journée n'a pas été jouée.",
};

// Issue finale d'un jour ÉCHU, à partir des faits persistés.
// adoptantWasPresent : l'Adoptant a montré une activité pendant la fenêtre du
// jour — on ne le pénalise jamais pour une réponse techniquement impossible.
export function computeDayClosure(
  hasChoice: boolean,
  hasGuess: boolean,
  matches: number | null,
  adoptantWasPresent: boolean
): {
  status: Exclude<RefugeDayStatusName, "OPEN">;
  matchCount: number | null;
  adopteCoinsDelta: number;
  adoptantCoinsDelta: number;
} {
  if (hasChoice && hasGuess) {
    const m = matches ?? 0;
    if (m === 2) return { status: "PERFECT", matchCount: 2, adopteCoinsDelta: REFUGE_PERFECT_REWARD, adoptantCoinsDelta: REFUGE_PERFECT_REWARD };
    if (m === 1) return { status: "PARTIAL", matchCount: 1, adopteCoinsDelta: REFUGE_PARTIAL_REWARD, adoptantCoinsDelta: REFUGE_PARTIAL_REWARD };
    return { status: "FAILED", matchCount: 0, adopteCoinsDelta: 0, adoptantCoinsDelta: 0 };
  }
  if (hasChoice && !hasGuess) {
    return {
      status: "INCOMPLETE_ADOPTANT_MISSING",
      matchCount: null,
      adopteCoinsDelta: REFUGE_PARTICIPATION_REWARD,
      adoptantCoinsDelta: -REFUGE_INACTIVITY_PENALTY,
    };
  }
  if (!hasChoice && adoptantWasPresent) {
    return {
      status: "INCOMPLETE_ADOPTE_MISSING",
      matchCount: null,
      adopteCoinsDelta: -REFUGE_INACTIVITY_PENALTY,
      adoptantCoinsDelta: REFUGE_PARTICIPATION_REWARD,
    };
  }
  return { status: "NOT_PLAYED", matchCount: null, adopteCoinsDelta: 0, adoptantCoinsDelta: 0 };
}

// Fenêtre temporelle du jour N d'une session : [startedAt + (N-1)j, startedAt + Nj)
export function dayWindow(startedAt: Date, dayNumber: number): { start: Date; end: Date } {
  const start = new Date(startedAt.getTime() + (dayNumber - 1) * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

// Un jour est COMPLET uniquement quand l'Adopté a validé ses 2 actions
// ET que l'Adoptant a soumis sa réponse pour ce jour.
export function isDayCompleted(
  dailyChoices: { dayNumber: number }[],
  guesses: { dayNumber: number }[],
  dayNumber: number
): boolean {
  if (dayNumber < 1) return false;
  const choiceDone = dailyChoices.some((dc) => dc.dayNumber === dayNumber);
  const guessDone = guesses.some((g) => g.dayNumber === dayNumber);
  return choiceDone && guessDone;
}

// L'Adoptant peut encore tenter aujourd'hui s'il n'a pas déjà soumis sa tentative du jour
export function canAttemptTodayForDay(dayNumber: number, guesses: any[]): boolean {
  if (dayNumber < 1) return false;
  return !guesses.some((g) => g.dayNumber === dayNumber);
}

export function todaySubmittedForDay(dayNumber: number, guesses: any[]): boolean {
  return guesses.some((g) => g.dayNumber === dayNumber);
}

// ============================================================
// DEV MODE - Time Travel (pour tester les 7 jours rapidement)
// ============================================================

export function calculateStartedAtForDay(targetDay: number, now: Date = new Date()): Date {
  if (targetDay < 1 || targetDay > REFUGE_DURATION_DAYS) {
    throw new Error(`Invalid day: ${targetDay}. Must be between 1 and ${REFUGE_DURATION_DAYS}`);
  }

  // Pour observer le jour N maintenant, la session doit avoir démarré il y a (N-1) jours
  const startedAt = new Date(now);
  startedAt.setDate(startedAt.getDate() - (targetDay - 1));
  return startedAt;
}

// ============================================================
// Génération automatique côté backend
// ============================================================

/**
 * Génère un sexe d'animal aléatoire (MALE ou FEMELLE)
 */
export function generateRandomSexe(): RefugeAnimalSexe {
  return Math.random() > 0.5 ? RefugeAnimalSexe.MALE : RefugeAnimalSexe.FEMELLE;
}

/**
 * Mappe un type d'animal à sa catégorie officielle (rareté)
 */
export function generateAnimalCategory(animalType: RefugeAnimalType): RefugeAnimalCategory {
  const categoryMapping: Record<RefugeAnimalType, RefugeAnimalCategory> = {
    [RefugeAnimalType.HAMSTER]: RefugeAnimalCategory.SIMPLE,
    [RefugeAnimalType.LAPIN]: RefugeAnimalCategory.SIMPLE,
    [RefugeAnimalType.CHAT]: RefugeAnimalCategory.SIMPLE,
    [RefugeAnimalType.CHIEN]: RefugeAnimalCategory.SIMPLE,
    [RefugeAnimalType.RENARD]: RefugeAnimalCategory.RARE,
    [RefugeAnimalType.PINGOUIN]: RefugeAnimalCategory.RARE,
    [RefugeAnimalType.IGUANE]: RefugeAnimalCategory.RARE,
    [RefugeAnimalType.PANDA]: RefugeAnimalCategory.EXOTIQUE,
    [RefugeAnimalType.LICORNE]: RefugeAnimalCategory.EXOTIQUE,
    [RefugeAnimalType.DRAGON]: RefugeAnimalCategory.EXOTIQUE,
  };
  return categoryMapping[animalType];
}

/**
 * Retourne la plage d'âge (en mois) pour un type d'animal
 */
function getAgeRangeForAnimalType(animalType: RefugeAnimalType): { min: number; max: number } {
  const ageRanges: Record<RefugeAnimalType, { min: number; max: number }> = {
    [RefugeAnimalType.HAMSTER]: { min: 1, max: 24 },       // ~2 ans max
    [RefugeAnimalType.LAPIN]: { min: 3, max: 84 },         // ~7 ans max
    [RefugeAnimalType.CHAT]: { min: 2, max: 180 },         // ~15 ans max
    [RefugeAnimalType.CHIEN]: { min: 2, max: 144 },        // ~12 ans max
    [RefugeAnimalType.RENARD]: { min: 6, max: 276 },       // ~23 ans
    [RefugeAnimalType.PINGOUIN]: { min: 12, max: 312 },    // ~26 ans
    [RefugeAnimalType.IGUANE]: { min: 6, max: 328 },       // ~27 ans
    [RefugeAnimalType.PANDA]: { min: 12, max: 408 },       // ~34 ans
    [RefugeAnimalType.LICORNE]: { min: 12, max: 1200 },    // ~100 ans (fiction)
    [RefugeAnimalType.DRAGON]: { min: 24, max: 4800 },     // très ancien (fiction)
  };
  return ageRanges[animalType];
}

/**
 * Génère un âge aléatoire (en mois) pour un type d'animal
 */
export function generateRandomAge(animalType: RefugeAnimalType): number {
  const range = getAgeRangeForAnimalType(animalType);
  return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
}

/**
 * Génère 2 actions distinctes aléatoires pour le jour
 */
export function generateRandomDailyActions(): [RefugeAction, RefugeAction] {
  const allActions: RefugeAction[] = [RefugeAction.NOURRIR, RefugeAction.JOUER, RefugeAction.CARESSER, RefugeAction.LAVER];

  // Sélectionner 2 indices aléatoires distincts
  const idx1 = Math.floor(Math.random() * allActions.length);
  let idx2 = Math.floor(Math.random() * allActions.length);
  while (idx2 === idx1) {
    idx2 = Math.floor(Math.random() * allActions.length);
  }

  return [allActions[idx1]!, allActions[idx2]!];
}

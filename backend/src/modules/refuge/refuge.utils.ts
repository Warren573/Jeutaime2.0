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
  currentDay: number
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
      // Both choice and guess exist - check if they match (in either order)
      const guessMatches =
        (guess.guessedAction1 === dailyChoice.action1 && guess.guessedAction2 === dailyChoice.action2) ||
        (guess.guessedAction1 === dailyChoice.action2 && guess.guessedAction2 === dailyChoice.action1);
      hearts.push(guessMatches ? "❤️" : "❌");
    }
  }

  return hearts;
}

export function canAttemptTodayForDay(dayNumber: number, dailyChoices: any[]): boolean {
  return !dailyChoices.some((dc) => dc.dayNumber === dayNumber);
}

export function todaySubmittedForDay(dayNumber: number, guesses: any[]): boolean {
  return guesses.some((g) => g.dayNumber === dayNumber);
}

// ============================================================
// DEV MODE - Time Travel (pour tester les 7 jours rapidement)
// ============================================================

export function calculateStartedAtForDay(createdAt: Date, targetDay: number): Date {
  if (targetDay < 1 || targetDay > REFUGE_DURATION_DAYS) {
    throw new Error(`Invalid day: ${targetDay}. Must be between 1 and ${REFUGE_DURATION_DAYS}`);
  }

  // Pour le jour N, on simule que la session a démarré (N-1) jours ago
  const daysAgo = targetDay - 1;
  const startedAt = new Date(createdAt);
  startedAt.setDate(startedAt.getDate() + daysAgo);
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

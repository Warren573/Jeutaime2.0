import { RefugeAction, RefugeSessionStatus } from "@prisma/client";
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

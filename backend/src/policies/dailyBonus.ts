/**
 * Logique pure pour le daily bonus.
 * 1 bonus maximum par jour calendaire UTC. Déterministe et testable.
 */
import { DAILY_BONUS_FREE, DAILY_BONUS_PREMIUM } from "../config/constants";

export type DailyBonusDeniedReason = "ALREADY_CLAIMED_TODAY";

export interface DailyBonusCheck {
  allowed: boolean;
  reason: DailyBonusDeniedReason | null;
}

/**
 * Compare deux dates au jour calendaire UTC près.
 * Pure, sans dépendance timezone — la règle « 1 fois par jour » est
 * fixée par jour UTC pour garantir que tous les users expérimentent
 * la même fenêtre de reset (00:00 UTC).
 */
export function isSameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

/**
 * Détermine si l'utilisateur peut réclamer son bonus quotidien.
 * - Jamais réclamé (lastBonusAt === null) → autorisé
 * - Dernier claim sur un jour UTC antérieur → autorisé
 * - Dernier claim dans le même jour UTC que `now` → refusé
 */
export function canClaimDailyBonus(
  lastBonusAt: Date | null,
  now: Date = new Date(),
): DailyBonusCheck {
  if (lastBonusAt === null) {
    return { allowed: true, reason: null };
  }
  if (isSameUtcDay(lastBonusAt, now)) {
    return { allowed: false, reason: "ALREADY_CLAIMED_TODAY" };
  }
  return { allowed: true, reason: null };
}

/**
 * Montant du bonus selon le statut Premium.
 */
export function getDailyBonusAmount(isPremium: boolean): number {
  return isPremium ? DAILY_BONUS_PREMIUM : DAILY_BONUS_FREE;
}

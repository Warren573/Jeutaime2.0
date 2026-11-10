/**
 * Règles validées des publicités récompensées (logique pure, testable).
 *
 * - +10 pièces par publicité visionnée ET validée par le serveur du réseau.
 * - 5 récompenses maximum par jour calendaire UTC (même fenêtre que le bonus quotidien).
 */
export const AD_REWARD_COINS = 10;
export const AD_REWARD_DAILY_MAX = 5;

/** Une validation serveur plus ancienne que ce délai est refusée (anti-rejeu). */
export const AD_REWARD_MAX_AGE_MS = 60 * 60 * 1000;

/** Clé de jour UTC : AAAA-MM-JJ. */
export function adRewardDayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function remainingAdRewards(claimedToday: number): number {
  return Math.max(0, AD_REWARD_DAILY_MAX - Math.max(0, claimedToday));
}

export function canClaimAdReward(claimedToday: number): boolean {
  return remainingAdRewards(claimedToday) > 0;
}

import { CoinTxnType, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import {
  AD_REWARD_COINS,
  AD_REWARD_DAILY_MAX,
  adRewardDayKey,
  canClaimAdReward,
  remainingAdRewards,
} from "../../policies/adRewards";
import type { VerifiedAdReward } from "./admobSsv";

export type AdRewardOutcome =
  | { status: "granted"; coins: number; balance: number; remainingToday: number }
  | { status: "already_granted" }
  | { status: "daily_limit" }
  | { status: "unknown_user" };

/**
 * Crédite UNE récompense publicitaire déjà vérifiée (signature du réseau).
 *
 * - Idempotent : une même transaction du réseau ne crédite qu'une fois.
 * - Plafond quotidien appliqué sous verrou du portefeuille : des validations
 *   simultanées ne peuvent pas dépasser 5 récompenses par jour.
 * - Jamais appelée avec des données venant de l'application mobile.
 */
export async function grantVerifiedAdReward(
  reward: VerifiedAdReward,
  now: Date = new Date(),
): Promise<AdRewardOutcome> {
  const dayKey = adRewardDayKey(now);

  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: reward.userId },
        select: { id: true, isBanned: true },
      });
      if (!user || user.isBanned) return { status: "unknown_user" as const };

      // Sérialise toutes les récompenses et dépenses de ce portefeuille.
      const locked = await tx.$queryRaw<Array<{ userId: string }>>`
        SELECT "userId" FROM "Wallet" WHERE "userId" = ${user.id} FOR UPDATE`;
      if (locked.length === 0) return { status: "unknown_user" as const };

      const existing = await tx.adRewardClaim.findUnique({
        where: {
          provider_transactionId: { provider: reward.provider, transactionId: reward.transactionId },
        },
        select: { id: true },
      });
      if (existing) return { status: "already_granted" as const };

      const claimedToday = await tx.adRewardClaim.count({ where: { userId: user.id, dayKey } });
      if (!canClaimAdReward(claimedToday)) return { status: "daily_limit" as const };

      await tx.adRewardClaim.create({
        data: {
          userId: user.id,
          provider: reward.provider,
          transactionId: reward.transactionId,
          adUnit: reward.adUnit,
          dayKey,
          amount: AD_REWARD_COINS,
        },
      });
      const wallet = await tx.wallet.update({
        where: { userId: user.id },
        data: { coins: { increment: AD_REWARD_COINS } },
        select: { coins: true },
      });
      await tx.coinTransaction.create({
        data: {
          walletId: user.id,
          type: CoinTxnType.AD_REWARD,
          amount: AD_REWARD_COINS,
          balance: wallet.coins,
          meta: {
            provider: reward.provider,
            transactionId: reward.transactionId,
            dayKey,
          } as Prisma.InputJsonValue,
        },
      });

      return {
        status: "granted" as const,
        coins: AD_REWARD_COINS,
        balance: wallet.coins,
        remainingToday: remainingAdRewards(claimedToday + 1),
      };
    });
  } catch (error) {
    // Deux livraisons de la même transaction pour deux comptes différents :
    // l'index unique refuse la seconde.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { status: "already_granted" };
    }
    throw error;
  }
}

export async function getRewardedAdStatus(userId: string, enabled: boolean, now: Date = new Date()) {
  const claimedToday = enabled
    ? await prisma.adRewardClaim.count({ where: { userId, dayKey: adRewardDayKey(now) } })
    : 0;
  return {
    enabled,
    rewardCoins: AD_REWARD_COINS,
    dailyMax: AD_REWARD_DAILY_MAX,
    claimedToday,
    remainingToday: enabled ? remainingAdRewards(claimedToday) : 0,
  };
}

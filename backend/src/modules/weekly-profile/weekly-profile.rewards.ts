/** Prime hebdomadaire : 50 pièces pour chacun des gagnants Homme et Femme.
 * Une seule attribution par semaine et par profil, protégée par verrou de Wallet.
 * Les sessions sans gagnant ne déclenchent aucun crédit.
 */
import { CoinTxnType, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { getWeeklyProfileWinners } from "./weekly-profile.service";

export async function awardPreviousWeekWinners(): Promise<number> {
  const winners = await getWeeklyProfileWinners();
  let awarded = 0;
  for (const [category, winner] of [["male", winners.male], ["female", winners.female]] as const) {
    if (!winner) continue;
    await prisma.$transaction(async tx => {
      // La ligne du portefeuille sérialise les attributions concurrentes au même compte.
      const lock = await tx.$queryRaw<Array<{ userId: string }>>`
        SELECT "userId" FROM "Wallet" WHERE "userId" = ${winner.id} FOR UPDATE
      `;
      if (!lock.length) return;
      const existing = await tx.coinTransaction.findMany({
        where: { walletId: winner.id, type: CoinTxnType.ADMIN_ADJUST },
        select: { meta: true },
      });
      if (existing.some(row => {
        const m = row.meta;
        return m !== null && typeof m === "object" && !Array.isArray(m)
          && m["source"] === "weekly_profile_winner"
          && m["weekKey"] === winners.weekKey
          && m["category"] === category;
      })) return;
      const wallet = await tx.wallet.update({
        where: { userId: winner.id },
        data: { coins: { increment: 50 } },
        select: { coins: true },
      });
      await tx.coinTransaction.create({
        data: {
          walletId: winner.id,
          type: CoinTxnType.ADMIN_ADJUST,
          amount: 50,
          balance: wallet.coins,
          meta: {
            source: "weekly_profile_winner",
            weekKey: winners.weekKey,
            category,
            totalVotes: winner.totalVotes,
          } as Prisma.InputJsonValue,
        },
      });
      awarded++;
    });
  }
  return awarded;
}

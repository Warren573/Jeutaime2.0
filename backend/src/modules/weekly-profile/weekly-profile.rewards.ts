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
      // Verrou par semaine et catégorie : évite deux gagnants crédités si le classement change.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${winners.weekKey + ":" + category}))::text AS lock_result`;
      // La ligne du portefeuille sérialise aussi les versements concurrents au même compte.
      const lock = await tx.$queryRaw<Array<{ userId: string }>>`
        SELECT "userId" FROM "Wallet" WHERE "userId" = ${winner.id} FOR UPDATE
      `;
      if (!lock.length) return;
      // Un identifiant unique en base garantit au maximum une prime par semaine/catégorie,
      // indépendamment du nombre de gagnants successifs ou de jobs concurrents.
      const payoutId = `weekly-profile-winner:${winners.weekKey}:${category}`;
      const existing = await tx.coinTransaction.findUnique({
        where: { id: payoutId }, select: { id: true },
      });
      if (existing) return;
      const wallet = await tx.wallet.update({
        where: { userId: winner.id },
        data: { coins: { increment: 50 } },
        select: { coins: true },
      });
      await tx.coinTransaction.create({
        data: {
          id: payoutId,
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

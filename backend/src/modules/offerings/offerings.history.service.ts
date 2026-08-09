import { prisma } from "../../config/prisma";
import { toSentDto, type OfferingSentDto } from "./offerings.service";

const SIX_MONTHS_MS = 183 * 24 * 60 * 60 * 1000;

/**
 * Historique personnel du Bureau d'Offrandes.
 * Contrairement à /received?onlyActive=false, l'historique conserve aussi
 * les offrandes expirées ou entièrement consommées pendant six mois.
 */
export async function listOfferingHistory(
  userId: string,
  now: Date = new Date(),
): Promise<OfferingSentDto[]> {
  const cutoff = new Date(now.getTime() - SIX_MONTHS_MS);

  const rows = await prisma.offeringSent.findMany({
    where: {
      toUserId: userId,
      createdAt: { gte: cutoff },
    },
    include: { offering: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 200,
  });

  return rows.map((row) => toSentDto(row, now));
}

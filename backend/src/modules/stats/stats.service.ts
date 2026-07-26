import { prisma } from "../../config/prisma";

export interface CommunityStatsDto {
  matchesToday: number;
  lettersSent: number;
  giftsSent: number;
  activeMembers: number;
}

// Chiffres réels de la communauté (affichés dans le Journal) — aucune
// donnée fictive.
export async function getCommunityStats(): Promise<CommunityStatsDto> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [matchesToday, lettersSent, giftsSent, activeMembers] = await Promise.all([
    prisma.match.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.letter.count(),
    prisma.offeringSent.count(),
    prisma.user.count({ where: { lastLoginAt: { gte: sevenDaysAgo } } }),
  ]);

  return { matchesToday, lettersSent, giftsSent, activeMembers };
}

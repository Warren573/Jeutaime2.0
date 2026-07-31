import { prisma } from "../../config/prisma";

export interface CommunityStatsDto {
  matchesToday: number;
  lettersSent: number;
  giftsSent: number;
  activeMembers: number;
}

export interface DailyStatsDto {
  matchesToday: number;
  bottlesSentToday: number;
  smilesSentToday: number;
  grimacesSentToday: number;
  offeringsSentToday: number;
  duelsPlayedToday: number;
  lettersSentToday: number;
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

// Statistiques complètes du jour pour le Journal
export async function getDailyStats(): Promise<DailyStatsDto> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    matchesToday,
    bottlesSentToday,
    smilesSentToday,
    grimacesSentToday,
    offeringsSentToday,
    duelsPlayedToday,
    lettersSentToday,
  ] = await Promise.all([
    prisma.match.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.messageInABottle.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.reaction.count({ where: { type: "SMILE", createdAt: { gte: startOfDay } } }),
    prisma.reaction.count({ where: { type: "GRIMACE", createdAt: { gte: startOfDay } } }),
    prisma.offeringSent.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.weeklyProfileDuel.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.letter.count({ where: { sentAt: { gte: startOfDay } } }),
  ]);

  return {
    matchesToday,
    bottlesSentToday,
    smilesSentToday,
    grimacesSentToday,
    offeringsSentToday,
    duelsPlayedToday,
    lettersSentToday,
  };
}

export interface RefugeStatsDto {
  activeRefuges: number;
  awaitingReveal: number;
  completedRefuges: number;
}

// Statistiques du Refuge pour le Journal
export async function getRefugeStats(): Promise<RefugeStatsDto> {
  const [activeRefuges, awaitingReveal, completedRefuges] = await Promise.all([
    prisma.refugeSession.count({ where: { status: "ACTIVE" } }),
    prisma.refugeSession.count({ where: { status: "AWAITING_REVEAL_CONSENT" } }),
    prisma.refugeSession.count({ where: { status: { in: ["COMPLETED", "REVEALED"] } } }),
  ]);

  return {
    activeRefuges,
    awaitingReveal,
    completedRefuges,
  };
}

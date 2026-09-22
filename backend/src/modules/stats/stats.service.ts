import { prisma } from "../../config/prisma";

export interface CommunityStatsDto {
  matchesToday: number;
  lettersSent: number;
  giftsSent: number;
  activeMembers: number;
  registrationsToday: number;
  activeToday: number;
  registrations7d: number;
  active7d: number;
}

export interface DailyStatsDto {
  matchesToday: number;
  bottlesSentToday: number;
  smilesSentToday: number;
  grimacesSentToday: number;
  offeringsSentToday: number;
  duelsPlayedToday: number;
  duelsResolvedToday: number;
  duelsDeclinedToday: number;
  duelsExpiredToday: number;
  lettersSentToday: number;
  registrationsToday: number;
  activeToday: number;
  registrations7d: number;
  active7d: number;
}

// Chiffres réels de la communauté (affichés dans le Journal) — aucune
// donnée fictive.
export async function getCommunityStats(): Promise<CommunityStatsDto> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    matchesToday,
    lettersSent,
    giftsSent,
    activeMembers,
    registrationsToday,
    activeToday,
    registrations7d,
    active7d,
  ] = await Promise.all([
    prisma.match.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.letter.count(),
    prisma.offeringSent.count(),
    prisma.user.count({ where: { lastLoginAt: { gte: sevenDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.user.count({ where: { lastLoginAt: { gte: startOfDay } } }),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.user.count({ where: { lastLoginAt: { gte: sevenDaysAgo } } }),
  ]);

  return {
    matchesToday,
    lettersSent,
    giftsSent,
    activeMembers,
    registrationsToday,
    activeToday,
    registrations7d,
    active7d,
  };
}

// Statistiques complètes du jour pour le Journal
export async function getDailyStats(): Promise<DailyStatsDto> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    matchesToday,
    bottlesSentToday,
    smilesSentToday,
    grimacesSentToday,
    offeringsSentToday,
    duelsPlayedToday,
    duelsResolvedToday,
    duelsDeclinedToday,
    duelsExpiredToday,
    lettersSentToday,
    registrationsToday,
    activeToday,
    registrations7d,
    active7d,
  ] = await Promise.all([
    prisma.match.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.messageInABottle.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.reaction.count({ where: { type: "SMILE", createdAt: { gte: startOfDay } } }),
    prisma.reaction.count({ where: { type: "GRIMACE", createdAt: { gte: startOfDay } } }),
    prisma.offeringSent.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.privateDuel.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.privateDuel.count({ where: { status: "RESOLVED", resolvedAt: { gte: startOfDay } } }),
    prisma.privateDuel.count({ where: { status: "CANCELLED", declinedAt: { gte: startOfDay } } }),
    prisma.privateDuel.count({ where: { status: "EXPIRED", updatedAt: { gte: startOfDay } } }),
    prisma.letter.count({ where: { sentAt: { gte: startOfDay } } }),
    prisma.user.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.user.count({ where: { lastLoginAt: { gte: startOfDay } } }),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.user.count({ where: { lastLoginAt: { gte: sevenDaysAgo } } }),
  ]);

  return {
    matchesToday,
    bottlesSentToday,
    smilesSentToday,
    grimacesSentToday,
    offeringsSentToday,
    duelsPlayedToday,
    duelsResolvedToday,
    duelsDeclinedToday,
    duelsExpiredToday,
    lettersSentToday,
    registrationsToday,
    activeToday,
    registrations7d,
    active7d,
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

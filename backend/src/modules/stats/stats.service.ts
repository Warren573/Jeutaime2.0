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
  petsAdoptedToday: number;
  duelsPlayedToday: number;
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
    petsAdoptedToday,
    duelsPlayedToday,
  ] = await Promise.all([
    prisma.match.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.messageInABottle.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.reaction.count({ where: { type: "SMILE", createdAt: { gte: startOfDay } } }),
    prisma.reaction.count({ where: { type: "GRIMACE", createdAt: { gte: startOfDay } } }),
    prisma.offeringSent.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.pet.count({ where: { adoptedAt: { gte: startOfDay } } }),
    prisma.weeklyProfileDuel.count({ where: { createdAt: { gte: startOfDay } } }),
  ]);

  return {
    matchesToday,
    bottlesSentToday,
    smilesSentToday,
    grimacesSentToday,
    offeringsSentToday,
    petsAdoptedToday,
    duelsPlayedToday,
  };
}

export interface RefugeStatsDto {
  totalPets: number;
  petsInRefuge: number;
  petsAdopted: number;
  petsAwaitingReveal: number;
}

// Statistiques du Refuge pour le Journal
export async function getRefugeStats(): Promise<RefugeStatsDto> {
  const [totalPets, petsAdopted, petsAwaitingReveal] = await Promise.all([
    prisma.pet.count(),
    prisma.pet.count({ where: { adoptedAt: { not: null } } }),
    prisma.refugeSession.count({ where: { status: "WAITING_FOR_REVEAL" } }),
  ]);

  const petsInRefuge = totalPets - petsAdopted;

  return {
    totalPets,
    petsInRefuge,
    petsAdopted,
    petsAwaitingReveal,
  };
}

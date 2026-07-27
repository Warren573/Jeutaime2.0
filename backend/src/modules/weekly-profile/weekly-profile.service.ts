import { CoinTxnType, Gender, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { BadRequestError, ConflictError, NotFoundError } from "../../core/errors";
import { computeCreditBalance } from "../../policies/wallet";

const VOTE_REWARD = 5;
const DAILY_LIMIT_FREE = 10;
const DAILY_LIMIT_PREMIUM = 20;

export interface DuelProfileDto {
  id: string;
  pseudo: string;
  age: number;
  city: string;
  bio: string | null;
}

export interface DuelDto {
  candidateA: DuelProfileDto;
  candidateB: DuelProfileDto;
}

export interface WeeklyProfileStateDto {
  remainingToday: number;
  dailyLimit: number;
  limitReached: boolean;
  notEnoughCandidates: boolean;
  duel: DuelDto | null;
}

export interface WeeklyProfileWinnerDto {
  id: string;
  pseudo: string;
  age: number;
  city: string;
  bio: string | null;
  gender: Gender;
  totalVotes: number;
  weekKey: string;
}

export interface WeeklyProfileWinnersDto {
  weekKey: string;
  male: WeeklyProfileWinnerDto | null;
  female: WeeklyProfileWinnerDto | null;
}

// Semaine ISO (ex. "2026-W30") — stable pour tout le monde, change chaque
// lundi. Sert à comptabiliser les votes lundi→dimanche et à en déduire
// automatiquement les gagnant·e·s de la semaine précédente (pas besoin de
// job planifié : le calcul se fait à la demande sur weekKey précédent).
export function getWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // lundi = 0
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // jeudi de cette semaine ISO
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const weekNum =
    1 +
    Math.round(
      ((d.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7,
    );
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function getPreviousWeekKey(now: Date): string {
  const prev = new Date(now);
  prev.setUTCDate(prev.getUTCDate() - 7);
  return getWeekKey(prev);
}

// Jour UTC ("2026-07-27") — sert à borner les votes/jour (10 gratuit, 20 Premium).
function getDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function computeAge(birthDate: Date): number {
  const now = new Date();
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - birthDate.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < birthDate.getUTCDate())) {
    age--;
  }
  return age;
}

function dailyLimitFor(isPremium: boolean): number {
  return isPremium ? DAILY_LIMIT_PREMIUM : DAILY_LIMIT_FREE;
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("::");
}

interface EligibleProfile {
  id: string;
  pseudo: string;
  city: string;
  bio: string | null;
  gender: Gender;
  birthDate: Date;
}

async function getEligibleProfiles(excludeUserId: string): Promise<EligibleProfile[]> {
  const users = await prisma.user.findMany({
    where: {
      id: { not: excludeUserId },
      isBanned: false,
      profile: { isNot: null },
      OR: [{ settings: null }, { settings: { showInDiscovery: true } }],
    },
    select: { id: true, profile: true },
  });

  return users
    .filter(u => u.profile)
    .map(u => ({
      id: u.id,
      pseudo: u.profile!.pseudo,
      city: u.profile!.city,
      bio: u.profile!.bio,
      gender: u.profile!.gender,
      birthDate: u.profile!.birthDate,
    }));
}

function toDuelProfileDto(p: EligibleProfile): DuelProfileDto {
  return { id: p.id, pseudo: p.pseudo, age: computeAge(p.birthDate), city: p.city, bio: p.bio };
}

// Choisit 2 profils anonymes pour le votant :
//  - jamais son propre profil (déjà exclu par getEligibleProfiles)
//  - jamais deux fois exactement le même duel
//  - priorité aux profils pas encore vus par ce votant, tant qu'il en reste ≥ 2
//  - équilibre l'exposition globale (profils les moins montrés en premier)
async function selectDuel(voterId: string): Promise<DuelDto | null> {
  const eligible = await getEligibleProfiles(voterId);
  if (eligible.length < 2) return null;

  const pastVotes = await prisma.weeklyProfileVote.findMany({
    where: { voterId },
    select: { candidateAId: true, candidateBId: true },
  });

  const seenProfileIds = new Set<string>();
  const seenPairs = new Set<string>();
  for (const v of pastVotes) {
    seenProfileIds.add(v.candidateAId);
    seenProfileIds.add(v.candidateBId);
    seenPairs.add(pairKey(v.candidateAId, v.candidateBId));
  }

  const eligibleIds = eligible.map(p => p.id);
  const [exposureA, exposureB] = await Promise.all([
    prisma.weeklyProfileVote.groupBy({
      by: ["candidateAId"],
      where: { candidateAId: { in: eligibleIds } },
      _count: { candidateAId: true },
    }),
    prisma.weeklyProfileVote.groupBy({
      by: ["candidateBId"],
      where: { candidateBId: { in: eligibleIds } },
      _count: { candidateBId: true },
    }),
  ]);

  const exposure = new Map<string, number>();
  for (const e of exposureA) exposure.set(e.candidateAId, (exposure.get(e.candidateAId) ?? 0) + e._count.candidateAId);
  for (const e of exposureB) exposure.set(e.candidateBId, (exposure.get(e.candidateBId) ?? 0) + e._count.candidateBId);

  const unseen = eligible.filter(p => !seenProfileIds.has(p.id));
  const pool = unseen.length >= 2 ? unseen : eligible;

  // Tri : exposition croissante (équilibrage), jitter aléatoire pour ne pas
  // toujours proposer le même ordre entre profils à exposition égale.
  const ranked = [...pool].sort((a, b) => {
    const diff = (exposure.get(a.id) ?? 0) - (exposure.get(b.id) ?? 0);
    if (diff !== 0) return diff;
    return Math.random() - 0.5;
  });

  const candidateA = ranked[0];
  if (!candidateA) return null;
  let candidateB = ranked.find(p => p.id !== candidateA.id && !seenPairs.has(pairKey(candidateA.id, p.id)));
  if (!candidateB) {
    // Dernier recours (pool minuscule) : accepte un duel déjà vu plutôt que
    // de n'en proposer aucun.
    candidateB = ranked.find(p => p.id !== candidateA.id);
  }
  if (!candidateB) return null;

  return { candidateA: toDuelProfileDto(candidateA), candidateB: toDuelProfileDto(candidateB) };
}

export async function getWeeklyProfileState(
  voterId: string,
  isPremium: boolean,
): Promise<WeeklyProfileStateDto> {
  const now = new Date();
  const dayKey = getDayKey(now);
  const dailyLimit = dailyLimitFor(isPremium);

  const votesToday = await prisma.weeklyProfileVote.count({
    where: { voterId, dayKey },
  });
  const remainingToday = Math.max(0, dailyLimit - votesToday);

  if (remainingToday <= 0) {
    return { remainingToday: 0, dailyLimit, limitReached: true, notEnoughCandidates: false, duel: null };
  }

  const duel = await selectDuel(voterId);
  return {
    remainingToday,
    dailyLimit,
    limitReached: false,
    notEnoughCandidates: duel === null,
    duel,
  };
}

export async function voteForDuel(
  voterId: string,
  isPremium: boolean,
  candidateAId: string,
  candidateBId: string,
  chosenId: string,
): Promise<WeeklyProfileStateDto> {
  if (candidateAId === candidateBId) {
    throw new BadRequestError("Duel invalide");
  }
  if (chosenId !== candidateAId && chosenId !== candidateBId) {
    throw new BadRequestError("Le profil choisi ne fait pas partie de ce duel");
  }
  if (candidateAId === voterId || candidateBId === voterId) {
    throw new BadRequestError("Tu ne peux pas voter pour toi-même");
  }

  const now = new Date();
  const dayKey = getDayKey(now);
  const weekKey = getWeekKey(now);
  const dailyLimit = dailyLimitFor(isPremium);

  const votesToday = await prisma.weeklyProfileVote.count({
    where: { voterId, dayKey },
  });
  if (votesToday >= dailyLimit) {
    throw new ConflictError("Limite quotidienne de votes atteinte");
  }

  const wallet = await prisma.wallet.findUnique({ where: { userId: voterId } });
  if (!wallet) {
    throw new NotFoundError("Wallet");
  }

  const newBalance = computeCreditBalance(wallet.coins, VOTE_REWARD);

  await prisma.$transaction(async tx => {
    await tx.weeklyProfileVote.create({
      data: { voterId, candidateAId, candidateBId, chosenId, weekKey, dayKey },
    });

    await tx.wallet.update({
      where: { userId: voterId },
      data: { coins: newBalance },
    });

    await tx.coinTransaction.create({
      data: {
        walletId: voterId,
        type: CoinTxnType.WEEKLY_PROFILE_VOTE,
        amount: VOTE_REWARD,
        balance: newBalance,
        meta: { candidateAId, candidateBId, chosenId, weekKey } as Prisma.InputJsonValue,
      },
    });
  });

  return getWeeklyProfileState(voterId, isPremium);
}

export async function getWeeklyProfileWinners(): Promise<WeeklyProfileWinnersDto> {
  const now = new Date();
  const weekKey = getPreviousWeekKey(now);

  const votes = await prisma.weeklyProfileVote.groupBy({
    by: ["chosenId"],
    where: { weekKey },
    _count: { chosenId: true },
  });

  if (votes.length === 0) {
    return { weekKey, male: null, female: null };
  }

  const candidateIds = votes.map(v => v.chosenId);
  const users = await prisma.user.findMany({
    where: { id: { in: candidateIds } },
    select: { id: true, profile: true },
  });

  const voteMap = new Map(votes.map(v => [v.chosenId, v._count.chosenId]));
  const byGender: Record<string, WeeklyProfileWinnerDto> = {};

  for (const u of users) {
    if (!u.profile) continue;
    const totalVotes = voteMap.get(u.id) ?? 0;
    const existing = byGender[u.profile.gender];
    if (!existing || totalVotes > existing.totalVotes) {
      byGender[u.profile.gender] = {
        id: u.id,
        pseudo: u.profile.pseudo,
        age: computeAge(u.profile.birthDate),
        city: u.profile.city,
        bio: u.profile.bio,
        gender: u.profile.gender,
        totalVotes,
        weekKey,
      };
    }
  }

  return {
    weekKey,
    male: byGender[Gender.HOMME] ?? null,
    female: byGender[Gender.FEMME] ?? null,
  };
}

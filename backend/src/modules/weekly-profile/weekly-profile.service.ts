import { CoinTxnType, Gender, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { BadRequestError, ConflictError, NotFoundError } from "../../core/errors";
import { computeDebitBalance } from "../../policies/wallet";

const VOTE_COST = 5;
const CANDIDATES_PER_WEEK = 6;

export interface WeeklyProfileCandidateDto {
  id: string;
  pseudo: string;
  age: number;
  city: string;
  gender: Gender;
  bio: string | null;
  avatarConfig: unknown;
  votes: number;
}

export interface WeeklyProfileWinnerDto extends WeeklyProfileCandidateDto {
  weekKey: string;
}

export interface WeeklyProfileDto {
  weekKey: string;
  candidates: WeeklyProfileCandidateDto[];
  votedCandidateId: string | null;
  winners: { male: WeeklyProfileWinnerDto | null; female: WeeklyProfileWinnerDto | null };
}

// Semaine ISO (ex. "2026-W30"), stable pour tous les utilisateurs.
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

function computeAge(birthDate: Date): number {
  const now = new Date();
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - birthDate.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < birthDate.getUTCDate())) {
    age--;
  }
  return age;
}

// Hash déterministe simple (FNV-1a) — sert à choisir les candidats de la
// semaine de façon stable (même liste pour tout le monde, change chaque
// semaine) sans avoir besoin d'une table de curation séparée.
function seededHash(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

async function selectCandidateIds(weekKey: string): Promise<string[]> {
  const eligible = await prisma.user.findMany({
    where: {
      isBanned: false,
      profile: { isNot: null },
      OR: [{ settings: null }, { settings: { showInDiscovery: true } }],
    },
    select: { id: true },
  });

  return eligible
    .map(u => ({ id: u.id, hash: seededHash(`${weekKey}:${u.id}`) }))
    .sort((a, b) => a.hash - b.hash)
    .slice(0, CANDIDATES_PER_WEEK)
    .map(c => c.id);
}

async function buildCandidateDtos(
  userIds: string[],
  weekKey: string,
): Promise<WeeklyProfileCandidateDto[]> {
  if (userIds.length === 0) return [];

  const [users, voteCounts] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, profile: true },
    }),
    prisma.weeklyProfileVote.groupBy({
      by: ["candidateId"],
      where: { candidateId: { in: userIds }, weekKey },
      _count: { candidateId: true },
    }),
  ]);

  const voteMap = new Map(voteCounts.map(v => [v.candidateId, v._count.candidateId]));

  return users
    .filter(u => u.profile)
    .map(u => ({
      id: u.id,
      pseudo: u.profile!.pseudo,
      age: computeAge(u.profile!.birthDate),
      city: u.profile!.city,
      gender: u.profile!.gender,
      bio: u.profile!.bio,
      avatarConfig: u.profile!.avatarConfig,
      votes: voteMap.get(u.id) ?? 0,
    }))
    .sort((a, b) => b.votes - a.votes);
}

async function getWinnersForWeek(
  weekKey: string,
): Promise<{ male: WeeklyProfileWinnerDto | null; female: WeeklyProfileWinnerDto | null }> {
  const votes = await prisma.weeklyProfileVote.groupBy({
    by: ["candidateId"],
    where: { weekKey },
    _count: { candidateId: true },
  });

  if (votes.length === 0) return { male: null, female: null };

  const candidateIds = votes.map(v => v.candidateId);
  const users = await prisma.user.findMany({
    where: { id: { in: candidateIds } },
    select: { id: true, profile: true },
  });

  const voteMap = new Map(votes.map(v => [v.candidateId, v._count.candidateId]));
  const byGender: Record<string, WeeklyProfileWinnerDto> = {};

  for (const u of users) {
    if (!u.profile) continue;
    const count = voteMap.get(u.id) ?? 0;
    const existing = byGender[u.profile.gender];
    if (!existing || count > existing.votes) {
      byGender[u.profile.gender] = {
        id: u.id,
        pseudo: u.profile.pseudo,
        age: computeAge(u.profile.birthDate),
        city: u.profile.city,
        gender: u.profile.gender,
        bio: u.profile.bio,
        avatarConfig: u.profile.avatarConfig,
        votes: count,
        weekKey,
      };
    }
  }

  return {
    male: byGender[Gender.HOMME] ?? null,
    female: byGender[Gender.FEMME] ?? null,
  };
}

export async function getWeeklyProfileData(userId: string): Promise<WeeklyProfileDto> {
  const now = new Date();
  const weekKey = getWeekKey(now);
  const previousWeekKey = getPreviousWeekKey(now);

  const [candidateIds, myVote, winners] = await Promise.all([
    selectCandidateIds(weekKey),
    prisma.weeklyProfileVote.findUnique({
      where: { voterId_weekKey: { voterId: userId, weekKey } },
    }),
    getWinnersForWeek(previousWeekKey),
  ]);

  const candidates = await buildCandidateDtos(candidateIds, weekKey);

  return {
    weekKey,
    candidates,
    votedCandidateId: myVote?.candidateId ?? null,
    winners,
  };
}

export async function voteForCandidate(
  voterId: string,
  candidateId: string,
): Promise<WeeklyProfileDto> {
  if (voterId === candidateId) {
    throw new BadRequestError("Tu ne peux pas voter pour toi-même");
  }

  const weekKey = getWeekKey(new Date());
  const candidateIds = await selectCandidateIds(weekKey);
  if (!candidateIds.includes(candidateId)) {
    throw new BadRequestError("Ce profil ne fait pas partie des candidats de cette semaine");
  }

  const existingVote = await prisma.weeklyProfileVote.findUnique({
    where: { voterId_weekKey: { voterId, weekKey } },
  });
  if (existingVote) {
    throw new ConflictError("Tu as déjà voté cette semaine");
  }

  const wallet = await prisma.wallet.findUnique({ where: { userId: voterId } });
  if (!wallet) {
    throw new NotFoundError("Wallet");
  }

  const newBalance = computeDebitBalance(wallet.coins, VOTE_COST);

  await prisma.$transaction(async tx => {
    await tx.wallet.update({
      where: { userId: voterId },
      data: { coins: newBalance },
    });

    await tx.coinTransaction.create({
      data: {
        walletId: voterId,
        type: CoinTxnType.WEEKLY_PROFILE_VOTE,
        amount: -VOTE_COST,
        balance: newBalance,
        meta: { candidateId, weekKey } as Prisma.InputJsonValue,
      },
    });

    await tx.weeklyProfileVote.create({
      data: { voterId, candidateId, weekKey },
    });
  });

  return getWeeklyProfileData(voterId);
}

import { CoinTxnType, Gender, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../../core/errors";
import { computeCreditBalance } from "../../policies/wallet";
import { computeProfileStatus } from "../../policies/profiles";

const VOTE_REWARD = 5;
const DAILY_LIMIT_FREE = 10;
const DAILY_LIMIT_PREMIUM = 20;

// Durée de vie d'un duel non voté. Passé ce délai, il est ignoré (traité
// comme expiré) et un nouveau duel est généré à la prochaine consultation.
const DUEL_TTL_MS = 15 * 60 * 1000;

export interface DuelProfileDto {
  id: string;
  pseudo: string;
  age: number;
  city: string;
  bio: string | null;
}

export interface DuelDto {
  duelId: string;
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

const ELIGIBILITY_SELECT = {
  id: true,
  isBanned: true,
  settings: { select: { showInDiscovery: true } },
  profile: {
    select: {
      pseudo: true,
      city: true,
      bio: true,
      gender: true,
      birthDate: true,
      interestedIn: true,
      lookingFor: true,
      physicalDesc: true,
      height: true,
      vibe: true,
      quote: true,
      questions: true,
    },
  },
} satisfies Prisma.UserSelect;

type EligibilityUser = Prisma.UserGetPayload<{ select: typeof ELIGIBILITY_SELECT }>;
type EligibleUser = EligibilityUser & { profile: NonNullable<EligibilityUser["profile"]> };

// Un profil est éligible (proposable en duel, ou vainqueur possible) s'il a
// une bio non vide, un profil complet au sens des règles existantes de
// l'app (computeProfileStatus), et n'est ni banni ni masqué de la
// découverte. Ne dépend d'aucun votant précis (pas de blocage ici).
function isEligible(u: EligibilityUser): u is EligibleUser {
  if (u.isBanned) return false;
  if (u.settings && !u.settings.showInDiscovery) return false;
  if (!u.profile) return false;
  if (!u.profile.bio || u.profile.bio.trim().length === 0) return false;
  const status = computeProfileStatus({
    bio: u.profile.bio,
    interestedIn: u.profile.interestedIn,
    lookingFor: u.profile.lookingFor,
    physicalDesc: u.profile.physicalDesc,
    city: u.profile.city,
    height: u.profile.height,
    vibe: u.profile.vibe,
    quote: u.profile.quote,
    questions: u.profile.questions,
  });
  return status.isComplete;
}

function toEligibleProfile(u: EligibleUser): EligibleProfile {
  return {
    id: u.id,
    pseudo: u.profile.pseudo,
    city: u.profile.city,
    bio: u.profile.bio,
    gender: u.profile.gender,
    birthDate: u.profile.birthDate,
  };
}

// Profils proposables pour ce votant : éligibles, jamais soi-même, jamais
// un profil qui bloque ou a bloqué le votant.
async function getEligibleProfiles(excludeUserId: string): Promise<EligibleProfile[]> {
  const blocks = await prisma.block.findMany({
    where: { OR: [{ fromId: excludeUserId }, { toId: excludeUserId }] },
    select: { fromId: true, toId: true },
  });
  const blockedIds = new Set(blocks.flatMap((b) => [b.fromId, b.toId]).filter((id) => id !== excludeUserId));

  const users = await prisma.user.findMany({
    where: { id: { not: excludeUserId, notIn: [...blockedIds] } },
    select: ELIGIBILITY_SELECT,
  });

  return users.filter(isEligible).map(toEligibleProfile);
}

function toDuelProfileDto(p: EligibleProfile): DuelProfileDto {
  return { id: p.id, pseudo: p.pseudo, age: computeAge(p.birthDate), city: p.city, bio: p.bio };
}

// Trie déterministe (aucun hasard) : profils jamais vus par ce votant en
// premier, puis exposition globale croissante (équilibrage), puis id
// (départage stable).
function rankProfiles(
  eligible: EligibleProfile[],
  seenProfileIds: Set<string>,
  exposure: Map<string, number>,
): EligibleProfile[] {
  return [...eligible].sort((a, b) => {
    const aSeen = seenProfileIds.has(a.id) ? 1 : 0;
    const bSeen = seenProfileIds.has(b.id) ? 1 : 0;
    if (aSeen !== bSeen) return aSeen - bSeen;
    const diff = (exposure.get(a.id) ?? 0) - (exposure.get(b.id) ?? 0);
    if (diff !== 0) return diff;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

// Parcourt les paires possibles dans l'ordre du classement (profils jamais
// vus d'abord) et retourne la première paire jamais montrée à ce votant.
// Si aucune n'existe (pool minuscule), dernier recours : réutilise la
// meilleure paire même déjà vue plutôt que de n'en proposer aucune.
function pickPair(ranked: EligibleProfile[], seenPairs: Set<string>): [EligibleProfile, EligibleProfile] | null {
  for (let i = 0; i < ranked.length; i++) {
    const a = ranked[i];
    if (!a) continue;
    for (let j = i + 1; j < ranked.length; j++) {
      const b = ranked[j];
      if (!b) continue;
      if (!seenPairs.has(pairKey(a.id, b.id))) {
        return [a, b];
      }
    }
  }
  const [first, second] = ranked;
  if (first && second) return [first, second];
  return null;
}

async function buildDuelCandidates(voterId: string): Promise<[EligibleProfile, EligibleProfile] | null> {
  const eligible = await getEligibleProfiles(voterId);
  if (eligible.length < 2) return null;

  const pastDuels = await prisma.weeklyProfileDuel.findMany({
    where: { userId: voterId },
    select: { candidateAId: true, candidateBId: true },
  });

  const seenProfileIds = new Set<string>();
  const seenPairs = new Set<string>();
  for (const d of pastDuels) {
    seenProfileIds.add(d.candidateAId);
    seenProfileIds.add(d.candidateBId);
    seenPairs.add(pairKey(d.candidateAId, d.candidateBId));
  }

  const eligibleIds = eligible.map((p) => p.id);
  const [exposureA, exposureB] = await Promise.all([
    prisma.weeklyProfileDuel.groupBy({
      by: ["candidateAId"],
      where: { candidateAId: { in: eligibleIds } },
      _count: { candidateAId: true },
    }),
    prisma.weeklyProfileDuel.groupBy({
      by: ["candidateBId"],
      where: { candidateBId: { in: eligibleIds } },
      _count: { candidateBId: true },
    }),
  ]);
  const exposure = new Map<string, number>();
  for (const e of exposureA) exposure.set(e.candidateAId, (exposure.get(e.candidateAId) ?? 0) + e._count.candidateAId);
  for (const e of exposureB) exposure.set(e.candidateBId, (exposure.get(e.candidateBId) ?? 0) + e._count.candidateBId);

  const ranked = rankProfiles(eligible, seenProfileIds, exposure);
  return pickPair(ranked, seenPairs);
}

// Retrouve un duel en attente (non voté, non expiré) pour ce votant, ou en
// génère un nouveau. Réutiliser le duel en attente évite qu'un simple
// rafraîchissement de l'écran ne "brûle" des paires jamais vues.
async function getOrCreateDuel(voterId: string): Promise<DuelDto | null> {
  const now = new Date();

  const pending = await prisma.weeklyProfileDuel.findFirst({
    where: { userId: voterId, usedAt: null, expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
  });
  if (pending) {
    return {
      duelId: pending.id,
      candidateA: await profileDtoFor(pending.candidateAId),
      candidateB: await profileDtoFor(pending.candidateBId),
    };
  }

  const pair = await buildDuelCandidates(voterId);
  if (!pair) return null;
  const [a, b] = pair;

  const created = await prisma.weeklyProfileDuel.create({
    data: {
      userId: voterId,
      candidateAId: a.id,
      candidateBId: b.id,
      expiresAt: new Date(now.getTime() + DUEL_TTL_MS),
    },
  });

  return { duelId: created.id, candidateA: toDuelProfileDto(a), candidateB: toDuelProfileDto(b) };
}

async function profileDtoFor(userId: string): Promise<DuelProfileDto> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { profile: { select: { pseudo: true, city: true, bio: true, birthDate: true } } },
  });
  if (!user?.profile) return { id: userId, pseudo: "Profil supprimé", age: 0, city: "", bio: null };
  return {
    id: userId,
    pseudo: user.profile.pseudo,
    age: computeAge(user.profile.birthDate),
    city: user.profile.city,
    bio: user.profile.bio,
  };
}

export async function getWeeklyProfileState(
  voterId: string,
  isPremium: boolean,
): Promise<WeeklyProfileStateDto> {
  const now = new Date();
  const dayKey = getDayKey(now);
  const dailyLimit = dailyLimitFor(isPremium);

  const votesToday = await prisma.weeklyProfileDuel.count({
    where: { userId: voterId, dayKey, usedAt: { not: null } },
  });
  const remainingToday = Math.max(0, dailyLimit - votesToday);

  if (remainingToday <= 0) {
    return { remainingToday: 0, dailyLimit, limitReached: true, notEnoughCandidates: false, duel: null };
  }

  const duel = await getOrCreateDuel(voterId);
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
  duelId: string,
  chosenId: string,
): Promise<WeeklyProfileStateDto> {
  const duel = await prisma.weeklyProfileDuel.findUnique({ where: { id: duelId } });
  if (!duel) {
    throw new NotFoundError("Duel");
  }
  if (duel.userId !== voterId) {
    throw new ForbiddenError("Ce duel ne t'appartient pas");
  }
  if (duel.usedAt) {
    throw new ConflictError("Ce duel a déjà été utilisé");
  }
  const now = new Date();
  if (duel.expiresAt.getTime() <= now.getTime()) {
    throw new ConflictError("Ce duel a expiré");
  }
  if (chosenId !== duel.candidateAId && chosenId !== duel.candidateBId) {
    throw new BadRequestError("Le profil choisi ne fait pas partie de ce duel");
  }

  const dayKey = getDayKey(now);
  const weekKey = getWeekKey(now);
  const dailyLimit = dailyLimitFor(isPremium);

  const votesToday = await prisma.weeklyProfileDuel.count({
    where: { userId: voterId, dayKey, usedAt: { not: null } },
  });
  if (votesToday >= dailyLimit) {
    throw new ConflictError("Limite quotidienne de votes atteinte");
  }

  const wallet = await prisma.wallet.findUnique({ where: { userId: voterId } });
  if (!wallet) {
    throw new NotFoundError("Wallet");
  }
  const newBalance = computeCreditBalance(wallet.coins, VOTE_REWARD);

  await prisma.$transaction(async (tx) => {
    // Garde atomique : n'accepte le vote que si le duel est toujours non
    // utilisé au moment de l'écriture (protège contre un double vote
    // simultané sur le même duelId).
    const claimed = await tx.weeklyProfileDuel.updateMany({
      where: { id: duelId, usedAt: null },
      data: { usedAt: now, chosenId, weekKey, dayKey },
    });
    if (claimed.count !== 1) {
      throw new ConflictError("Ce duel a déjà été utilisé");
    }

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
        meta: { duelId, candidateAId: duel.candidateAId, candidateBId: duel.candidateBId, chosenId, weekKey } as Prisma.InputJsonValue,
      },
    });
  });

  return getWeeklyProfileState(voterId, isPremium);
}

interface WinnerVoteRow {
  chosenId: string;
  candidateAId: string;
  candidateBId: string;
  usedAt: Date;
}

// Départage déterministe (aucun hasard) entre candidats à égalité :
//  1) le plus de duels gagnés face à face contre les autres candidats à égalité
//  2) celui qui a atteint ce score de votes en premier (timestamp du dernier
//     vote qui l'a porté à son total, le plus tôt gagne)
//  3) id le plus petit
function pickWinnerAmong(
  candidateIds: string[],
  totalsById: Map<string, number>,
  votesById: Map<string, Date[]>,
  votesForGender: WinnerVoteRow[],
): string | null {
  if (candidateIds.length === 0) return null;
  if (candidateIds.length === 1) {
    const onlyId = candidateIds[0]!;
    return (totalsById.get(onlyId) ?? 0) > 0 ? onlyId : null;
  }

  const maxVotes = Math.max(...candidateIds.map((id) => totalsById.get(id) ?? 0));
  if (maxVotes === 0) return null;
  let tied = candidateIds.filter((id) => (totalsById.get(id) ?? 0) === maxVotes);
  if (tied.length === 1) return tied[0]!;

  const tiedSet = new Set(tied);
  const h2h = new Map<string, number>(tied.map((id) => [id, 0]));
  for (const v of votesForGender) {
    if (!tiedSet.has(v.chosenId)) continue;
    const otherId = v.candidateAId === v.chosenId ? v.candidateBId : v.candidateAId;
    if (tiedSet.has(otherId)) {
      h2h.set(v.chosenId, (h2h.get(v.chosenId) ?? 0) + 1);
    }
  }
  const maxH2H = Math.max(...tied.map((id) => h2h.get(id) ?? 0));
  tied = tied.filter((id) => (h2h.get(id) ?? 0) === maxH2H);
  if (tied.length === 1) return tied[0]!;

  const reachedAt = new Map<string, number>(
    tied.map((id) => [id, Math.max(...(votesById.get(id) ?? []).map((d) => d.getTime()))]),
  );
  const minReachedAt = Math.min(...tied.map((id) => reachedAt.get(id)!));
  tied = tied.filter((id) => reachedAt.get(id) === minReachedAt);
  if (tied.length === 1) return tied[0]!;

  return [...tied].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))[0]!;
}

export async function getWeeklyProfileWinners(): Promise<WeeklyProfileWinnersDto> {
  const now = new Date();
  const weekKey = getPreviousWeekKey(now);

  const votes = await prisma.weeklyProfileDuel.findMany({
    where: { weekKey, usedAt: { not: null } },
    select: { chosenId: true, candidateAId: true, candidateBId: true, usedAt: true },
  });

  if (votes.length === 0) {
    return { weekKey, male: null, female: null };
  }

  const participantIds = new Set<string>();
  for (const v of votes) {
    participantIds.add(v.candidateAId);
    participantIds.add(v.candidateBId);
  }

  const users = await prisma.user.findMany({
    where: { id: { in: [...participantIds] } },
    select: ELIGIBILITY_SELECT,
  });
  const eligibleUsers = users.filter(isEligible);
  const profileById = new Map(eligibleUsers.map((u) => [u.id, toEligibleProfile(u)]));

  const usedVotes: WinnerVoteRow[] = votes
    .filter((v): v is typeof v & { chosenId: string } => v.chosenId !== null)
    .map((v) => ({ chosenId: v.chosenId, candidateAId: v.candidateAId, candidateBId: v.candidateBId, usedAt: v.usedAt! }));

  const totalsById = new Map<string, number>();
  const votesById = new Map<string, Date[]>();
  for (const v of usedVotes) {
    if (!profileById.has(v.chosenId)) continue;
    totalsById.set(v.chosenId, (totalsById.get(v.chosenId) ?? 0) + 1);
    const arr = votesById.get(v.chosenId) ?? [];
    arr.push(v.usedAt);
    votesById.set(v.chosenId, arr);
  }

  function winnerForGender(gender: Gender): WeeklyProfileWinnerDto | null {
    const genderParticipants = [...participantIds].filter((id) => profileById.get(id)?.gender === gender);
    const winnerId = pickWinnerAmong(genderParticipants, totalsById, votesById, usedVotes);
    if (!winnerId) return null;
    const profile = profileById.get(winnerId)!;
    return {
      id: winnerId,
      pseudo: profile.pseudo,
      age: computeAge(profile.birthDate),
      city: profile.city,
      bio: profile.bio,
      gender,
      totalVotes: totalsById.get(winnerId) ?? 0,
      weekKey,
    };
  }

  return {
    weekKey,
    male: winnerForGender(Gender.HOMME),
    female: winnerForGender(Gender.FEMME),
  };
}

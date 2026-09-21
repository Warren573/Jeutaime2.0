import {
  MatchStatus,
  Prisma,
  PrivateDuelChoice,
  PrivateDuelStatus,
} from "@prisma/client";
import { prisma } from "../../config/prisma";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../core/errors";

const duelInclude = {
  challenger: { select: { id: true, profile: { select: { pseudo: true } } } },
  opponent: { select: { id: true, profile: { select: { pseudo: true } } } },
} satisfies Prisma.PrivateDuelInclude;

type DuelWithPlayers = Prisma.PrivateDuelGetPayload<{ include: typeof duelInclude }>;

function beats(a: PrivateDuelChoice, b: PrivateDuelChoice): boolean {
  return (
    (a === PrivateDuelChoice.ROCK && b === PrivateDuelChoice.SCISSORS) ||
    (a === PrivateDuelChoice.PAPER && b === PrivateDuelChoice.ROCK) ||
    (a === PrivateDuelChoice.SCISSORS && b === PrivateDuelChoice.PAPER)
  );
}

function computeWinnerId(
  challengerId: string,
  opponentId: string,
  challengerChoice: PrivateDuelChoice,
  opponentChoice: PrivateDuelChoice,
): string | null {
  if (challengerChoice === opponentChoice) return null;
  return beats(challengerChoice, opponentChoice) ? challengerId : opponentId;
}

function assertParticipant(duel: { challengerId: string; opponentId: string }, userId: string) {
  if (duel.challengerId !== userId && duel.opponentId !== userId) {
    throw new ForbiddenError("Ce duel ne t'appartient pas");
  }
}

function pseudoOf(user: { id: string; profile: { pseudo: string } | null }): string {
  return user.profile?.pseudo ?? "Utilisateur";
}

function toDto(duel: DuelWithPlayers, requesterId: string) {
  assertParticipant(duel, requesterId);

  const isChallenger = duel.challengerId === requesterId;
  const me = isChallenger ? duel.challenger : duel.opponent;
  const other = isChallenger ? duel.opponent : duel.challenger;
  const ownChoice = isChallenger ? duel.challengerChoice : duel.opponentChoice;
  const otherChoice = isChallenger ? duel.opponentChoice : duel.challengerChoice;
  const resolved = duel.status === PrivateDuelStatus.RESOLVED;

  let result: "WIN" | "LOSE" | "DRAW" | "PENDING" = "PENDING";
  if (resolved) {
    if (duel.winnerId === null) result = "DRAW";
    else result = duel.winnerId === requesterId ? "WIN" : "LOSE";
  }

  return {
    id: duel.id,
    status: duel.status,
    createdAt: duel.createdAt,
    updatedAt: duel.updatedAt,
    resolvedAt: duel.resolvedAt,
    isChallenger,
    myUserId: me.id,
    myPseudo: pseudoOf(me),
    opponentId: other.id,
    opponentPseudo: pseudoOf(other),
    myChoice: ownChoice,
    // Secret jusqu'à résolution : le client ne reçoit jamais le choix adverse avant.
    opponentChoice: resolved ? otherChoice : null,
    hasPlayed: ownChoice !== null,
    opponentHasPlayed: otherChoice !== null,
    winnerId: resolved ? duel.winnerId : null,
    result,
  };
}

async function loadDuel(duelId: string): Promise<DuelWithPlayers> {
  const duel = await prisma.privateDuel.findUnique({
    where: { id: duelId },
    include: duelInclude,
  });
  if (!duel) throw new NotFoundError("Duel");
  return duel;
}

export async function create(userId: string, matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      userAId: true,
      userBId: true,
      status: true,
    },
  });

  if (!match) throw new NotFoundError("Contact");
  if (match.userAId !== userId && match.userBId !== userId) {
    throw new ForbiddenError("Ce contact ne t'appartient pas");
  }
  if (match.status === MatchStatus.BLOCKED || match.status === MatchStatus.BROKEN || match.status === MatchStatus.GHOSTED) {
    throw new ConflictError("Ce contact n'est plus disponible pour un duel");
  }

  const opponentId = match.userAId === userId ? match.userBId : match.userAId;
  if (opponentId === userId) throw new BadRequestError("Impossible de te défier toi-même");

  // Un seul duel non résolu à la fois entre ces deux personnes.
  const existing = await prisma.privateDuel.findFirst({
    where: {
      status: PrivateDuelStatus.PENDING,
      OR: [
        { challengerId: userId, opponentId },
        { challengerId: opponentId, opponentId: userId },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: duelInclude,
  });

  if (existing) return toDto(existing, userId);

  const duel = await prisma.privateDuel.create({
    data: {
      challengerId: userId,
      opponentId,
    },
    include: duelInclude,
  });

  return toDto(duel, userId);
}

export async function getOne(userId: string, duelId: string) {
  const duel = await loadDuel(duelId);
  return toDto(duel, userId);
}

export async function listMine(userId: string) {
  const duels = await prisma.privateDuel.findMany({
    where: {
      OR: [{ challengerId: userId }, { opponentId: userId }],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: duelInclude,
  });

  return duels.map((duel) => toDto(duel, userId));
}

export async function submitChoice(
  userId: string,
  duelId: string,
  choice: PrivateDuelChoice,
) {
  return prisma.$transaction(
    async (tx) => {
      const duel = await tx.privateDuel.findUnique({
        where: { id: duelId },
        include: duelInclude,
      });

      if (!duel) throw new NotFoundError("Duel");
      assertParticipant(duel, userId);

      if (duel.status !== PrivateDuelStatus.PENDING) {
        throw new ConflictError("Ce duel est déjà terminé");
      }

      const isChallenger = duel.challengerId === userId;
      const alreadyPlayed = isChallenger ? duel.challengerChoice : duel.opponentChoice;
      if (alreadyPlayed !== null) {
        throw new ConflictError("Ton choix est déjà enregistré");
      }

      const claimed = await tx.privateDuel.updateMany({
        where: {
          id: duelId,
          status: PrivateDuelStatus.PENDING,
          ...(isChallenger
            ? { challengerChoice: null }
            : { opponentChoice: null }),
        },
        data: isChallenger
          ? { challengerChoice: choice }
          : { opponentChoice: choice },
      });

      if (claimed.count !== 1) {
        throw new ConflictError("Ton choix est déjà enregistré");
      }

      const afterChoice = await tx.privateDuel.findUnique({
        where: { id: duelId },
        include: duelInclude,
      });
      if (!afterChoice) throw new NotFoundError("Duel");

      if (afterChoice.challengerChoice && afterChoice.opponentChoice) {
        const winnerId = computeWinnerId(
          afterChoice.challengerId,
          afterChoice.opponentId,
          afterChoice.challengerChoice,
          afterChoice.opponentChoice,
        );

        const resolved = await tx.privateDuel.update({
          where: { id: duelId },
          data: {
            status: PrivateDuelStatus.RESOLVED,
            winnerId,
            resolvedAt: new Date(),
          },
          include: duelInclude,
        });

        return toDto(resolved, userId);
      }

      return toDto(afterChoice, userId);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function rematch(userId: string, duelId: string) {
  const previous = await loadDuel(duelId);
  assertParticipant(previous, userId);

  if (previous.status !== PrivateDuelStatus.RESOLVED) {
    throw new ConflictError("Termine d'abord le duel en cours");
  }

  const opponentId =
    previous.challengerId === userId ? previous.opponentId : previous.challengerId;

  const existing = await prisma.privateDuel.findFirst({
    where: {
      status: PrivateDuelStatus.PENDING,
      OR: [
        { challengerId: userId, opponentId },
        { challengerId: opponentId, opponentId: userId },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: duelInclude,
  });
  if (existing) return toDto(existing, userId);

  const created = await prisma.privateDuel.create({
    data: { challengerId: userId, opponentId },
    include: duelInclude,
  });

  return toDto(created, userId);
}

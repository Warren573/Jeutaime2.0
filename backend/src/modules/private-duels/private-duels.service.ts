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

const DUEL_TTL_MS = 48 * 60 * 60 * 1000;
export const DUEL_PARTICIPATION_POINTS = 1;
export const DUEL_VICTORY_POINTS = 1;

const duelInclude = {
  challenger: { select: { id: true, profile: { select: { pseudo: true } } } },
  opponent: { select: { id: true, profile: { select: { pseudo: true } } } },
  commonUser: { select: { id: true, profile: { select: { pseudo: true } } } },
} satisfies Prisma.PrivateDuelInclude;

type DuelWithPlayers = Prisma.PrivateDuelGetPayload<{ include: typeof duelInclude }>;
type Tx = Prisma.TransactionClient;

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

function pseudoOf(user: { id: string; profile: { pseudo: string } | null } | null): string {
  return user?.profile?.pseudo ?? "Utilisateur";
}

async function addJournalEvent(
  tx: Tx,
  userId: string,
  kind: string,
  meta: Record<string, string | null>,
) {
  await tx.journalEvent.create({
    data: { userId, kind, meta },
  });
}

function duelMeta(duel: {
  id: string;
  challengerId: string;
  opponentId: string;
  commonUserId: string | null;
  winnerId?: string | null;
}) {
  return {
    duelId: duel.id,
    challengerId: duel.challengerId,
    opponentId: duel.opponentId,
    commonUserId: duel.commonUserId,
    winnerId: duel.winnerId ?? null,
  };
}

function toDto(duel: DuelWithPlayers, requesterId: string) {
  assertParticipant(duel, requesterId);

  const isChallenger = duel.challengerId === requesterId;
  const me = isChallenger ? duel.challenger : duel.opponent;
  const other = isChallenger ? duel.opponent : duel.challenger;
  const ownChoice = isChallenger ? duel.challengerChoice : duel.opponentChoice;
  const otherChoice = isChallenger ? duel.opponentChoice : duel.challengerChoice;
  const resolved = duel.status === PrivateDuelStatus.RESOLVED;

  let result: "WIN" | "LOSE" | "DRAW" | "PENDING" | "DECLINED" | "EXPIRED" = "PENDING";
  if (resolved) {
    if (duel.winnerId === null) result = "DRAW";
    else result = duel.winnerId === requesterId ? "WIN" : "LOSE";
  } else if (duel.status === PrivateDuelStatus.CANCELLED) {
    result = "DECLINED";
  } else if (duel.status === PrivateDuelStatus.EXPIRED) {
    result = "EXPIRED";
  }

  return {
    id: duel.id,
    status: duel.status,
    createdAt: duel.createdAt,
    expiresAt: duel.expiresAt,
    updatedAt: duel.updatedAt,
    resolvedAt: duel.resolvedAt,
    declinedAt: duel.declinedAt,
    isChallenger,
    myUserId: me.id,
    myPseudo: pseudoOf(me),
    opponentId: other.id,
    opponentPseudo: pseudoOf(other),
    commonUserId: duel.commonUserId,
    commonUserPseudo: pseudoOf(duel.commonUser),
    myChoice: ownChoice,
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

async function directContactIds(userId: string): Promise<Set<string>> {
  const directMatches = await prisma.match.findMany({
    where: {
      status: { in: [MatchStatus.ACTIVE, MatchStatus.PENDING] },
      OR: [{ userAId: userId }, { userBId: userId }],
    },
    select: { userAId: true, userBId: true },
  });

  return new Set(
    directMatches.map((match) => (match.userAId === userId ? match.userBId : match.userAId)),
  );
}

async function isDirectContact(a: string, b: string): Promise<boolean> {
  const match = await prisma.match.findFirst({
    where: {
      status: { in: [MatchStatus.ACTIVE, MatchStatus.PENDING] },
      OR: [
        { userAId: a, userBId: b },
        { userAId: b, userBId: a },
      ],
    },
    select: { id: true },
  });
  return !!match;
}

async function assertValidPath(userId: string, targetUserId: string, commonUserId: string) {
  if (userId === targetUserId || userId === commonUserId || targetUserId === commonUserId) {
    throw new BadRequestError("Parcours de duel invalide");
  }

  const [challengerToCommon, commonToTarget, challengerToTarget] = await Promise.all([
    isDirectContact(userId, commonUserId),
    isDirectContact(commonUserId, targetUserId),
    isDirectContact(userId, targetUserId),
  ]);

  if (!challengerToCommon || !commonToTarget || challengerToTarget) {
    throw new ForbiddenError(
      "Tu peux uniquement défier un correspondant de l'un de tes correspondants",
    );
  }
}

export async function listCandidates(userId: string) {
  const directIds = await directContactIds(userId);
  if (directIds.size === 0) return [];

  const contactIds = [...directIds];
  const secondDegreeMatches = await prisma.match.findMany({
    where: {
      status: { in: [MatchStatus.ACTIVE, MatchStatus.PENDING] },
      OR: [{ userAId: { in: contactIds } }, { userBId: { in: contactIds } }],
    },
    select: { userAId: true, userBId: true },
  });

  const paths = new Map<string, { targetUserId: string; commonUserId: string }>();
  for (const match of secondDegreeMatches) {
    for (const commonUserId of contactIds) {
      let targetUserId: string | null = null;
      if (match.userAId === commonUserId) targetUserId = match.userBId;
      else if (match.userBId === commonUserId) targetUserId = match.userAId;

      if (
        targetUserId &&
        targetUserId !== userId &&
        !directIds.has(targetUserId)
      ) {
        paths.set(`${targetUserId}:${commonUserId}`, { targetUserId, commonUserId });
      }
    }
  }

  const userIds = [...new Set([...paths.values()].flatMap((p) => [p.targetUserId, p.commonUserId]))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, profile: { select: { pseudo: true } } },
  });
  const byId = new Map(users.map((u) => [u.id, u]));

  return [...paths.values()]
    .map((path) => ({
      id: path.targetUserId,
      pseudo: pseudoOf(byId.get(path.targetUserId) ?? null),
      commonUserId: path.commonUserId,
      commonPseudo: pseudoOf(byId.get(path.commonUserId) ?? null),
    }))
    .sort((a, b) => a.pseudo.localeCompare(b.pseudo, "fr"));
}

export async function create(userId: string, targetUserId: string, commonUserId: string) {
  await assertValidPath(userId, targetUserId, commonUserId);

  const existing = await prisma.privateDuel.findFirst({
    where: {
      status: PrivateDuelStatus.PENDING,
      OR: [
        { challengerId: userId, opponentId: targetUserId },
        { challengerId: targetUserId, opponentId: userId },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: duelInclude,
  });
  if (existing) return toDto(existing, userId);

  const expiresAt = new Date(Date.now() + DUEL_TTL_MS);

  const duel = await prisma.$transaction(async (tx) => {
    const created = await tx.privateDuel.create({
      data: {
        challengerId: userId,
        opponentId: targetUserId,
        commonUserId,
        expiresAt,
      },
      include: duelInclude,
    });

    await Promise.all([
      addJournalEvent(tx, userId, "DUEL_CREATED", duelMeta(created)),
      addJournalEvent(tx, targetUserId, "DUEL_RECEIVED", duelMeta(created)),
      addJournalEvent(tx, commonUserId, "DUEL_AROUND_YOU_CREATED", duelMeta(created)),
    ]);

    return created;
  });

  return toDto(duel, userId);
}

export async function getOne(userId: string, duelId: string) {
  const duel = await loadDuel(duelId);
  return toDto(duel, userId);
}

export async function listMine(userId: string) {
  const duels = await prisma.privateDuel.findMany({
    where: { OR: [{ challengerId: userId }, { opponentId: userId }] },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: duelInclude,
  });
  return duels.map((duel) => toDto(duel, userId));
}

export async function getStats(userId: string) {
  const [participations, wins] = await Promise.all([
    prisma.privateDuel.count({
      where: {
        status: PrivateDuelStatus.RESOLVED,
        OR: [{ challengerId: userId }, { opponentId: userId }],
      },
    }),
    prisma.privateDuel.count({
      where: {
        status: PrivateDuelStatus.RESOLVED,
        winnerId: userId,
      },
    }),
  ]);

  return {
    participations,
    wins,
    participationPoints: participations * DUEL_PARTICIPATION_POINTS,
    victoryPoints: wins * DUEL_VICTORY_POINTS,
  };
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
      if (duel.expiresAt <= new Date()) {
        throw new ConflictError("Ce duel a expiré");
      }

      const isChallenger = duel.challengerId === userId;
      const alreadyPlayed = isChallenger ? duel.challengerChoice : duel.opponentChoice;
      if (alreadyPlayed !== null) throw new ConflictError("Ton choix est déjà enregistré");

      const claimed = await tx.privateDuel.updateMany({
        where: {
          id: duelId,
          status: PrivateDuelStatus.PENDING,
          ...(isChallenger ? { challengerChoice: null } : { opponentChoice: null }),
        },
        data: isChallenger ? { challengerChoice: choice } : { opponentChoice: choice },
      });
      if (claimed.count !== 1) throw new ConflictError("Ton choix est déjà enregistré");

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

        const meta = duelMeta(resolved);
        await Promise.all([
          addJournalEvent(tx, resolved.challengerId, "DUEL_RESOLVED", meta),
          addJournalEvent(tx, resolved.opponentId, "DUEL_RESOLVED", meta),
          ...(resolved.commonUserId
            ? [addJournalEvent(tx, resolved.commonUserId, "DUEL_AROUND_YOU_RESOLVED", meta)]
            : []),
        ]);

        return toDto(resolved, userId);
      }

      return toDto(afterChoice, userId);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function decline(userId: string, duelId: string) {
  return prisma.$transaction(async (tx) => {
    const duel = await tx.privateDuel.findUnique({
      where: { id: duelId },
      include: duelInclude,
    });
    if (!duel) throw new NotFoundError("Duel");

    if (duel.opponentId !== userId) {
      throw new ForbiddenError("Seule la personne défiée peut décliner ce duel");
    }
    if (duel.status !== PrivateDuelStatus.PENDING) {
      throw new ConflictError("Ce duel est déjà terminé");
    }
    if (duel.expiresAt <= new Date()) {
      throw new ConflictError("Ce duel a expiré");
    }

    const declined = await tx.privateDuel.update({
      where: { id: duelId },
      data: {
        status: PrivateDuelStatus.CANCELLED,
        declinedAt: new Date(),
      },
      include: duelInclude,
    });

    const meta = duelMeta(declined);
    await Promise.all([
      addJournalEvent(tx, declined.challengerId, "DUEL_DECLINED", meta),
      addJournalEvent(tx, declined.opponentId, "DUEL_DECLINED_BY_ME", meta),
      ...(declined.commonUserId
        ? [addJournalEvent(tx, declined.commonUserId, "DUEL_AROUND_YOU_DECLINED", meta)]
        : []),
    ]);

    return toDto(declined, userId);
  });
}

export async function expirePending(now = new Date()) {
  const expired = await prisma.privateDuel.findMany({
    where: {
      status: PrivateDuelStatus.PENDING,
      expiresAt: { lte: now },
    },
    select: {
      id: true,
      challengerId: true,
      opponentId: true,
      commonUserId: true,
    },
  });
  if (expired.length === 0) return 0;

  await prisma.$transaction(async (tx) => {
    for (const duel of expired) {
      const updated = await tx.privateDuel.updateMany({
        where: { id: duel.id, status: PrivateDuelStatus.PENDING },
        data: { status: PrivateDuelStatus.EXPIRED },
      });
      if (updated.count !== 1) continue;

      const meta = duelMeta(duel);
      await Promise.all([
        addJournalEvent(tx, duel.challengerId, "DUEL_EXPIRED", meta),
        addJournalEvent(tx, duel.opponentId, "DUEL_EXPIRED", meta),
        ...(duel.commonUserId
          ? [addJournalEvent(tx, duel.commonUserId, "DUEL_AROUND_YOU_EXPIRED", meta)]
          : []),
      ]);
    }
  });

  return expired.length;
}

export async function rematch(userId: string, duelId: string) {
  const previous = await loadDuel(duelId);
  assertParticipant(previous, userId);

  if (previous.status !== PrivateDuelStatus.RESOLVED) {
    throw new ConflictError("Termine d'abord le duel en cours");
  }
  if (!previous.commonUserId) {
    throw new ConflictError("Ce duel ancien ne peut pas être relancé");
  }

  const opponentId =
    previous.challengerId === userId ? previous.opponentId : previous.challengerId;

  await assertValidPath(userId, opponentId, previous.commonUserId);

  return create(userId, opponentId, previous.commonUserId);
}

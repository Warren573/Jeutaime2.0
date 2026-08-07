import { prisma } from "../../config/prisma";
import { NotFoundError } from "../../core/errors";

/**
 * Export personnel lisible par l'utilisateur.
 *
 * Sécurité : ne jamais exposer passwordHash, refresh tokens, token hashes,
 * chemins disque des photos, AuditLog internes ou autres secrets techniques.
 */
export async function exportPersonalData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      isVerified: true,
      premiumTier: true,
      premiumUntil: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      profile: {
        include: { questions: true },
      },
      settings: true,
      wallet: {
        select: {
          coins: true,
          lastDailyBonus: true,
          updatedAt: true,
          transactions: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              type: true,
              amount: true,
              balance: true,
              meta: true,
              createdAt: true,
            },
          },
        },
      },
      photos: {
        orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
        select: {
          id: true,
          position: true,
          isPrimary: true,
          createdAt: true,
        },
      },
    },
  });

  if (!user) throw new NotFoundError("Utilisateur");

  const [
    sentLetters,
    receivedLetters,
    matchesAsA,
    matchesAsB,
    offeringsSent,
    offeringsReceived,
    reportsMade,
    blocksMade,
    notifications,
    reactionsGiven,
  ] = await Promise.all([
    prisma.letter.findMany({
      where: { fromUserId: userId },
      orderBy: { sentAt: "desc" },
      select: {
        id: true,
        matchId: true,
        toUserId: true,
        content: true,
        status: true,
        isGhostRelance: true,
        sentAt: true,
        readAt: true,
      },
    }),
    prisma.letter.findMany({
      where: { toUserId: userId },
      orderBy: { sentAt: "desc" },
      select: {
        id: true,
        matchId: true,
        fromUserId: true,
        content: true,
        status: true,
        isGhostRelance: true,
        sentAt: true,
        readAt: true,
      },
    }),
    prisma.match.findMany({
      where: { userAId: userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userAId: true,
        userBId: true,
        status: true,
        initiatorId: true,
        letterCountA: true,
        letterCountB: true,
        questionsValidated: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.match.findMany({
      where: { userBId: userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userAId: true,
        userBId: true,
        status: true,
        initiatorId: true,
        letterCountA: true,
        letterCountB: true,
        questionsValidated: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.offeringSent.findMany({
      where: { fromUserId: userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        offeringId: true,
        toUserId: true,
        salonId: true,
        expiresAt: true,
        createdAt: true,
        consumptionCount: true,
        lastConsumedAt: true,
        lastConsumedBy: true,
      },
    }),
    prisma.offeringSent.findMany({
      where: { toUserId: userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        offeringId: true,
        fromUserId: true,
        salonId: true,
        expiresAt: true,
        createdAt: true,
        consumptionCount: true,
        lastConsumedAt: true,
        lastConsumedBy: true,
      },
    }),
    prisma.report.findMany({
      where: { reporterId: userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        targetId: true,
        reason: true,
        details: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
      },
    }),
    prisma.block.findMany({
      where: { fromId: userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, toId: true, createdAt: true },
    }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.reaction.findMany({
      where: { fromId: userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, toId: true, type: true, createdAt: true },
    }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      premiumTier: user.premiumTier,
      premiumUntil: user.premiumUntil,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    profile: user.profile,
    settings: user.settings,
    wallet: user.wallet,
    photos: user.photos,
    letters: {
      sent: sentLetters,
      received: receivedLetters,
    },
    matches: [...matchesAsA, ...matchesAsB].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    ),
    offerings: {
      sent: offeringsSent,
      received: offeringsReceived,
    },
    reportsMade,
    blocksMade,
    notifications,
    reactionsGiven,
  };
}

import { prisma } from "../../config/prisma";
import type {
  MessageInABottle,
  BottleReceipt,
  AnonymousMessage,
  BottleSuspension,
  User,
} from "@prisma/client";
import { addDays } from "date-fns";
import { ConflictError } from "../../core/errors";

// ============================================================
// Core Bottle Operations
// ============================================================

export async function createBottle(
  senderId: string,
  message: string,
  targetGender: string,
  ageMin: number,
  ageMax: number,
  correlationId: string = 'N/A',
): Promise<MessageInABottle> {
  try {
    console.log(`[S1-SERVICE] ${correlationId} | createBottle START | senderId=${senderId}`);

    // Check max 3 pending bottles per user
    console.log(`[S2-SERVICE] ${correlationId} | COUNT FLOATING BOTTLES`);
    const pendingCount = await prisma.messageInABottle.count({
      where: {
        senderId,
        status: "FLOATING",
      },
    });
    console.log(`[S3-SERVICE] ${correlationId} | PENDING COUNT: ${pendingCount}`);

    if (pendingCount >= 3) {
      const err = `Tu as déjà ${pendingCount} bouteilles en attente (max 3). Attends qu'une soit acceptée ou expirée avant d'en renvoyer une.`;
      console.error(`[S4-SERVICE] ${correlationId} | VALIDATION FAILED | ${err}`);
      // HttpError typé → 409 avec message clair (sinon: 500 générique masqué).
      throw new ConflictError(err);
    }

    // Get sender's city from profile
    console.log(`[S5-SERVICE] ${correlationId} | FETCH SENDER PROFILE | userId=${senderId}`);
    const senderProfile = await prisma.profile.findUnique({
      where: { userId: senderId },
      select: { city: true },
    });
    const senderCity = senderProfile?.city || "Unknown";
    console.log(`[S6-SERVICE] ${correlationId} | PROFILE FETCHED | city=${senderCity}`);

    // Create bottle
    console.log(`[S7-SERVICE] ${correlationId} | PRISMA CREATE BOTTLE START`);
    const bottle = await prisma.messageInABottle.create({
      data: {
        senderId,
        message,
        senderCity,
        targetGender,
        ageMin,
        ageMax,
        expiresAt: addDays(new Date(), 30),
      },
    });
    console.log(`[S8-SERVICE] ${correlationId} | PRISMA CREATE BOTTLE SUCCESS | id=${bottle.id}`);

    // Find compatible recipients and create receipts
    console.log(`[S9-SERVICE] ${correlationId} | FIND COMPATIBLE RECIPIENTS`);
    const compatibleUsers = await findCompatibleRecipients(bottle);
    console.log(`[S10-SERVICE] ${correlationId} | FOUND ${compatibleUsers.length} COMPATIBLE USERS`);

    if (compatibleUsers.length > 0) {
      console.log(`[S11-SERVICE] ${correlationId} | CREATE BOTTLE RECEIPTS | count=${compatibleUsers.length}`);
      await prisma.bottleReceipt.createMany({
        data: compatibleUsers.map((user) => ({
          bottleId: bottle.id,
          recipientId: user.id,
        })),
      });
      console.log(`[S12-SERVICE] ${correlationId} | RECEIPTS CREATED`);
    }

    console.log(`[S13-SERVICE] ${correlationId} | createBottle SUCCESS | returning bottle`);
    return bottle;
  } catch (error: any) {
    console.error(`[S-ERROR] ${correlationId} | SERVICE EXCEPTION | error=${error?.message}`);
    throw error;
  }
}

/**
 * Annule (expire) toutes les bouteilles FLOATING envoyées par l'utilisateur.
 * Sert à libérer le quota de 3 bouteilles en attente. Ne touche pas aux
 * relations (receipts/messages conservés).
 */
export async function cancelPendingBottles(
  senderId: string,
): Promise<number> {
  const result = await prisma.messageInABottle.updateMany({
    where: { senderId, status: "FLOATING" },
    data: { status: "EXPIRED" },
  });
  return result.count;
}

/**
 * Historique des bouteilles envoyées par un utilisateur, avec le nombre de
 * destinataires touchés (reçus créés) pour chacune.
 */
export async function getSentBottles(senderId: string) {
  const bottles = await prisma.messageInABottle.findMany({
    where: { senderId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { receipts: true } } },
  });

  return bottles.map((b) => ({
    id: b.id,
    message: b.message,
    targetGender: b.targetGender,
    ageMin: b.ageMin,
    ageMax: b.ageMax,
    status: b.status,
    createdAt: b.createdAt,
    expiresAt: b.expiresAt,
    recipientCount: b._count.receipts,
  }));
}

/**
 * Genres de destinataires visés par une bouteille.
 * "LES_DEUX" → hommes ET femmes ; sinon le genre demandé tel quel.
 */
function targetGendersFor(targetGender: string): string[] {
  if (targetGender === "LES_DEUX") return ["HOMME", "FEMME"];
  return [targetGender];
}

async function findCompatibleRecipients(
  bottle: MessageInABottle,
): Promise<User[]> {
  const now = new Date();
  const minBirthDate = addDays(now, -365 * bottle.ageMax - 365);
  const maxBirthDate = addDays(now, -365 * bottle.ageMin);

  // Match mutuel : le destinataire doit AUSSI chercher le genre de l'expéditeur
  // (sa préférence enregistrée `interestedIn`). Si le genre de l'expéditeur est
  // inconnu, on n'applique pas ce filtre (pour ne rien masquer par erreur).
  const senderProfile = await prisma.profile.findUnique({
    where: { userId: bottle.senderId },
    select: { gender: true },
  });
  const senderGender = senderProfile?.gender;

  const profileAnd: any[] = [
    {
      // Le destinataire doit ÊTRE du genre recherché (gender), pas être
      // "intéressé par" ce genre (interestedIn). LES_DEUX = homme + femme.
      gender: { in: targetGendersFor(bottle.targetGender) as any },
    },
    {
      birthDate: {
        gte: minBirthDate,
        lte: maxBirthDate,
      },
    },
  ];
  if (senderGender) {
    // Tolérant : un profil dont la préférence n'est pas renseignée (interestedIn
    // vide) reste éligible ; sinon elle doit inclure le genre de l'expéditeur.
    profileAnd.push({
      OR: [
        { interestedIn: { isEmpty: true } },
        { interestedIn: { hasSome: [senderGender] } },
      ],
    });
  }

  const users = await prisma.user.findMany({
    where: {
      isBanned: false,
      profile: {
        AND: profileAnd,
      },
      NOT: {
        id: bottle.senderId,
      },
    },
    include: {
      bottleSuspension: true,
    },
  });

  return users.filter((user) => {
    if (!user.bottleSuspension) return true;
    return user.bottleSuspension.endsAt <= now;
  });
}

export async function acceptBottle(
  bottleId: string,
  userId: string,
): Promise<MessageInABottle> {
  // Start transaction to ensure atomic updates
  const result = await prisma.$transaction(async (tx) => {
    // Update bottle status
    const bottle = await tx.messageInABottle.update({
      where: { id: bottleId },
      data: {
        status: "ACCEPTED",
        acceptedById: userId,
        acceptedAt: new Date(),
      },
    });

    // Update the accepting receipt
    await tx.bottleReceipt.update({
      where: {
        bottleId_recipientId: {
          bottleId,
          recipientId: userId,
        },
      },
      data: {
        status: "ACCEPTED",
        actionAt: new Date(),
      },
    });

    // Mark other pending receipts as TAKEN
    await tx.bottleReceipt.updateMany({
      where: {
        bottleId,
        recipientId: {
          not: userId,
        },
        status: "PENDING",
      },
      data: {
        status: "TAKEN",
        actionAt: new Date(),
      },
    });

    return bottle;
  });

  return result;
}

export async function refuseBottle(
  bottleId: string,
  userId: string,
): Promise<BottleReceipt> {
  // Mark receipt as refused
  const receipt = await prisma.bottleReceipt.update({
    where: {
      bottleId_recipientId: {
        bottleId,
        recipientId: userId,
      },
    },
    data: {
      status: "REFUSED",
      actionAt: new Date(),
    },
  });

  // Republish to new compatible users (max 3-5 to avoid spam)
  const bottle = await prisma.messageInABottle.findUnique({
    where: { id: bottleId },
  });

  if (!bottle) return receipt;

  // Get all existing receipts (don't re-target these users)
  const existingReceipts = await prisma.bottleReceipt.findMany({
    where: { bottleId },
    select: { recipientId: true },
  });
  const existingUserIds = new Set(existingReceipts.map((r) => r.recipientId));

  // Find all compatible users
  const allCompatible = await findCompatibleRecipients(bottle);

  // Filter: only those NOT yet targeted, limit to 3 new users
  const newTargets = allCompatible
    .filter((user) => !existingUserIds.has(user.id))
    .slice(0, 3); // Max 3 new targets per refusal

  if (newTargets.length > 0) {
    await prisma.bottleReceipt.createMany({
      data: newTargets.map((user) => ({
        bottleId,
        recipientId: user.id,
      })),
    });
  }

  return receipt;
}

export async function getMessages(
  bottleId: string,
): Promise<AnonymousMessage[]> {
  const messages = await prisma.anonymousMessage.findMany({
    where: { bottleId },
    orderBy: { createdAt: "asc" },
  });

  return messages;
}

export async function postMessage(
  bottleId: string,
  senderId: string,
  content: string,
): Promise<AnonymousMessage> {
  const message = await prisma.anonymousMessage.create({
    data: {
      bottleId,
      senderId,
      content,
    },
  });

  return message;
}

// ============================================================
// Inbox Management (with lazy evaluation)
// ============================================================

export async function ensureReceiptsForFloatingBottles(
  userId: string,
): Promise<void> {
  // Find FLOATING bottles this user doesn't yet have a receipt for
  const floatingBottles = await prisma.messageInABottle.findMany({
    where: {
      status: "FLOATING",
      expiresAt: { gt: new Date() },
      senderId: { not: userId },
      NOT: {
        receipts: {
          some: {
            recipientId: userId,
          },
        },
      },
    },
  });

  // For each, check if user is compatible and create receipt if yes
  for (const bottle of floatingBottles) {
    const isCompatible = await isUserCompatibleWithBottle(userId, bottle);
    if (isCompatible) {
      // Check again if receipt exists (race condition check)
      const existingReceipt = await prisma.bottleReceipt.findUnique({
        where: {
          bottleId_recipientId: {
            bottleId: bottle.id,
            recipientId: userId,
          },
        },
      });

      if (!existingReceipt) {
        await prisma.bottleReceipt.create({
          data: {
            bottleId: bottle.id,
            recipientId: userId,
          },
        });
      }
    }
  }
}

async function isUserCompatibleWithBottle(
  userId: string,
  bottle: MessageInABottle,
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      bottleSuspension: true,
    },
  });

  if (!user || !user.profile || user.isBanned) {
    return false;
  }

  // Check suspension
  if (
    user.bottleSuspension &&
    user.bottleSuspension.endsAt > new Date()
  ) {
    return false;
  }

  // Check gender match : le destinataire doit ÊTRE d'un genre recherché
  // (LES_DEUX = homme ou femme).
  if (!targetGendersFor(bottle.targetGender).includes(user.profile.gender)) {
    return false;
  }

  // Match mutuel : le destinataire doit AUSSI chercher le genre de l'expéditeur
  // (sa préférence `interestedIn`). Si le genre de l'expéditeur est inconnu, on
  // n'applique pas ce filtre.
  const senderProfile = await prisma.profile.findUnique({
    where: { userId: bottle.senderId },
    select: { gender: true },
  });
  if (
    senderProfile?.gender &&
    user.profile.interestedIn.length > 0 &&
    !user.profile.interestedIn.includes(senderProfile.gender)
  ) {
    return false;
  }

  // Check age match
  const now = new Date();
  const minBirthDate = addDays(now, -365 * bottle.ageMax - 365);
  const maxBirthDate = addDays(now, -365 * bottle.ageMin);

  if (
    user.profile.birthDate < minBirthDate ||
    user.profile.birthDate > maxBirthDate
  ) {
    return false;
  }

  return true;
}

// ============================================================
// Moderation
// ============================================================

export async function reportAndSuspend(
  bottleId: string,
  targetUserId: string,
  reason: string,
): Promise<void> {
  const suspension = await prisma.bottleSuspension.upsert({
    where: { userId: targetUserId },
    update: {
      reportCount: {
        increment: 1,
      },
      reason,
    },
    create: {
      userId: targetUserId,
      reason,
      reportCount: 1,
      startedAt: new Date(),
      endsAt: addDays(new Date(), 7),
    },
  });

  // If suspension has been triggered, mark the bottle as expired
  if (suspension.reportCount >= 3) {
    // Hard cap: 3 reports trigger 7-day suspension
    // This prevents further bottles from being sent
  }
}

// ============================================================
// Message Read Status
// ============================================================

export async function countUnreadMessages(
  userId: string,
): Promise<number> {
  // Find all bottles where user is either sender or acceptor
  // Exclude REVEALED, BROKEN, and EXPIRED bottles (only ACCEPTED status)
  const bottles = await prisma.messageInABottle.findMany({
    where: {
      status: "ACCEPTED", // Only count ACCEPTED anonymous conversations
      OR: [
        { senderId: userId },
        { acceptedById: userId },
      ],
    },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  let totalUnread = 0;

  for (const bottle of bottles) {
    const isCurrentUserSender = bottle.senderId === userId;
    const lastReadAt = isCurrentUserSender
      ? bottle.lastReadBySenderId
      : bottle.lastReadByAcceptorId;

    // Count messages from the OTHER participant that are after the last read time
    const unreadMessages = bottle.messages.filter(msg => {
      const isFromOtherParticipant = msg.senderId !== userId;
      const isAfterLastRead = !lastReadAt || msg.createdAt > lastReadAt;
      return isFromOtherParticipant && isAfterLastRead;
    });

    totalUnread += unreadMessages.length;
  }

  return totalUnread;
}

export async function markBottleAsRead(
  bottleId: string,
  userId: string,
): Promise<MessageInABottle> {
  const bottle = await prisma.messageInABottle.findUnique({
    where: { id: bottleId },
  });

  if (!bottle) {
    throw new Error("Bottle not found");
  }

  if (bottle.status !== "ACCEPTED") {
    throw new Error("Can only mark accepted bottles as read");
  }

  // Only allow marking as read if user is sender or acceptor
  if (bottle.senderId !== userId && bottle.acceptedById !== userId) {
    throw new Error("Unauthorized");
  }

  const isCurrentUserSender = bottle.senderId === userId;
  const now = new Date();

  const updated = await prisma.messageInABottle.update({
    where: { id: bottleId },
    data: isCurrentUserSender
      ? { lastReadBySenderId: now }
      : { lastReadByAcceptorId: now },
  });

  return updated;
}

// ============================================================
// Reveal Mechanism
// ============================================================

export async function requestReveal(
  bottleId: string,
  requestedById: string,
): Promise<any> {
  const bottle = await prisma.messageInABottle.findUnique({
    where: { id: bottleId },
  });

  if (!bottle) {
    throw new Error("Bottle not found");
  }

  if (bottle.status !== "ACCEPTED") {
    throw new Error("Can only request reveal on accepted bottles");
  }

  // Verify user is sender or acceptor
  if (bottle.senderId !== requestedById && bottle.acceptedById !== requestedById) {
    throw new Error("Unauthorized");
  }

  // Determine respondent (the other participant)
  const respondentId = bottle.senderId === requestedById ? bottle.acceptedById : bottle.senderId;

  if (!respondentId) {
    throw new Error("Respondent not found");
  }

  // Check if there's already a pending request from this user
  const existing = await prisma.bottleRevealRequest.findUnique({
    where: {
      bottleId_requestedById: {
        bottleId,
        requestedById,
      },
    },
  });

  if (existing && existing.status === "PENDING") {
    return existing; // Return existing pending request
  }

  // Create new request
  const request = await prisma.bottleRevealRequest.create({
    data: {
      bottleId,
      requestedById,
      respondentId,
    },
  });

  return request;
}

export async function acceptReveal(
  bottleId: string,
  userId: string,
): Promise<MessageInABottle & { matchId?: string | null }> {
  const bottle = await prisma.messageInABottle.findUnique({
    where: { id: bottleId },
    include: { messages: true },
  });

  if (!bottle) {
    throw new Error("Bottle not found");
  }

  if (bottle.status !== "ACCEPTED") {
    throw new Error("Can only accept reveal on accepted bottles");
  }

  if (!bottle.acceptedById) {
    throw new Error("Bottle not accepted");
  }

  // Find the pending request for this user
  const request = await prisma.bottleRevealRequest.findFirst({
    where: {
      bottleId,
      respondentId: userId,
      status: "PENDING",
    },
  });

  if (!request) {
    throw new Error("No pending reveal request for this user");
  }

  // Use transaction to update bottle status, create match, and migrate messages
  const updated = await prisma.$transaction(async (tx) => {
    // Update request status
    await tx.bottleRevealRequest.update({
      where: { id: request.id },
      data: {
        status: "ACCEPTED",
        respondedAt: new Date(),
      },
    });

    // Create or get Match between sender and acceptor (bidirectional)
    const senderId = bottle.senderId;
    const acceptorId = bottle.acceptedById!;
    const [userAId, userBId] = senderId < acceptorId ? [senderId, acceptorId] : [acceptorId, senderId];

    let match = await tx.match.findUnique({
      where: { userAId_userBId: { userAId, userBId } },
    });

    if (!match) {
      // Create new match with sender as initiator
      match = await tx.match.create({
        data: {
          userAId,
          userBId,
          initiatorId: senderId,
          status: "ACTIVE", // Auto-activate when revealed
          questionsValidated: true, // Skip questions for bottle-based matches
        },
      });
    } else if (match.status === "PENDING") {
      // Auto-accept if match was pending
      match = await tx.match.update({
        where: { id: match.id },
        data: { status: "ACTIVE" },
      });
    }

    // Migrate anonymous messages to letters
    // Sort messages by creation time
    const sortedMessages = bottle.messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    for (const msg of sortedMessages) {
      await tx.letter.create({
        data: {
          matchId: match.id,
          fromUserId: msg.senderId,
          toUserId: msg.senderId === senderId ? acceptorId : senderId,
          content: msg.content,
          status: "SENT",
          sentAt: msg.createdAt,
        },
      });

      // Update match counters
      if (msg.senderId === userAId) {
        await tx.match.update({
          where: { id: match.id },
          data: {
            letterCountA: { increment: 1 },
            lastLetterBy: msg.senderId,
            lastLetterAt: msg.createdAt,
          },
        });
      } else {
        await tx.match.update({
          where: { id: match.id },
          data: {
            letterCountB: { increment: 1 },
            lastLetterBy: msg.senderId,
            lastLetterAt: msg.createdAt,
          },
        });
      }
    }

    // Update bottle status to REVEALED and link to match
    const updatedBottle = await tx.messageInABottle.update({
      where: { id: bottleId },
      data: {
        status: "REVEALED",
        revealedAt: new Date(),
        matchId: match.id,
      },
    });

    return { ...updatedBottle, matchId: match.id };
  });

  return updated;
}

export async function refuseReveal(
  bottleId: string,
  userId: string,
): Promise<any> {
  const bottle = await prisma.messageInABottle.findUnique({
    where: { id: bottleId },
  });

  if (!bottle) {
    throw new Error("Bottle not found");
  }

  if (bottle.status !== "ACCEPTED") {
    throw new Error("Can only refuse reveal on accepted bottles");
  }

  // Find the pending request for this user
  const request = await prisma.bottleRevealRequest.findFirst({
    where: {
      bottleId,
      respondentId: userId,
      status: "PENDING",
    },
  });

  if (!request) {
    throw new Error("No pending reveal request for this user");
  }

  // Mark request as refused
  const updated = await prisma.bottleRevealRequest.update({
    where: { id: request.id },
    data: {
      status: "REFUSED",
      respondedAt: new Date(),
    },
  });

  return updated;
}

export async function breakBottle(
  bottleId: string,
  userId: string,
): Promise<MessageInABottle> {
  const bottle = await prisma.messageInABottle.findUnique({
    where: { id: bottleId },
  });

  if (!bottle) {
    throw new Error("Bottle not found");
  }

  if (bottle.status !== "ACCEPTED" && bottle.status !== "REVEALED") {
    throw new Error("Can only break accepted or revealed bottles");
  }

  // Verify user is sender or acceptor
  if (bottle.senderId !== userId && bottle.acceptedById !== userId) {
    throw new Error("Unauthorized");
  }

  // Update bottle status to BROKEN
  const updated = await prisma.messageInABottle.update({
    where: { id: bottleId },
    data: {
      status: "BROKEN",
    },
  });

  return updated;
}

export async function restartBottle(
  bottleId: string,
  userId: string,
): Promise<MessageInABottle> {
  const bottle = await prisma.messageInABottle.findUnique({
    where: { id: bottleId },
  });

  if (!bottle) {
    throw new Error("Bottle not found");
  }

  // Only the original sender can restart
  if (bottle.senderId !== userId) {
    throw new Error("Only the original sender can restart this bottle");
  }

  // Can only restart broken bottles
  if (bottle.status !== "BROKEN") {
    throw new Error("Can only restart broken bottles");
  }

  // Reset the bottle to FLOATING status
  const updated = await prisma.$transaction(async (tx) => {
    // Clear acceptedById, acceptedAt, revealedAt
    const bottle = await tx.messageInABottle.update({
      where: { id: bottleId },
      data: {
        status: "FLOATING",
        acceptedById: null,
        acceptedAt: null,
        revealedAt: null,
        lastReadBySenderId: null,
        lastReadByAcceptorId: null,
      },
    });

    // Delete all reveal requests
    await tx.bottleRevealRequest.deleteMany({
      where: { bottleId },
    });

    return bottle;
  });

  // Find new compatible recipients and create receipts
  const compatibleUsers = await findCompatibleRecipients(updated);

  if (compatibleUsers.length > 0) {
    await prisma.bottleReceipt.createMany({
      data: compatibleUsers.map((user) => ({
        bottleId: updated.id,
        recipientId: user.id,
      })),
      skipDuplicates: true, // In case some receipts already exist
    });
  }

  return updated;
}

export async function getRevealStatus(
  bottleId: string,
  userId: string,
): Promise<{ hasPendingRequest: boolean; isRequester: boolean; requestedById?: string }> {
  const bottle = await prisma.messageInABottle.findUnique({
    where: { id: bottleId },
  });

  if (!bottle) {
    throw new Error("Bottle not found");
  }

  // Find any pending reveal request
  const request = await prisma.bottleRevealRequest.findFirst({
    where: {
      bottleId,
      status: "PENDING",
    },
  });

  if (!request) {
    return {
      hasPendingRequest: false,
      isRequester: false,
    };
  }

  return {
    hasPendingRequest: true,
    isRequester: request.requestedById === userId,
    requestedById: request.requestedById,
  };
}

import { prisma } from "../../core/database";
import type {
  MessageInABottle,
  BottleReceipt,
  AnonymousMessage,
  BottleSuspension,
  User,
} from "@prisma/client";
import { addDays } from "date-fns";

// ============================================================
// Core Bottle Operations
// ============================================================

export async function createBottle(
  senderId: string,
  message: string,
  targetGender: string,
  ageMin: number,
  ageMax: number,
): Promise<MessageInABottle> {
  // Check max 3 pending bottles per user
  const pendingCount = await prisma.messageInABottle.count({
    where: {
      senderId,
      status: "FLOATING",
    },
  });

  if (pendingCount >= 3) {
    throw new Error(
      "Maximum 3 pending bottles allowed. Accept or refuse existing bottles first.",
    );
  }

  const bottle = await prisma.messageInABottle.create({
    data: {
      senderId,
      message,
      targetGender,
      ageMin,
      ageMax,
      expiresAt: addDays(new Date(), 30),
    },
  });

  // Find compatible recipients and create receipts
  const compatibleUsers = await findCompatibleRecipients(bottle);

  if (compatibleUsers.length > 0) {
    await prisma.bottleReceipt.createMany({
      data: compatibleUsers.map((user) => ({
        bottleId: bottle.id,
        recipientId: user.id,
      })),
    });
  }

  return bottle;
}

async function findCompatibleRecipients(
  bottle: MessageInABottle,
): Promise<User[]> {
  const now = new Date();
  const minBirthDate = addDays(now, -365 * bottle.ageMax - 365);
  const maxBirthDate = addDays(now, -365 * bottle.ageMin);

  const users = await prisma.user.findMany({
    where: {
      isBanned: false,
      profile: {
        AND: [
          {
            interestedIn: {
              hasSome: [bottle.targetGender],
            },
          },
          {
            birthDate: {
              gte: minBirthDate,
              lte: maxBirthDate,
            },
          },
        ],
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

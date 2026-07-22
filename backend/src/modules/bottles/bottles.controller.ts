import type { Response } from "express";
import type { AuthedRequest } from "../../core/types";
import { prisma } from "../../config/prisma";
import * as bottlesService from "./bottles.service";
import {
  CreateBottleBodySchema,
  CreateBottleResponseSchema,
  GetInboxResponseSchema,
  AcceptBottleBodySchema,
  AcceptBottleResponseSchema,
  RefuseBottleBodySchema,
  RefuseBottleResponseSchema,
  GetBottleMessagesResponseSchema,
  PostBottleMessageBodySchema,
  PostBottleMessageResponseSchema,
  GetUnreadCountResponseSchema,
  MarkBottleAsReadBodySchema,
  MarkBottleAsReadResponseSchema,
} from "./bottles.schemas";

// ============================================================
// POST /api/bottles/create
// ============================================================
export async function createBottle(req: AuthedRequest, res: Response) {
  const body = CreateBottleBodySchema.parse(req.body);
  const userId = req.user.userId;

  const bottle = await bottlesService.createBottle(
    userId,
    body.message,
    body.targetGender,
    body.ageMin,
    body.ageMax,
  );

  const validated = CreateBottleResponseSchema.parse(bottle);
  res.status(201).json({ data: validated });
}

// ============================================================
// GET /api/bottles/inbox
// ============================================================
export async function getInbox(req: AuthedRequest, res: Response) {
  const userId = req.user.userId;

  // Lazy evaluation: ensure receipts exist for compatible floating bottles
  await bottlesService.ensureReceiptsForFloatingBottles(userId);

  const receipts = await prisma.bottleReceipt.findMany({
    where: {
      recipientId: userId,
      status: "PENDING",
    },
    include: {
      bottle: true,
    },
  });

  const bottles = receipts
    .filter((r) => r.bottle !== null && r.bottle.status === "FLOATING" && (r.bottle.expiresAt === null || r.bottle.expiresAt > new Date()))
    .map((r) => r.bottle);

  const validated = GetInboxResponseSchema.parse({ bottles });

  res.json({ data: validated });
}

// ============================================================
// POST /api/bottles/:id/accept
// ============================================================
export async function acceptBottle(req: AuthedRequest, res: Response) {
  AcceptBottleBodySchema.parse(req.body);
  const bottleId = req.params["id"] as string;
  const userId = req.user.userId;

  // Verify receipt exists and is PENDING
  const receipt = await prisma.bottleReceipt.findUnique({
    where: {
      bottleId_recipientId: {
        bottleId,
        recipientId: userId,
      },
    },
  });

  if (!receipt) {
    return res.status(404).json({ error: "Receipt not found" });
  }

  if (receipt.status !== "PENDING") {
    return res
      .status(400)
      .json({ error: "Can only accept pending bottles" });
  }

  const bottle = await bottlesService.acceptBottle(bottleId, userId);
  const validated = AcceptBottleResponseSchema.parse(bottle);

  res.json({ data: validated });
}

// ============================================================
// POST /api/bottles/:id/refuse
// ============================================================
export async function refuseBottle(req: AuthedRequest, res: Response) {
  RefuseBottleBodySchema.parse(req.body);
  const bottleId = req.params["id"] as string;
  const userId = req.user.userId;

  // Verify receipt exists and is PENDING
  const receipt = await prisma.bottleReceipt.findUnique({
    where: {
      bottleId_recipientId: {
        bottleId,
        recipientId: userId,
      },
    },
  });

  if (!receipt) {
    return res.status(404).json({ error: "Receipt not found" });
  }

  if (receipt.status !== "PENDING") {
    return res
      .status(400)
      .json({ error: "Can only refuse pending bottles" });
  }

  await bottlesService.refuseBottle(bottleId, userId);

  res.json({ data: { success: true } });
}

// ============================================================
// GET /api/bottles/:id/messages
// ============================================================
export async function getMessages(req: AuthedRequest, res: Response) {
  const bottleId = req.params["id"] as string;
  const userId = req.user.userId;

  // Verify user is sender or acceptor
  const bottle = await prisma.messageInABottle.findUnique({
    where: { id: bottleId },
  });

  if (!bottle) {
    return res.status(404).json({ error: "Bottle not found" });
  }

  if (bottle.senderId !== userId && bottle.acceptedById !== userId) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const messages = await bottlesService.getMessages(bottleId);
  const validated = GetBottleMessagesResponseSchema.parse({ messages });

  res.json({ data: validated });
}

// ============================================================
// POST /api/bottles/:id/messages
// ============================================================
export async function postMessage(req: AuthedRequest, res: Response) {
  const body = PostBottleMessageBodySchema.parse(req.body);
  const bottleId = req.params["id"] as string;
  const userId = req.user.userId;

  // Verify user is sender or acceptor
  const bottle = await prisma.messageInABottle.findUnique({
    where: { id: bottleId },
  });

  if (!bottle) {
    return res.status(404).json({ error: "Bottle not found" });
  }

  if (bottle.senderId !== userId && bottle.acceptedById !== userId) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const message = await bottlesService.postMessage(
    bottleId,
    userId,
    body.content,
  );

  const validated = PostBottleMessageResponseSchema.parse(message);
  res.status(201).json({ data: validated });
}

// ============================================================
// GET /api/bottles/unread-count
// ============================================================
export async function getUnreadCount(req: AuthedRequest, res: Response) {
  const userId = req.user.userId;

  const count = await bottlesService.countUnreadMessages(userId);
  const validated = GetUnreadCountResponseSchema.parse({ count });

  res.json({ data: validated });
}

// ============================================================
// POST /api/bottles/:id/read
// ============================================================
export async function markBottleAsRead(req: AuthedRequest, res: Response) {
  MarkBottleAsReadBodySchema.parse(req.body);
  const bottleId = req.params["id"] as string;
  const userId = req.user.userId;

  const bottle = await bottlesService.markBottleAsRead(bottleId, userId);
  const validated = MarkBottleAsReadResponseSchema.parse(bottle);

  res.json({ data: validated });
}

import type { Response } from "express";
import type { AuthedRequest } from "../../core/types";
import { prisma } from "../../config/prisma";
import * as bottlesService from "./bottles.service";
import {
  CreateBottleBodySchema,
  CreateBottleResponseSchema,
  GetInboxResponseSchema,
  GetSentBottlesResponseSchema,
  GetBottleResponseSchema,
  AcceptBottleBodySchema,
  AcceptBottleResponseSchema,
  RefuseBottleBodySchema,
  GetBottleMessagesResponseSchema,
  PostBottleMessageBodySchema,
  PostBottleMessageResponseSchema,
  GetUnreadCountResponseSchema,
  MarkBottleAsReadBodySchema,
  MarkBottleAsReadResponseSchema,
  RequestRevealBodySchema,
  RequestRevealResponseSchema,
  AcceptRevealBodySchema,
  AcceptRevealResponseSchema,
  RefuseRevealBodySchema,
  RefuseRevealResponseSchema,
  BreakBottleBodySchema,
  BreakBottleResponseSchema,
  RestartBottleBodySchema,
  RestartBottleResponseSchema,
  GetRevealStatusResponseSchema,
  GetCurrentBottleResponseSchema,
  ReportBottleBodySchema,
  ReportBottleResponseSchema,
} from "./bottles.schemas";

function serializeDates<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString() as unknown as T;
  if (Array.isArray(value)) return value.map(serializeDates) as unknown as T;
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>)) {
      out[key] = serializeDates((value as Record<string, unknown>)[key]);
    }
    return out as unknown as T;
  }
  return value;
}

type BottleWithSenderCity = {
  senderId: string;
  senderCity?: string | null;
  [key: string]: unknown;
};

async function applyBottleLocationPrivacy<T extends BottleWithSenderCity>(
  bottles: T[],
  viewerId: string,
): Promise<T[]> {
  const otherSenderIds = [
    ...new Set(
      bottles
        .map((bottle) => bottle.senderId)
        .filter((id) => id && id !== viewerId),
    ),
  ];

  if (otherSenderIds.length === 0) return bottles;

  const settings = await prisma.userSettings.findMany({
    where: { userId: { in: otherSenderIds } },
    select: { userId: true, locationShared: true },
  });
  const sharedByUser = new Map(settings.map((entry) => [entry.userId, entry.locationShared]));

  return bottles.map((bottle) => {
    if (bottle.senderId === viewerId || sharedByUser.get(bottle.senderId) === true) {
      return bottle;
    }
    return { ...bottle, senderCity: null } as T;
  });
}

async function applySingleBottleLocationPrivacy<T extends BottleWithSenderCity>(
  bottle: T,
  viewerId: string,
): Promise<T> {
  const [sanitized] = await applyBottleLocationPrivacy([bottle], viewerId);
  return sanitized ?? bottle;
}

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

  const validated = CreateBottleResponseSchema.parse(serializeDates(bottle));
  res.status(201).json({ data: validated });
}

// ============================================================
// POST /api/bottles/cancel-pending
// ============================================================
export async function cancelPending(req: AuthedRequest, res: Response) {
  const userId = req.user.userId;
  const cancelled = await bottlesService.cancelPendingBottles(userId);
  res.json({ data: { cancelled } });
}

// ============================================================
// GET /api/bottles/:id
// ============================================================
export async function getBottleById(req: AuthedRequest, res: Response) {
  const bottleId = req.params["id"] as string;
  const userId = req.user.userId;
  const bottle = await bottlesService.getBottleForUser(bottleId, userId);
  if (!bottle) {
    return res.status(404).json({ error: "Bottle not found" });
  }

  const sanitized = await applySingleBottleLocationPrivacy(
    bottle as unknown as BottleWithSenderCity,
    userId,
  );
  const validated = GetBottleResponseSchema.parse(serializeDates(sanitized));
  res.json({ data: validated });
}

// ============================================================
// GET /api/bottles/sent
// ============================================================
export async function getSent(req: AuthedRequest, res: Response) {
  const userId = req.user.userId;
  const bottles = await bottlesService.getSentBottles(userId);
  const validated = GetSentBottlesResponseSchema.parse(serializeDates({ bottles }));
  res.json({ data: validated });
}

// ============================================================
// GET /api/bottles/inbox
// ============================================================
export async function getInbox(req: AuthedRequest, res: Response) {
  const userId = req.user.userId;

  await bottlesService.ensureReceiptsForFloatingBottles(userId);

  const receipts = await prisma.bottleReceipt.findMany({
    where: { recipientId: userId, status: "PENDING" },
    include: { bottle: true },
  });

  const pending = receipts
    .filter(
      (r) =>
        r.bottle !== null &&
        r.bottle.status === "FLOATING" &&
        (r.bottle.expiresAt === null || r.bottle.expiresAt > new Date()),
    )
    .map((r) => r.bottle);

  const accepted = await prisma.messageInABottle.findMany({
    where: {
      status: { in: ["ACCEPTED", "REVEALED"] },
      OR: [{ acceptedById: userId }, { senderId: userId }],
    },
    orderBy: { acceptedAt: "desc" },
  });

  const sentFloating = await prisma.messageInABottle.findMany({
    where: { senderId: userId, status: "FLOATING" },
    orderBy: { createdAt: "desc" },
  });

  const bottles = await applyBottleLocationPrivacy(
    [...pending, ...accepted, ...sentFloating] as unknown as BottleWithSenderCity[],
    userId,
  );

  const validated = GetInboxResponseSchema.parse(serializeDates({ bottles }));
  res.json({ data: validated });
}

// ============================================================
// POST /api/bottles/:id/accept
// ============================================================
export async function acceptBottle(req: AuthedRequest, res: Response) {
  AcceptBottleBodySchema.parse(req.body);
  const bottleId = req.params["id"] as string;
  const userId = req.user.userId;

  const receipt = await prisma.bottleReceipt.findUnique({
    where: { bottleId_recipientId: { bottleId, recipientId: userId } },
  });

  if (!receipt) return res.status(404).json({ error: "Receipt not found" });
  if (receipt.status !== "PENDING") {
    return res.status(400).json({ error: "Can only accept pending bottles" });
  }

  const bottle = await bottlesService.acceptBottle(bottleId, userId);
  const validated = AcceptBottleResponseSchema.parse(serializeDates(bottle));
  res.json({ data: validated });
}

// ============================================================
// POST /api/bottles/:id/refuse
// ============================================================
export async function refuseBottle(req: AuthedRequest, res: Response) {
  RefuseBottleBodySchema.parse(req.body);
  const bottleId = req.params["id"] as string;
  const userId = req.user.userId;

  const receipt = await prisma.bottleReceipt.findUnique({
    where: { bottleId_recipientId: { bottleId, recipientId: userId } },
  });

  if (!receipt) return res.status(404).json({ error: "Receipt not found" });
  if (receipt.status !== "PENDING") {
    return res.status(400).json({ error: "Can only refuse pending bottles" });
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

  try {
    const result = await bottlesService.getMessages(bottleId, userId);
    const validated = GetBottleMessagesResponseSchema.parse(serializeDates(result));
    res.json({ data: validated });
  } catch (error: any) {
    const code = error.code || error.message;
    if (code === "BOTTLE_NOT_FOUND") return res.status(404).json({ error: "Bottle not found" });
    if (code === "NOT_BOTTLE_PARTICIPANT") return res.status(403).json({ error: "Not a participant" });
    throw error;
  }
}

// ============================================================
// POST /api/bottles/:id/messages
// ============================================================
export async function postMessage(req: AuthedRequest, res: Response) {
  const body = PostBottleMessageBodySchema.parse(req.body);
  const bottleId = req.params["id"] as string;
  const userId = req.user.userId;

  try {
    const result = await bottlesService.postMessage(
      bottleId,
      userId,
      body.content,
      body.idempotencyKey,
    );

    const validated = PostBottleMessageResponseSchema.parse(serializeDates(result));
    res.status(result.idempotentReplay ? 200 : 201).json({ data: validated });
  } catch (error: any) {
    const code = error.code || error.message;
    if (code === "BOTTLE_NOT_FOUND") return res.status(404).json({ error: "Bottle not found" });
    if (code === "NOT_BOTTLE_PARTICIPANT") return res.status(403).json({ error: "Not a participant" });
    if (code === "BOTTLE_NOT_ACTIVE") {
      return res.status(409).json({ error: "Bottle is not active", code: "BOTTLE_NOT_ACTIVE" });
    }
    if (code === "LETTER_TURN_VIOLATION") {
      return res.status(409).json({ error: "It's not your turn to respond", code: "LETTER_TURN_VIOLATION" });
    }
    throw error;
  }
}

// ============================================================
// GET /api/bottles/unread-count
// ============================================================
export async function getUnreadCount(req: AuthedRequest, res: Response) {
  const count = await bottlesService.countUnreadMessages(req.user.userId);
  const validated = GetUnreadCountResponseSchema.parse({ count });
  res.json({ data: validated });
}

// ============================================================
// POST /api/bottles/:id/read
// ============================================================
export async function markBottleAsRead(req: AuthedRequest, res: Response) {
  MarkBottleAsReadBodySchema.parse(req.body);
  const bottle = await bottlesService.markBottleAsRead(
    req.params["id"] as string,
    req.user.userId,
  );
  const validated = MarkBottleAsReadResponseSchema.parse(serializeDates(bottle));
  res.json({ data: validated });
}

// ============================================================
// POST /api/bottles/:id/reveal/request
// ============================================================
export async function requestReveal(req: AuthedRequest, res: Response) {
  RequestRevealBodySchema.parse(req.body);
  const bottleId = req.params["id"] as string;
  const userId = req.user.userId;

  try {
    const request = await bottlesService.requestReveal(bottleId, userId);
    const validated = RequestRevealResponseSchema.parse(serializeDates(request));
    res.json({ data: validated });
  } catch (error: any) {
    const code = error.code || error.message;
    if (code === "REVEAL_ALREADY_REFUSED") {
      return res.status(409).json({
        error: { message: error.message, code: "REVEAL_ALREADY_REFUSED" },
      });
    }
    if (code === "REVEAL_ALREADY_ACCEPTED") {
      return res.status(409).json({
        error: { message: error.message, code: "REVEAL_ALREADY_ACCEPTED" },
      });
    }
    throw error;
  }
}

// ============================================================
// POST /api/bottles/:id/reveal/accept
// ============================================================
export async function acceptReveal(req: AuthedRequest, res: Response) {
  AcceptRevealBodySchema.parse(req.body);
  const bottle = await bottlesService.acceptReveal(
    req.params["id"] as string,
    req.user.userId,
  );
  const validated = AcceptRevealResponseSchema.parse(serializeDates(bottle));
  res.json({ data: validated });
}

// ============================================================
// POST /api/bottles/:id/reveal/refuse
// ============================================================
export async function refuseReveal(req: AuthedRequest, res: Response) {
  RefuseRevealBodySchema.parse(req.body);
  const request = await bottlesService.refuseReveal(
    req.params["id"] as string,
    req.user.userId,
  );
  const validated = RefuseRevealResponseSchema.parse(serializeDates(request));
  res.json({ data: validated });
}

// ============================================================
// POST /api/bottles/:id/break
// ============================================================
export async function breakBottle(req: AuthedRequest, res: Response) {
  BreakBottleBodySchema.parse(req.body);
  const bottle = await bottlesService.breakBottle(
    req.params["id"] as string,
    req.user.userId,
  );
  const validated = BreakBottleResponseSchema.parse(serializeDates(bottle));
  res.json({ data: validated });
}

// ============================================================
// POST /api/bottles/:id/restart
// ============================================================
export async function restartBottle(req: AuthedRequest, res: Response) {
  RestartBottleBodySchema.parse(req.body);
  const bottle = await bottlesService.restartBottle(
    req.params["id"] as string,
    req.user.userId,
  );
  const validated = RestartBottleResponseSchema.parse(serializeDates(bottle));
  res.json({ data: validated });
}

// ============================================================
// GET /api/bottles/:id/reveal/status
// ============================================================
export async function getRevealStatus(req: AuthedRequest, res: Response) {
  const status = await bottlesService.getRevealStatus(
    req.params["id"] as string,
    req.user.userId,
  );
  const validated = GetRevealStatusResponseSchema.parse(status);
  res.json({ data: validated });
}

// ============================================================
// POST /api/bottles/:id/report
// ============================================================
export async function reportBottle(req: AuthedRequest, res: Response) {
  const body = ReportBottleBodySchema.parse(req.body);
  const result = await bottlesService.reportBottle(
    req.params["id"] as string,
    req.user.userId,
    body.reason,
    body.details,
  );
  const validated = ReportBottleResponseSchema.parse(result);
  res.json({ data: validated });
}

// ============================================================
// GET /api/bottles/current
// ============================================================
export async function getCurrentBottle(req: AuthedRequest, res: Response) {
  const result = await bottlesService.getCurrentBottle(req.user.userId);
  const validated = GetCurrentBottleResponseSchema.parse(result);
  res.json({ data: validated });
}

import type { Response } from "express";
import type { AuthedRequest } from "../../core/types";
import { prisma } from "../../core/database";
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

  const receipts = await prisma.bottleReceipt.findMany({
    where: {
      recipientId: userId,
      status: "PENDING",
    },
    include: {
      bottle: true,
    },
  });

  const bottles = receipts.map((r) => r.bottle);
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

  await bottlesService.refuseBottle(bottleId, userId);

  res.json({ data: { success: true } });
}

// ============================================================
// GET /api/bottles/:id/messages
// ============================================================
export async function getMessages(req: AuthedRequest, res: Response) {
  const bottleId = req.params["id"] as string;

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

  const message = await bottlesService.postMessage(
    bottleId,
    userId,
    body.content,
  );

  const validated = PostBottleMessageResponseSchema.parse(message);
  res.status(201).json({ data: validated });
}

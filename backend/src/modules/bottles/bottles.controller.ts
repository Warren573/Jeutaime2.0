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
} from "./bottles.schemas";

// ============================================================
// Sérialisation Date → chaîne ISO
// ------------------------------------------------------------
// Prisma renvoie les champs DateTime comme objets `Date`. Les schémas de
// réponse Zod exigent `z.string().datetime()` — un `Date` échoue donc à la
// validation ("Expected string, received date") et provoque un 500 APRÈS que
// l'enregistrement a été créé en base. On convertit récursivement les `Date`
// en ISO avant toute validation de réponse.
// ============================================================
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

// ============================================================
// POST /api/bottles/create
// ============================================================
export async function createBottle(req: AuthedRequest, res: Response) {
  const correlationId = Math.random().toString(36).substring(7);
  const startTime = Date.now();

  try {
    console.log(`[B1-BOTTLE] ${correlationId} | REQUEST RECEIVED | path=${req.path} method=${req.method}`);

    console.log(`[B2-BOTTLE] ${correlationId} | REQUIREAUTH CHECK | userId=${req.user?.userId}`);
    if (!req.user?.userId) {
      throw new Error('No userId in req.user');
    }
    console.log(`[B3-BOTTLE] ${correlationId} | REQUIREAUTH PASSED | userId=${req.user.userId}`);

    console.log(`[B4-BOTTLE] ${correlationId} | ZOD VALIDATION START | body=${JSON.stringify(req.body)}`);
    const body = CreateBottleBodySchema.parse(req.body);
    const userId = req.user.userId;
    console.log(`[B5-BOTTLE] ${correlationId} | ZOD VALIDATION PASSED | payload parsed`);

    console.log(`[B6-BOTTLE] ${correlationId} | CONTROLLER CALL START | userId=${userId}`);
    const bottle = await bottlesService.createBottle(
      userId,
      body.message,
      body.targetGender,
      body.ageMin,
      body.ageMax,
      correlationId,
    );
    console.log(`[B7-BOTTLE] ${correlationId} | CONTROLLER CALL SUCCESS | bottleId=${bottle.id}`);

    console.log(`[B8-BOTTLE] ${correlationId} | RESPONSE SCHEMA VALIDATION START`);
    const validated = CreateBottleResponseSchema.parse(serializeDates(bottle));
    console.log(`[B9-BOTTLE] ${correlationId} | RESPONSE SCHEMA VALIDATION PASSED`);

    const duration = Date.now() - startTime;
    console.log(`[B10-BOTTLE] ${correlationId} | SENDING 201 RESPONSE | duration=${duration}ms | id=${bottle.id}`);
    res.status(201).json({ data: validated });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[BACKEND-ERROR] ${correlationId} | EXCEPTION CAUGHT | duration=${duration}ms | error=${error?.message} | stack=${error?.stack}`);
    throw error;
  }
}

// ============================================================
// POST /api/bottles/cancel-pending
// Expire les bouteilles FLOATING de l'utilisateur courant (libère le quota).
// ============================================================
export async function cancelPending(req: AuthedRequest, res: Response) {
  const userId = req.user.userId;
  const cancelled = await bottlesService.cancelPendingBottles(userId);
  res.json({ data: { cancelled } });
}

// ============================================================
// GET /api/bottles/:id — détail (expéditeur ou accepteur)
// ============================================================
export async function getBottleById(req: AuthedRequest, res: Response) {
  const bottleId = req.params["id"] as string;
  const userId = req.user.userId;
  const bottle = await bottlesService.getBottleForUser(bottleId, userId);
  if (!bottle) {
    return res.status(404).json({ error: "Bottle not found" });
  }
  const validated = GetBottleResponseSchema.parse(serializeDates(bottle));
  res.json({ data: validated });
}

// ============================================================
// GET /api/bottles/sent — historique des bouteilles envoyées
// ============================================================
export async function getSent(req: AuthedRequest, res: Response) {
  const userId = req.user.userId;
  const bottles = await bottlesService.getSentBottles(userId);
  const validated = GetSentBottlesResponseSchema.parse(
    serializeDates({ bottles }),
  );
  res.json({ data: validated });
}

// ============================================================
// GET /api/bottles/inbox
// ============================================================
export async function getInbox(req: AuthedRequest, res: Response) {
  const userId = req.user.userId;

  // Lazy evaluation: ensure receipts exist for compatible floating bottles
  await bottlesService.ensureReceiptsForFloatingBottles(userId);

  // Received floating bottles (pending receipts)
  const receipts = await prisma.bottleReceipt.findMany({
    where: {
      recipientId: userId,
      status: "PENDING",
    },
    include: {
      bottle: true,
    },
  });

  const pending = receipts
    .filter((r) => r.bottle !== null && r.bottle.status === "FLOATING" && (r.bottle.expiresAt === null || r.bottle.expiresAt > new Date()))
    .map((r) => r.bottle);

  // Conversations actives : bouteilles acceptées où l'utilisateur est
  // l'accepteur OU l'expéditeur. Les DEUX parties doivent voir la discussion
  // (sinon l'expéditeur d'une bouteille acceptée n'a aucun accès au chat).
  const accepted = await prisma.messageInABottle.findMany({
    where: {
      status: { in: ["ACCEPTED", "REVEALED"] },
      OR: [{ acceptedById: userId }, { senderId: userId }],
    },
    orderBy: { acceptedAt: "desc" },
  });

  // Sent floating bottles (user's bottles en route)
  const sentFloating = await prisma.messageInABottle.findMany({
    where: {
      senderId: userId,
      status: "FLOATING",
    },
    orderBy: { createdAt: "desc" },
  });

  const bottles = [...pending, ...accepted, ...sentFloating];

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

  try {
    const result = await bottlesService.getMessages(bottleId, userId);
    const validated = GetBottleMessagesResponseSchema.parse(serializeDates(result));

    res.json({ data: validated });
  } catch (error: any) {
    const code = error.code || error.message;

    if (code === "BOTTLE_NOT_FOUND") {
      return res.status(404).json({ error: "Bottle not found" });
    }
    if (code === "NOT_BOTTLE_PARTICIPANT") {
      return res.status(403).json({ error: "Not a participant" });
    }

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

    const validated = PostBottleMessageResponseSchema.parse(
      serializeDates(result),
    );
    // 200 if replay, 201 if new
    const statusCode = result.idempotentReplay ? 200 : 201;
    res.status(statusCode).json({ data: validated });
  } catch (error: any) {
    const code = error.code || error.message;

    if (code === "BOTTLE_NOT_FOUND") {
      return res.status(404).json({ error: "Bottle not found" });
    }
    if (code === "NOT_BOTTLE_PARTICIPANT") {
      return res.status(403).json({ error: "Not a participant" });
    }
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

    if (code === "REVEAL_REQUEST_ALREADY_EXISTS") {
      return res.status(409).json({
        error: {
          message: "Vous avez déjà demandé le dévoilement. En attente de réponse ou refusée.",
          code: "REVEAL_REQUEST_ALREADY_EXISTS"
        }
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
  const bottleId = req.params["id"] as string;
  const userId = req.user.userId;

  const bottle = await bottlesService.acceptReveal(bottleId, userId);
  const validated = AcceptRevealResponseSchema.parse(serializeDates(bottle));

  res.json({ data: validated });
}

// ============================================================
// POST /api/bottles/:id/reveal/refuse
// ============================================================
export async function refuseReveal(req: AuthedRequest, res: Response) {
  RefuseRevealBodySchema.parse(req.body);
  const bottleId = req.params["id"] as string;
  const userId = req.user.userId;

  const request = await bottlesService.refuseReveal(bottleId, userId);
  const validated = RefuseRevealResponseSchema.parse(serializeDates(request));

  res.json({ data: validated });
}

// ============================================================
// POST /api/bottles/:id/break
// ============================================================
export async function breakBottle(req: AuthedRequest, res: Response) {
  BreakBottleBodySchema.parse(req.body);
  const bottleId = req.params["id"] as string;
  const userId = req.user.userId;

  const bottle = await bottlesService.breakBottle(bottleId, userId);
  const validated = BreakBottleResponseSchema.parse(serializeDates(bottle));

  res.json({ data: validated });
}

// ============================================================
// POST /api/bottles/:id/restart
// ============================================================
export async function restartBottle(req: AuthedRequest, res: Response) {
  RestartBottleBodySchema.parse(req.body);
  const bottleId = req.params["id"] as string;
  const userId = req.user.userId;

  const bottle = await bottlesService.restartBottle(bottleId, userId);
  const validated = RestartBottleResponseSchema.parse(serializeDates(bottle));

  res.json({ data: validated });
}

// ============================================================
// GET /api/bottles/:id/reveal/status
// ============================================================
export async function getRevealStatus(req: AuthedRequest, res: Response) {
  const bottleId = req.params["id"] as string;
  const userId = req.user.userId;

  const status = await bottlesService.getRevealStatus(bottleId, userId);
  const validated = GetRevealStatusResponseSchema.parse(status);

  res.json({ data: validated });
}

// ============================================================
// GET /api/bottles/current
// ============================================================
export async function getCurrentBottle(req: AuthedRequest, res: Response) {
  const userId = req.user.userId;
  console.log("[CONTROLLER] getCurrentBottle called", { userId, path: req.path });

  try {
    const result = await bottlesService.getCurrentBottle(userId);
    console.log("[CONTROLLER] Service returned:", {
      hasBottle: !!result.bottle,
      hasLatest: !!result.latestLetter,
      canCreate: result.canCreateBottle,
    });
    console.log("[CONTROLLER] Full result:", JSON.stringify(result, null, 2));

    const validated = GetCurrentBottleResponseSchema.parse(result);
    console.log("[CONTROLLER] Validation passed, sending 200 OK");

    console.log("[CONTROLLER] Sending response:", { status: 200, dataKeys: Object.keys(validated) });
    res.json({ data: validated });
  } catch (error: any) {
    console.error("[CONTROLLER] getCurrentBottle ERROR:", {
      message: error?.message,
      code: error?.code,
      status: res.statusCode,
      stack: error?.stack,
    });
    console.error("[CONTROLLER] Full error:", error);
    throw error;
  }
}

import { Router, Response } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { validate } from "../../core/middleware/validate";
import { requireAuth } from "../../core/middleware/auth";
import type { AuthedRequest } from "../../core/types";
import { ConflictError } from "../../core/errors";
import { prisma } from "../../config/prisma";
import { isPremiumActive } from "../../policies/premium";
import * as controller from "./bottles.controller";
import { MAX_FLOATING_FREE, MAX_FLOATING_PREMIUM } from "./bottles.service";
import {
  CreateBottleBodySchema,
  AcceptBottleBodySchema,
  RefuseBottleBodySchema,
  PostBottleMessageBodySchema,
  MarkBottleAsReadBodySchema,
  RequestRevealBodySchema,
  AcceptRevealBodySchema,
  RefuseRevealBodySchema,
  BreakBottleBodySchema,
  RestartBottleBodySchema,
} from "./bottles.schemas";

const router = Router();

router.use(requireAuth as never);

const wrap = (
  fn: (req: AuthedRequest, res: Response) => Promise<void>,
) => asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

router.post(
  "/create",
  validate(CreateBottleBodySchema),
  wrap(async (req, res) => {
    await controller.createBottle(req as AuthedRequest, res);
  }),
);

router.post(
  "/cancel-pending",
  wrap(async (req, res) => {
    await controller.cancelPending(req as AuthedRequest, res);
  }),
);

router.get(
  "/sent",
  wrap(async (req, res) => {
    await controller.getSent(req as AuthedRequest, res);
  }),
);

router.get(
  "/inbox",
  wrap(async (req, res) => {
    await controller.getInbox(req as AuthedRequest, res);
  }),
);

router.post(
  "/:id/accept",
  validate(AcceptBottleBodySchema),
  wrap(async (req, res) => {
    const bottleId = req.params["id"] as string;
    const userId = req.user.userId;

    const bottle = await prisma.$transaction(
      async (tx) => {
        const [activeAccepted, accepter] = await Promise.all([
          tx.messageInABottle.count({
            where: { acceptedById: userId, status: "ACCEPTED" },
          }),
          tx.user.findUnique({
            where: { id: userId },
            select: { premiumTier: true, premiumUntil: true },
          }),
        ]);

        const maxAccepted =
          accepter && isPremiumActive(accepter)
            ? MAX_FLOATING_PREMIUM
            : MAX_FLOATING_FREE;

        if (activeAccepted >= maxAccepted) {
          throw new ConflictError(
            maxAccepted === 1
              ? "Tu as déjà une bouteille acceptée en cours. Termine-la avant d'en accepter une autre. (Premium : jusqu'à 5)"
              : `Tu as déjà ${activeAccepted} bouteilles acceptées (max ${maxAccepted}).`,
          );
        }

        const claimed = await tx.messageInABottle.updateMany({
          where: {
            id: bottleId,
            status: "FLOATING",
            acceptedById: null,
          },
          data: {
            status: "ACCEPTED",
            acceptedById: userId,
            acceptedAt: new Date(),
          },
        });

        if (claimed.count !== 1) {
          throw new ConflictError(
            "Cette bouteille vient d'être récupérée. Choisis-en une autre.",
          );
        }

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

        await tx.bottleReceipt.updateMany({
          where: {
            bottleId,
            recipientId: { not: userId },
            status: "PENDING",
          },
          data: {
            status: "TAKEN",
            actionAt: new Date(),
          },
        });

        const acceptedBottle = await tx.messageInABottle.findUnique({
          where: { id: bottleId },
        });

        if (!acceptedBottle) {
          throw new Error("Bottle not found after acceptance");
        }

        return acceptedBottle;
      },
      { isolationLevel: "Serializable" },
    );

    res.json({ data: bottle });
  }),
);

router.post(
  "/:id/refuse",
  validate(RefuseBottleBodySchema),
  wrap(async (req, res) => {
    await controller.refuseBottle(req as AuthedRequest, res);
  }),
);

router.get(
  "/:id/messages",
  wrap(async (req, res) => {
    await controller.getMessages(req as AuthedRequest, res);
  }),
);

// Continue the same bottle conversation after profile reveal.
// ACCEPTED uses the original service. REVEALED keeps turn-by-turn and idempotency,
// but no longer rejects the conversation simply because identities are known.
router.post(
  "/:id/messages",
  validate(PostBottleMessageBodySchema),
  wrap(async (req, res) => {
    const bottleId = req.params["id"] as string;
    const userId = req.user.userId;
    const { content, idempotencyKey } = req.body as { content: string; idempotencyKey: string };

    const bottle = await prisma.messageInABottle.findUnique({
      where: { id: bottleId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    if (!bottle || bottle.status !== "REVEALED") {
      await controller.postMessage(req as AuthedRequest, res);
      return;
    }

    if (bottle.senderId !== userId && bottle.acceptedById !== userId) {
      res.status(403).json({ error: "Not a participant" });
      return;
    }

    const existing = await prisma.anonymousMessage.findFirst({
      where: { senderId: userId, idempotencyKey },
    });
    if (existing) {
      res.json({ data: { message: existing, idempotentReplay: true } });
      return;
    }

    const lastSenderId = bottle.messages.length > 0
      ? bottle.messages[bottle.messages.length - 1]!.senderId
      : bottle.senderId;

    if (lastSenderId === userId) {
      res.status(409).json({
        error: "It's not your turn to respond",
        code: "LETTER_TURN_VIOLATION",
      });
      return;
    }

    const message = await prisma.anonymousMessage.create({
      data: {
        bottleId,
        senderId: userId,
        content,
        idempotencyKey,
      },
    });

    res.status(201).json({ data: { message, idempotentReplay: false } });
  }),
);

router.get(
  "/unread-count",
  wrap(async (req, res) => {
    await controller.getUnreadCount(req as AuthedRequest, res);
  }),
);

router.post(
  "/:id/read",
  validate(MarkBottleAsReadBodySchema),
  wrap(async (req, res) => {
    const bottleId = req.params["id"] as string;
    const userId = req.user.userId;
    const bottle = await prisma.messageInABottle.findUnique({ where: { id: bottleId } });

    if (bottle?.status !== "REVEALED") {
      await controller.markBottleAsRead(req as AuthedRequest, res);
      return;
    }

    if (bottle.senderId !== userId && bottle.acceptedById !== userId) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    const updated = await prisma.messageInABottle.update({
      where: { id: bottleId },
      data: bottle.senderId === userId
        ? { lastReadBySenderId: new Date() }
        : { lastReadByAcceptorId: new Date() },
    });
    res.json({ data: { id: updated.id, status: updated.status } });
  }),
);

router.post(
  "/:id/reveal/request",
  validate(RequestRevealBodySchema),
  wrap(async (req, res) => {
    await controller.requestReveal(req as AuthedRequest, res);
  }),
);

router.post(
  "/:id/reveal/accept",
  validate(AcceptRevealBodySchema),
  wrap(async (req, res) => {
    await controller.acceptReveal(req as AuthedRequest, res);
  }),
);

router.post(
  "/:id/reveal/refuse",
  validate(RefuseRevealBodySchema),
  wrap(async (req, res) => {
    await controller.refuseReveal(req as AuthedRequest, res);
  }),
);

router.post(
  "/:id/break",
  validate(BreakBottleBodySchema),
  wrap(async (req, res) => {
    await controller.breakBottle(req as AuthedRequest, res);
  }),
);

router.post(
  "/:id/restart",
  validate(RestartBottleBodySchema),
  wrap(async (req, res) => {
    await controller.restartBottle(req as AuthedRequest, res);
  }),
);

router.get(
  "/:id/reveal/status",
  wrap(async (req, res) => {
    await controller.getRevealStatus(req as AuthedRequest, res);
  }),
);

// ACCEPTED and REVEALED both remain valid bottle correspondences.
router.get(
  "/current",
  wrap(async (req, res) => {
    const userId = req.user.userId;
    const bottle = await prisma.messageInABottle.findFirst({
      where: {
        status: { in: ["ACCEPTED", "REVEALED"] },
        OR: [{ senderId: userId }, { acceptedById: userId }],
      },
      include: { messages: { orderBy: { createdAt: "asc" } } },
      orderBy: [{ acceptedAt: "desc" }, { createdAt: "desc" }],
    });

    if (!bottle) {
      const pendingCount = await prisma.messageInABottle.count({
        where: { senderId: userId, status: "FLOATING" },
      });
      const sender = await prisma.user.findUnique({
        where: { id: userId },
        select: { premiumTier: true, premiumUntil: true },
      });
      const maxFloating = sender && isPremiumActive(sender) ? MAX_FLOATING_PREMIUM : MAX_FLOATING_FREE;
      res.json({
        data: {
          bottle: null,
          latestLetter: null,
          canReply: false,
          waitingForReply: false,
          canCreateBottle: pendingCount < maxFloating,
          canBreak: false,
          messageCount: 0,
        },
      });
      return;
    }

    const allMessages = [
      {
        id: bottle.id,
        content: bottle.message,
        createdAt: bottle.createdAt,
        senderId: bottle.senderId,
        source: "INITIAL_BOTTLE" as const,
      },
      ...bottle.messages.map((m) => ({
        id: m.id,
        content: m.content,
        createdAt: m.createdAt,
        senderId: m.senderId,
        source: "ANONYMOUS_MESSAGE" as const,
      })),
    ];

    const latest = allMessages[allMessages.length - 1]!;
    const isMine = latest.senderId === userId;
    const hasAcceptorReply = !!bottle.acceptedById && bottle.messages.some((m) => m.senderId === bottle.acceptedById);
    const pendingCount = await prisma.messageInABottle.count({
      where: { senderId: userId, status: "FLOATING" },
    });
    const sender = await prisma.user.findUnique({
      where: { id: userId },
      select: { premiumTier: true, premiumUntil: true },
    });
    const maxFloating = sender && isPremiumActive(sender) ? MAX_FLOATING_PREMIUM : MAX_FLOATING_FREE;

    res.json({
      data: {
        bottle: { id: bottle.id, status: bottle.status },
        latestLetter: {
          id: latest.id,
          content: latest.content,
          createdAt: latest.createdAt.toISOString(),
          isMine,
          source: latest.source,
        },
        canReply: !isMine,
        waitingForReply: isMine,
        canCreateBottle: pendingCount < maxFloating,
        canBreak: hasAcceptorReply,
        messageCount: allMessages.length,
      },
    });
  }),
);

router.post(
  "/:id/report",
  wrap(async (req, res) => {
    await controller.reportBottle(req as AuthedRequest, res);
  }),
);

// Return participant ids and match id as well: the revealed-profile menu needs them.
// Respect location privacy for the sender even on this raw detail route.
router.get(
  "/:id",
  wrap(async (req, res) => {
    const bottleId = req.params["id"] as string;
    const userId = req.user.userId;
    const bottle = await prisma.messageInABottle.findUnique({ where: { id: bottleId } });

    if (!bottle || (bottle.senderId !== userId && bottle.acceptedById !== userId)) {
      res.status(404).json({ error: "Bottle not found" });
      return;
    }

    if (bottle.senderId === userId) {
      res.json({ data: bottle });
      return;
    }

    const settings = await prisma.userSettings.findUnique({
      where: { userId: bottle.senderId },
      select: { locationShared: true },
    });

    res.json({
      data: settings?.locationShared === true
        ? bottle
        : { ...bottle, senderCity: null },
    });
  }),
);

export default router;
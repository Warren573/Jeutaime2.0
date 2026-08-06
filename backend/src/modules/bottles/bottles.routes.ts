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

// POST /api/bottles/create — create a new bottle
router.post(
  "/create",
  validate(CreateBottleBodySchema),
  wrap(async (req, res) => {
    await controller.createBottle(req as AuthedRequest, res);
  }),
);

// POST /api/bottles/cancel-pending — expire current user's floating bottles
router.post(
  "/cancel-pending",
  wrap(async (req, res) => {
    await controller.cancelPending(req as AuthedRequest, res);
  }),
);

// GET /api/bottles/sent — sent-bottle history for current user
router.get(
  "/sent",
  wrap(async (req, res) => {
    await controller.getSent(req as AuthedRequest, res);
  }),
);

// GET /api/bottles/inbox — get pending bottles for user
router.get(
  "/inbox",
  wrap(async (req, res) => {
    await controller.getInbox(req as AuthedRequest, res);
  }),
);

// POST /api/bottles/:id/accept — accept a bottle
// A bottle already REVEALED has moved to the match/profile flow and must no
// longer consume an active anonymous-correspondence slot.
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

// POST /api/bottles/:id/refuse — refuse a bottle
router.post(
  "/:id/refuse",
  validate(RefuseBottleBodySchema),
  wrap(async (req, res) => {
    await controller.refuseBottle(req as AuthedRequest, res);
  }),
);

// GET /api/bottles/:id/messages — get messages for a bottle
router.get(
  "/:id/messages",
  wrap(async (req, res) => {
    await controller.getMessages(req as AuthedRequest, res);
  }),
);

// POST /api/bottles/:id/messages — post anonymous message to a bottle
router.post(
  "/:id/messages",
  validate(PostBottleMessageBodySchema),
  wrap(async (req, res) => {
    await controller.postMessage(req as AuthedRequest, res);
  }),
);

// GET /api/bottles/unread-count — get total unread message count
router.get(
  "/unread-count",
  wrap(async (req, res) => {
    await controller.getUnreadCount(req as AuthedRequest, res);
  }),
);

// POST /api/bottles/:id/read — mark bottle as read
router.post(
  "/:id/read",
  validate(MarkBottleAsReadBodySchema),
  wrap(async (req, res) => {
    await controller.markBottleAsRead(req as AuthedRequest, res);
  }),
);

// POST /api/bottles/:id/reveal/request — request reveal
router.post(
  "/:id/reveal/request",
  validate(RequestRevealBodySchema),
  wrap(async (req, res) => {
    await controller.requestReveal(req as AuthedRequest, res);
  }),
);

// POST /api/bottles/:id/reveal/accept — accept reveal
router.post(
  "/:id/reveal/accept",
  validate(AcceptRevealBodySchema),
  wrap(async (req, res) => {
    await controller.acceptReveal(req as AuthedRequest, res);
  }),
);

// POST /api/bottles/:id/reveal/refuse — refuse reveal
router.post(
  "/:id/reveal/refuse",
  validate(RefuseRevealBodySchema),
  wrap(async (req, res) => {
    await controller.refuseReveal(req as AuthedRequest, res);
  }),
);

// POST /api/bottles/:id/break — break correspondence
router.post(
  "/:id/break",
  validate(BreakBottleBodySchema),
  wrap(async (req, res) => {
    await controller.breakBottle(req as AuthedRequest, res);
  }),
);

// POST /api/bottles/:id/restart — restart bottle
router.post(
  "/:id/restart",
  validate(RestartBottleBodySchema),
  wrap(async (req, res) => {
    await controller.restartBottle(req as AuthedRequest, res);
  }),
);

// GET /api/bottles/:id/reveal/status — get reveal request status
router.get(
  "/:id/reveal/status",
  wrap(async (req, res) => {
    await controller.getRevealStatus(req as AuthedRequest, res);
  }),
);

// GET /api/bottles/current — get most recent active correspondence
router.get(
  "/current",
  wrap(async (req, res) => {
    await controller.getCurrentBottle(req as AuthedRequest, res);
  }),
);

// POST /api/bottles/:id/report — report conversation, backend determines target user
router.post(
  "/:id/report",
  wrap(async (req, res) => {
    await controller.reportBottle(req as AuthedRequest, res);
  }),
);

// GET /api/bottles/:id — bottle detail (sender or acceptor)
// IMPORTANT: déclaré APRÈS les routes GET spécifiques (/sent, /inbox,
// /unread-count, /current) pour ne pas les masquer.
router.get(
  "/:id",
  wrap(async (req, res) => {
    await controller.getBottleById(req as AuthedRequest, res);
  }),
);

export default router;

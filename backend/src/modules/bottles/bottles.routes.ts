import { Router, Request, Response } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { validate } from "../../core/middleware/validate";
import { requireAuth } from "../../core/middleware/auth";
import type { AuthedRequest } from "../../core/types";
import { prisma } from "../../config/prisma";
import { isPremiumActive } from "../../policies/premium";
import { MAX_FLOATING_FREE, MAX_FLOATING_PREMIUM } from "./bottles.service";
import { maskBottleParticipantsForViewer } from "./bottles.privacy";
import * as controller from "./bottles.controller";
import {
  CreateBottleBodySchema,
  RefuseBottleBodySchema,
  PostBottleMessageBodySchema,
  MarkBottleAsReadBodySchema,
  RequestRevealBodySchema,
  AcceptRevealBodySchema,
  RefuseRevealBodySchema,
  BreakBottleBodySchema,
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
  "/:id/claim-reply",
  validate(PostBottleMessageBodySchema),
  wrap(async (req, res) => {
    await controller.claimReply(req as AuthedRequest, res);
  }),
);

// Désactivée (PR 2 sécurité Bouteilles) : accepter sans répondre contournait la règle « la première réponse écrite attribue la bouteille ».
// Aucun écran accessible de l'app ne l'appelle. 410 = route retirée, sans effet sur les données.
router.post(
  "/:id/accept",
  (_req: Request, res: Response) => {
    res.status(410).json({ error: { code: "BOTTLE_ACCEPT_DISABLED", message: "Une bouteille s'accepte en y répondant (POST /bottles/:id/claim-reply)." } });
  },
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

// Both anonymous and revealed letters use the same transactional service.
router.post(
  "/:id/messages",
  validate(PostBottleMessageBodySchema),
  wrap(async (req, res) => {
    await controller.postMessage(req as AuthedRequest, res);
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

// Désactivée (PR 2 sécurité Bouteilles) : elle remettait en mer une bouteille contenant encore les messages privés de l'ancienne conversation.
// Aucun écran accessible de l'app ne l'appelle. 410 = route retirée, sans effet sur les données.
router.post(
  "/:id/restart",
  (_req: Request, res: Response) => {
    res.status(410).json({ error: { code: "BOTTLE_RESTART_DISABLED", message: "La remise à la mer d'une bouteille rompue est désactivée." } });
  },
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

    // Anonymat : l'identifiant de l'autre participant n'est transmis qu'après
    // dévoilement mutuel (le menu « profil dévoilé » en a alors besoin).
    const visible = maskBottleParticipantsForViewer(bottle, userId);

    if (bottle.senderId === userId) {
      res.json({ data: visible });
      return;
    }

    const settings = await prisma.userSettings.findUnique({
      where: { userId: bottle.senderId },
      select: { locationShared: true },
    });

    res.json({
      data: settings?.locationShared === true
        ? visible
        : { ...visible, senderCity: null },
    });
  }),
);

export default router;
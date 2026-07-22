import { Router, Response } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { validate } from "../../core/middleware/validate";
import { requireAuth } from "../../core/middleware/auth";
import type { AuthedRequest } from "../../core/types";
import * as controller from "./bottles.controller";
import {
  CreateBottleBodySchema,
  AcceptBottleBodySchema,
  RefuseBottleBodySchema,
  PostBottleMessageBodySchema,
  MarkBottleAsReadBodySchema,
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

// GET /api/bottles/inbox — get pending bottles for user
router.get(
  "/inbox",
  wrap(async (req, res) => {
    await controller.getInbox(req as AuthedRequest, res);
  }),
);

// POST /api/bottles/:id/accept — accept a bottle
router.post(
  "/:id/accept",
  validate(AcceptBottleBodySchema),
  wrap(async (req, res) => {
    await controller.acceptBottle(req as AuthedRequest, res);
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

export default router;

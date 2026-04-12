import { Router, Response } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { validate } from "../../core/middleware/validate";
import { requireAuth } from "../../core/middleware/auth";
import { AuthedRequest } from "../../core/types";
import {
  ListNotificationsQuerySchema,
  NotificationIdParamsSchema,
} from "./notifications.schemas";
import * as ctrl from "./notifications.controller";

const router = Router();

router.use(requireAuth as never);

const wrap = (
  fn: (req: AuthedRequest, res: Response) => Promise<void>,
) => asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

// GET /api/notifications
router.get(
  "/",
  validate(ListNotificationsQuerySchema, "query"),
  wrap(ctrl.handleListMine),
);

// GET /api/notifications/unread-count
router.get("/unread-count", wrap(ctrl.handleUnreadCount));

// POST /api/notifications/read-all
router.post("/read-all", wrap(ctrl.handleMarkAllAsRead));

// PATCH /api/notifications/:id/read
router.patch(
  "/:id/read",
  validate(NotificationIdParamsSchema, "params"),
  wrap(ctrl.handleMarkAsRead),
);

export default router;

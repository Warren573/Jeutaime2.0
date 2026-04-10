import { Router } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { requireAuth } from "../../core/middleware/auth";
import * as ctrl from "./letters.controller";
import { AuthedRequest } from "../../core/types";

const router = Router();

router.use(requireAuth as never);

const wrap = (
  fn: (req: AuthedRequest, res: import("express").Response) => Promise<void>,
) => asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

// PATCH /api/letters/:id/read — Marquer une lettre comme lue
router.patch("/:id/read", wrap(ctrl.handleMarkRead));

// GET /api/letters/unread-count — Nombre de lettres non lues
router.get("/unread-count", wrap(ctrl.handleUnreadCount));

export default router;

import { Router, Response } from "express";
import { Role } from "@prisma/client";
import { asyncHandler } from "../../../core/utils/asyncHandler";
import { validate } from "../../../core/middleware/validate";
import { requireAuth, requireRole } from "../../../core/middleware/auth";
import { AuthedRequest } from "../../../core/types";
import {
  BanUserSchema,
  UnbanUserSchema,
  UserIdParamsSchema,
  WarnUserSchema,
} from "./adminUsers.schemas";
import * as ctrl from "./adminUsers.controller";

const router = Router();

router.use(requireAuth as never);

const wrap = (
  fn: (req: AuthedRequest, res: Response) => Promise<void>,
) => asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

// POST /api/admin/users/:id/ban — ADMIN only
router.post(
  "/:id/ban",
  requireRole(Role.ADMIN) as never,
  validate(UserIdParamsSchema, "params"),
  validate(BanUserSchema),
  wrap(ctrl.handleBan),
);

// POST /api/admin/users/:id/unban — ADMIN only
router.post(
  "/:id/unban",
  requireRole(Role.ADMIN) as never,
  validate(UserIdParamsSchema, "params"),
  validate(UnbanUserSchema),
  wrap(ctrl.handleUnban),
);

// POST /api/admin/users/:id/warn — ADMIN ou MODERATOR
router.post(
  "/:id/warn",
  requireRole(Role.ADMIN, Role.MODERATOR) as never,
  validate(UserIdParamsSchema, "params"),
  validate(WarnUserSchema),
  wrap(ctrl.handleWarn),
);

export default router;

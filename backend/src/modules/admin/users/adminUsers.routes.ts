import { Router, Response } from "express";
import { Role } from "@prisma/client";
import { asyncHandler } from "../../../core/utils/asyncHandler";
import { validate } from "../../../core/middleware/validate";
import { requireAuth, requireRole } from "../../../core/middleware/auth";
import { AuthedRequest } from "../../../core/types";
import {
  AdjustCoinsSchema,
  BanUserSchema,
  UnbanUserSchema,
  UpdateRoleSchema,
  UserIdParamsSchema,
  WarnUserSchema,
} from "./adminUsers.schemas";
import * as ctrl from "./adminUsers.controller";

const router = Router();

router.use(requireAuth as never);

const wrap = (
  fn: (req: AuthedRequest, res: Response) => Promise<void>,
) => asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

// GET /api/admin/users — ADMIN only
router.get(
  "/",
  requireRole(Role.ADMIN) as never,
  wrap(ctrl.handleListUsers),
);

// GET /api/admin/users/:id — ADMIN only
router.get(
  "/:id",
  requireRole(Role.ADMIN) as never,
  validate(UserIdParamsSchema, "params"),
  wrap(ctrl.handleGetUserDetail),
);

// POST /api/admin/users/:id/coins — ADMIN only
router.post(
  "/:id/coins",
  requireRole(Role.ADMIN) as never,
  validate(UserIdParamsSchema, "params"),
  validate(AdjustCoinsSchema),
  wrap(ctrl.handleAdjustCoins),
);

// PATCH /api/admin/users/:id/role — ADMIN only
router.patch(
  "/:id/role",
  requireRole(Role.ADMIN) as never,
  validate(UserIdParamsSchema, "params"),
  validate(UpdateRoleSchema),
  wrap(ctrl.handleUpdateRole),
);

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

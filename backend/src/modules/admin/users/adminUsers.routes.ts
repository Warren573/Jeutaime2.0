import { Router, Response } from "express";
import { Role } from "@prisma/client";
import { asyncHandler } from "../../../core/utils/asyncHandler";
import { validate } from "../../../core/middleware/validate";
import { requireAuth, requireRole } from "../../../core/middleware/auth";
import { AuthedRequest } from "../../../core/types";
import {
  AdjustCoinsSchema,
  BanUserSchema,
  GrantPremiumSchema,
  ResetRefugeSchema,
  ResetSalonsSchema,
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

// POST /api/admin/users/:id/premium — ADMIN only
router.post(
  "/:id/premium",
  requireRole(Role.ADMIN) as never,
  validate(UserIdParamsSchema, "params"),
  validate(GrantPremiumSchema),
  wrap(ctrl.handleGrantPremium),
);

// POST /api/admin/users/:id/reset-salons — OWNER only
router.post(
  "/:id/reset-salons",
  requireRole(Role.OWNER) as never,
  validate(UserIdParamsSchema, "params"),
  validate(ResetSalonsSchema),
  wrap(ctrl.handleResetSalons),
);

// POST /api/admin/users/:id/reset-refuge — OWNER only
router.post(
  "/:id/reset-refuge",
  requireRole(Role.OWNER) as never,
  validate(UserIdParamsSchema, "params"),
  validate(ResetRefugeSchema),
  wrap(ctrl.handleResetRefuge),
);

// POST /api/admin/users/:id/reset-bottles — OWNER only
router.post(
  "/:id/reset-bottles",
  requireRole(Role.OWNER) as never,
  validate(UserIdParamsSchema, "params"),
  validate(ResetRefugeSchema),
  wrap(ctrl.handleResetBottles),
);

// POST /api/admin/users/:id/repair-letters — OWNER only
router.post(
  "/:id/repair-letters",
  requireRole(Role.OWNER) as never,
  validate(UserIdParamsSchema, "params"),
  validate(ResetRefugeSchema),
  wrap(ctrl.handleRepairLetters),
);

// PATCH /api/admin/users/:id/role — OWNER only
router.patch(
  "/:id/role",
  requireRole(Role.OWNER) as never,
  validate(UserIdParamsSchema, "params"),
  validate(UpdateRoleSchema),
  wrap(ctrl.handleUpdateRole),
);

// POST /api/admin/users/:id/ban — ADMIN ou MODERATOR
router.post(
  "/:id/ban",
  requireRole(Role.ADMIN, Role.MODERATOR) as never,
  validate(UserIdParamsSchema, "params"),
  validate(BanUserSchema),
  wrap(ctrl.handleBan),
);

// POST /api/admin/users/:id/unban — ADMIN ou MODERATOR
router.post(
  "/:id/unban",
  requireRole(Role.ADMIN, Role.MODERATOR) as never,
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

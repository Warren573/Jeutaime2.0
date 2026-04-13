import { Router, Response } from "express";
import { Role } from "@prisma/client";
import { asyncHandler } from "../../../core/utils/asyncHandler";
import { validate } from "../../../core/middleware/validate";
import { requireAuth, requireRole } from "../../../core/middleware/auth";
import { AuthedRequest } from "../../../core/types";
import { ListAuditQuerySchema } from "./adminAudit.schemas";
import * as ctrl from "./adminAudit.controller";

const router = Router();

// ADMIN only — la lecture du journal d'audit est sensible
router.use(requireAuth as never);
router.use(requireRole(Role.ADMIN) as never);

const wrap = (
  fn: (req: AuthedRequest, res: Response) => Promise<void>,
) => asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

// GET /api/admin/audit-log
router.get(
  "/",
  validate(ListAuditQuerySchema, "query"),
  wrap(ctrl.handleList),
);

export default router;

import { Router, Response } from "express";
import { Role } from "@prisma/client";
import { asyncHandler } from "../../../core/utils/asyncHandler";
import { validate } from "../../../core/middleware/validate";
import { requireAuth, requireRole } from "../../../core/middleware/auth";
import { AuthedRequest } from "../../../core/types";
import {
  ListReportsQuerySchema,
  ReportIdParamsSchema,
  UpdateReportSchema,
} from "./adminReports.schemas";
import * as ctrl from "./adminReports.controller";

const router = Router();

// Lecture + update : ADMIN ou MODERATOR
router.use(requireAuth as never);
router.use(requireRole(Role.ADMIN, Role.MODERATOR) as never);

const wrap = (
  fn: (req: AuthedRequest, res: Response) => Promise<void>,
) => asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

// GET /api/admin/reports
router.get(
  "/",
  validate(ListReportsQuerySchema, "query"),
  wrap(ctrl.handleList),
);

// GET /api/admin/reports/:id
router.get(
  "/:id",
  validate(ReportIdParamsSchema, "params"),
  wrap(ctrl.handleGetById),
);

// PATCH /api/admin/reports/:id
router.patch(
  "/:id",
  validate(ReportIdParamsSchema, "params"),
  validate(UpdateReportSchema),
  wrap(ctrl.handleUpdate),
);

export default router;

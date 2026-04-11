import { Router, Response } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { validate } from "../../core/middleware/validate";
import { requireAuth } from "../../core/middleware/auth";
import { AuthedRequest } from "../../core/types";
import {
  CreateReportSchema,
  ListMyReportsQuerySchema,
} from "./reports.schemas";
import * as ctrl from "./reports.controller";

const router = Router();

router.use(requireAuth as never);

const wrap = (
  fn: (req: AuthedRequest, res: Response) => Promise<void>,
) => asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

// POST /api/reports
router.post("/", validate(CreateReportSchema), wrap(ctrl.handleCreate));

// GET /api/reports/mine
router.get(
  "/mine",
  validate(ListMyReportsQuerySchema, "query"),
  wrap(ctrl.handleListMine),
);

export default router;

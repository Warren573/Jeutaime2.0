import { Router, Response } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { requireAuth } from "../../core/middleware/auth";
import { AuthedRequest } from "../../core/types";
import * as ctrl from "./stats.controller";

const router = Router();

router.use(requireAuth as never);

const wrap = (
  fn: (req: AuthedRequest, res: Response) => Promise<void>,
) => asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

// GET /api/stats/community
router.get("/community", wrap(ctrl.handleGetCommunityStats));

// GET /api/stats/daily
router.get("/daily", wrap(ctrl.handleGetDailyStats));

// GET /api/stats/refuge
router.get("/refuge", wrap(ctrl.handleGetRefugeStats));

export default router;

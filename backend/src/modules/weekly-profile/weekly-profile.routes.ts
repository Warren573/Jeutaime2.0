import { Router, Response } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { validate } from "../../core/middleware/validate";
import { requireAuth } from "../../core/middleware/auth";
import { AuthedRequest } from "../../core/types";
import { VoteWeeklyProfileSchema } from "./weekly-profile.schemas";
import * as ctrl from "./weekly-profile.controller";

const router = Router();

router.use(requireAuth as never);

const wrap = (
  fn: (req: AuthedRequest, res: Response) => Promise<void>,
) => asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

// GET /api/weekly-profile
router.get("/", wrap(ctrl.handleGetWeeklyProfile));

// POST /api/weekly-profile/vote
router.post("/vote", validate(VoteWeeklyProfileSchema), wrap(ctrl.handleVote));

export default router;

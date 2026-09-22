import { Router, Response } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { requireAuth } from "../../core/middleware/auth";
import { AuthedRequest } from "../../core/types";
import * as ctrl from "./journal.controller";

const router = Router();
router.use(requireAuth as never);

const wrap = (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

router.get("/edition", wrap(ctrl.handleGetTodayEdition));

export default router;

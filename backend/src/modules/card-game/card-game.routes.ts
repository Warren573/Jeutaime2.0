import { Router, Response } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { validate } from "../../core/middleware/validate";
import { requireAuth } from "../../core/middleware/auth";
import { AuthedRequest } from "../../core/types";
import { RevealCardSchema } from "./card-game.schemas";
import * as ctrl from "./card-game.controller";

const router = Router();

router.use(requireAuth as never);

const wrap = (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

// POST /api/card-game/start
router.post("/start", wrap(ctrl.handleStart));

// POST /api/card-game/:sessionId/reveal
router.post("/:sessionId/reveal", validate(RevealCardSchema), wrap(ctrl.handleReveal));

// POST /api/card-game/:sessionId/claim
router.post("/:sessionId/claim", wrap(ctrl.handleClaim));

// POST /api/card-game/:sessionId/bet
router.post("/:sessionId/bet", wrap(ctrl.handleBet));

// GET /api/card-game/history
router.get("/history", wrap(ctrl.handleHistory));

export default router;

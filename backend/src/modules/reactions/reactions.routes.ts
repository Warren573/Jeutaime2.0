import { Router } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { validate } from "../../core/middleware/validate";
import { requireAuth } from "../../core/middleware/auth";
import { SendReactionSchema } from "./reactions.schemas";
import * as ctrl from "./reactions.controller";
import type { AuthedRequest } from "../../core/types";

const router = Router();

router.use(requireAuth as never);

const wrap = (
  fn: (req: AuthedRequest, res: import("express").Response) => Promise<void>,
) => asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

// POST /api/discover/react — Envoyer un sourire ou une grimace
router.post("/react", validate(SendReactionSchema), wrap(ctrl.handleSend));

export default router;

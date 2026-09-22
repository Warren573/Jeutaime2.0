import { Router, Response } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { validate } from "../../core/middleware/validate";
import { requireAuth } from "../../core/middleware/auth";
import { AuthedRequest } from "../../core/types";
import {
  CreatePrivateDuelSchema,
  PrivateDuelIdParamsSchema,
  SubmitPrivateDuelChoiceSchema,
} from "./private-duels.schemas";
import * as ctrl from "./private-duels.controller";

const router = Router();
router.use(requireAuth as never);

const wrap = (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

// GET /api/private-duels
router.get("/", wrap(ctrl.handleListMine));

// GET /api/private-duels/candidates
router.get("/candidates", wrap(ctrl.handleListCandidates));

// GET /api/private-duels/stats
router.get("/stats", wrap(ctrl.handleGetStats));

// POST /api/private-duels
router.post("/", validate(CreatePrivateDuelSchema), wrap(ctrl.handleCreate));

// GET /api/private-duels/:id
router.get(
  "/:id",
  validate(PrivateDuelIdParamsSchema, "params"),
  wrap(ctrl.handleGetOne),
);

// POST /api/private-duels/:id/choice
router.post(
  "/:id/choice",
  validate(PrivateDuelIdParamsSchema, "params"),
  validate(SubmitPrivateDuelChoiceSchema),
  wrap(ctrl.handleSubmitChoice),
);

// POST /api/private-duels/:id/decline
router.post(
  "/:id/decline",
  validate(PrivateDuelIdParamsSchema, "params"),
  wrap(ctrl.handleDecline),
);

// POST /api/private-duels/:id/rematch
router.post(
  "/:id/rematch",
  validate(PrivateDuelIdParamsSchema, "params"),
  wrap(ctrl.handleRematch),
);

export default router;

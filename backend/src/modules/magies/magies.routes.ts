import { Router, Response } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { validate } from "../../core/middleware/validate";
import { requireAuth } from "../../core/middleware/auth";
import { AuthedRequest } from "../../core/types";
import {
  BreakMagieSchema,
  CastMagieSchema,
  MagieIdParamsSchema,
  UserIdParamsSchema,
} from "./magies.schemas";
import * as ctrl from "./magies.controller";

const router = Router();

router.use(requireAuth as never);

const wrap = (
  fn: (req: AuthedRequest, res: Response) => Promise<void>,
) => asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

// GET /api/magies/catalog
router.get("/catalog", wrap(ctrl.handleCatalog));

// POST /api/magies/cast
router.post("/cast", validate(CastMagieSchema), wrap(ctrl.handleCast));

// GET /api/magies/active/:userId
router.get(
  "/active/:userId",
  validate(UserIdParamsSchema, "params"),
  wrap(ctrl.handleListActive),
);

// POST /api/magies/:id/break
router.post(
  "/:id/break",
  validate(MagieIdParamsSchema, "params"),
  validate(BreakMagieSchema),
  wrap(ctrl.handleBreak),
);

export default router;

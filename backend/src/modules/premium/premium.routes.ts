import { Router, Response } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { validate } from "../../core/middleware/validate";
import { requireAuth } from "../../core/middleware/auth";
import { AuthedRequest } from "../../core/types";
import { SubscribePremiumSchema } from "./premium.schemas";
import * as ctrl from "./premium.controller";

const router = Router();

router.use(requireAuth as never);

const wrap = (
  fn: (req: AuthedRequest, res: Response) => Promise<void>,
) => asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

// GET /api/premium/plans
router.get("/plans", wrap(ctrl.handleGetPlans));

// GET /api/premium/me
router.get("/me", wrap(ctrl.handleGetMyStatus));

// POST /api/premium/subscribe
router.post(
  "/subscribe",
  validate(SubscribePremiumSchema),
  wrap(ctrl.handleSubscribe),
);

// POST /api/premium/cancel
router.post("/cancel", wrap(ctrl.handleCancel));

export default router;

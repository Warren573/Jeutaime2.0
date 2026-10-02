import { Router, Response } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { requireAuth } from "../../core/middleware/auth";
import { validate } from "../../core/middleware/validate";
import { AuthedRequest } from "../../core/types";
import { PrivateInvitationParamsSchema, PrivateSessionParamsSchema } from "./privateSalons.schemas";
import * as ctrl from "./privateSalons.controller";

const router = Router();
router.use(requireAuth as never);

const wrap = (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

router.get("/", wrap(ctrl.handleListMine));
router.post("/:id/accept", validate(PrivateInvitationParamsSchema, "params"), wrap(ctrl.handleAccept));
router.get("/session/:sessionId", validate(PrivateSessionParamsSchema, "params"), wrap(ctrl.handleSession));

export default router;

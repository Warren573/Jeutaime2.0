import { Router, Response } from "express";
import { Role } from "@prisma/client";
import { asyncHandler } from "../../../core/utils/asyncHandler";
import { requireAuth, requireRole } from "../../../core/middleware/auth";
import { validate } from "../../../core/middleware/validate";
import { AuthedRequest } from "../../../core/types";
import {
  CreatePrivateSalonSchema,
  PrivateSalonInviteParamsSchema,
  SendAdminMessageSchema,
  UserParamsSchema,
} from "./adminEngagement.schemas";
import * as ctrl from "./adminEngagement.controller";

const router = Router();
router.use(requireAuth as never);
router.use(requireRole(Role.ADMIN) as never);

const wrap = (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

router.post("/users/:id/messages", validate(UserParamsSchema, "params"), validate(SendAdminMessageSchema), wrap(ctrl.handleSendMessage));
router.get("/users/:id/messages", validate(UserParamsSchema, "params"), wrap(ctrl.handleListUserMessages));

router.post("/private-salons", validate(CreatePrivateSalonSchema), wrap(ctrl.handleCreatePrivateSalon));
router.get("/private-salons", wrap(ctrl.handleListPrivateSalons));
router.post("/private-salons/:sessionId/invite/:userId", validate(PrivateSalonInviteParamsSchema, "params"), wrap(ctrl.handleInvite));
router.delete("/private-salons/:sessionId/invite/:userId", validate(PrivateSalonInviteParamsSchema, "params"), wrap(ctrl.handleRemove));

export default router;

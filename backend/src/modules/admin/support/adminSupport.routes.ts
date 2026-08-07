import { Router, Response } from "express";
import { Role } from "@prisma/client";
import { asyncHandler } from "../../../core/utils/asyncHandler";
import { validate } from "../../../core/middleware/validate";
import { requireAuth, requireRole } from "../../../core/middleware/auth";
import { AuthedRequest } from "../../../core/types";
import { SupportTicketIdParamsSchema, UpdateSupportTicketSchema } from "./adminSupport.schemas";
import * as ctrl from "./adminSupport.controller";

const router = Router();

router.use(requireAuth as never);
router.use(requireRole(Role.ADMIN, Role.MODERATOR) as never);

const wrap = (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

router.get("/", wrap(ctrl.handleList));
router.patch(
  "/:id",
  validate(SupportTicketIdParamsSchema, "params"),
  validate(UpdateSupportTicketSchema),
  wrap(ctrl.handleUpdate),
);

export default router;

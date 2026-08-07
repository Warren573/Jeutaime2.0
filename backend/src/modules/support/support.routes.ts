import { Router, Response } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { validate } from "../../core/middleware/validate";
import { requireAuth } from "../../core/middleware/auth";
import { AuthedRequest } from "../../core/types";
import { CreateSupportTicketSchema } from "./support.schemas";
import * as ctrl from "./support.controller";

const router = Router();

router.use(requireAuth as never);

const wrap = (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

router.post("/tickets", validate(CreateSupportTicketSchema), wrap(ctrl.handleCreateTicket));
router.get("/tickets/mine", wrap(ctrl.handleListMine));

export default router;

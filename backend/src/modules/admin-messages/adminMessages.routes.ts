import { Router, Response } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { requireAuth } from "../../core/middleware/auth";
import { validate } from "../../core/middleware/validate";
import { AuthedRequest } from "../../core/types";
import { AdminMessageIdParamsSchema } from "./adminMessages.schemas";
import * as ctrl from "./adminMessages.controller";

const router = Router();
router.use(requireAuth as never);

const wrap = (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

router.get("/", wrap(ctrl.handleListMine));
router.patch("/:id/read", validate(AdminMessageIdParamsSchema, "params"), wrap(ctrl.handleRead));

export default router;

import { Router, Response } from "express";
import { Role } from "@prisma/client";
import { asyncHandler } from "../../../core/utils/asyncHandler";
import { requireAuth, requireRole } from "../../../core/middleware/auth";
import { validate } from "../../../core/middleware/validate";
import { AuthedRequest } from "../../../core/types";
import { CreateCommunityJournalPostSchema } from "./adminJournal.schemas";
import * as ctrl from "./adminJournal.controller";

const router = Router();
router.use(requireAuth as never);
router.use(requireRole(Role.ADMIN) as never);

const wrap = (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

router.get("/", wrap(ctrl.handleList));
router.post("/", validate(CreateCommunityJournalPostSchema), wrap(ctrl.handleCreate));

export default router;

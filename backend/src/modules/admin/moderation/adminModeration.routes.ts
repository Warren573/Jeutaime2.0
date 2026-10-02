import { Router, Response } from "express";
import { Role } from "@prisma/client";
import { asyncHandler } from "../../../core/utils/asyncHandler";
import { validate } from "../../../core/middleware/validate";
import { requireAuth, requireRole } from "../../../core/middleware/auth";
import { AuthedRequest } from "../../../core/types";
import {
  ModeratePhotoSchema,
  ModerateProfileSchema,
  ModerateSalonMessageSchema,
  PhotoModerationParamsSchema,
  ProfileModerationParamsSchema,
  SalonMessageParamsSchema,
} from "./adminModeration.schemas";
import * as ctrl from "./adminModeration.controller";

const router = Router();
router.use(requireAuth as never);
router.use(requireRole(Role.ADMIN, Role.MODERATOR) as never);

const wrap = (
  fn: (req: AuthedRequest, res: Response) => Promise<void>,
) => asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

router.get("/overview", wrap(ctrl.handleOverview));
router.get("/photos", wrap(ctrl.handleListPhotos));
router.get("/photos/:id/file", validate(PhotoModerationParamsSchema, "params"), wrap(ctrl.handlePhotoFile));
router.patch("/photos/:id", validate(PhotoModerationParamsSchema, "params"), validate(ModeratePhotoSchema), wrap(ctrl.handleModeratePhoto));

router.get("/profiles/:id", validate(ProfileModerationParamsSchema, "params"), wrap(ctrl.handleProfileContent));
router.patch("/profiles/:id", validate(ProfileModerationParamsSchema, "params"), validate(ModerateProfileSchema), wrap(ctrl.handleModerateProfile));

router.get("/salon-messages", wrap(ctrl.handleListSalonMessages));
router.patch("/salon-messages/:id", validate(SalonMessageParamsSchema, "params"), validate(ModerateSalonMessageSchema), wrap(ctrl.handleModerateSalonMessage));

export default router;

import { Router } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { validate } from "../../core/middleware/validate";
import { requireAuth } from "../../core/middleware/auth";
import { UpdateProfileSchema, UpdateQuestionsSchema, DiscoveryQuerySchema } from "./profiles.schemas";
import * as ctrl from "./profiles.controller";
import { AuthedRequest } from "../../core/types";

const router = Router();

// Toutes les routes /profiles nécessitent auth
router.use(requireAuth as never);

const wrap = (fn: (req: AuthedRequest, res: import("express").Response) => Promise<void>) =>
  asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

// GET /api/profiles/me
router.get("/me", wrap(ctrl.handleGetMe));

// PATCH /api/profiles/me
router.patch("/me", validate(UpdateProfileSchema), wrap(ctrl.handleUpdateMe));

// PUT /api/profiles/me/questions
router.put("/me/questions", validate(UpdateQuestionsSchema), wrap(ctrl.handleUpdateQuestions));

// GET /api/profiles/me/photos
router.get("/me/photos", wrap(ctrl.handleGetMyPhotos));

// GET /api/profiles — discovery
router.get(
  "/",
  validate(DiscoveryQuerySchema, "query"),
  wrap(ctrl.handleDiscovery),
);

// GET /api/profiles/:id
router.get("/:id", wrap(ctrl.handleGetProfile));

// POST /api/profiles/:id/block
router.post("/:id/block", wrap(ctrl.handleBlock));

// DELETE /api/profiles/:id/block
router.delete("/:id/block", wrap(ctrl.handleUnblock));

export default router;

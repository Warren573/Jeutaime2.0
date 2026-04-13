import { Router } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { validate } from "../../core/middleware/validate";
import { requireAuth } from "../../core/middleware/auth";
import { ChangePasswordSchema } from "./users.schemas";
import * as ctrl from "./users.controller";
import { AuthedRequest } from "../../core/types";

const router = Router();

router.use(requireAuth as never);

const wrap = (fn: (req: AuthedRequest, res: import("express").Response) => Promise<void>) =>
  asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

// POST /api/users/me/password
router.post("/me/password", validate(ChangePasswordSchema), wrap(ctrl.handleChangePassword));

// POST /api/users/me/deactivate
router.post("/me/deactivate", wrap(ctrl.handleDeactivate));

// DELETE /api/users/me
router.delete("/me", wrap(ctrl.handleDeleteAccount));

export default router;

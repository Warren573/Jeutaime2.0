import { Router } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { validate } from "../../core/middleware/validate";
import { requireAuth } from "../../core/middleware/auth";
import { authRateLimit } from "../../core/middleware/rateLimit";
import { RegisterSchema, LoginSchema, RefreshSchema } from "./auth.schemas";
import * as ctrl from "./auth.controller";
import { AuthedRequest } from "../../core/types";

const router = Router();

// POST /api/auth/register
router.post(
  "/register",
  authRateLimit,
  validate(RegisterSchema),
  asyncHandler(ctrl.handleRegister),
);

// POST /api/auth/login
router.post(
  "/login",
  authRateLimit,
  validate(LoginSchema),
  asyncHandler(ctrl.handleLogin),
);

// POST /api/auth/refresh
router.post(
  "/refresh",
  validate(RefreshSchema),
  asyncHandler(ctrl.handleRefresh),
);

// POST /api/auth/logout (🔒)
router.post(
  "/logout",
  requireAuth as never,
  asyncHandler((req, res, next) => ctrl.handleLogout(req as AuthedRequest, res).catch(next)),
);

// GET /api/auth/me (🔒)
router.get(
  "/me",
  requireAuth as never,
  asyncHandler((req, res, next) => ctrl.handleMe(req as AuthedRequest, res).catch(next)),
);

export default router;

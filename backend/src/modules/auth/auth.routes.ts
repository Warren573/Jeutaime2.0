import { Router } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { validate } from "../../core/middleware/validate";
import { requireAuth } from "../../core/middleware/auth";
import { authRateLimit } from "../../core/middleware/rateLimit";
import {
  RegisterSchema,
  LoginSchema,
  RefreshSchema,
  ChangePasswordSchema,
  ChangeEmailSchema,
  DeactivateAccountSchema,
  DeleteAccountSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  TokenSchema,
  TwoFactorSetupSchema,
  TwoFactorCodeSchema,
  TwoFactorDisableSchema,
} from "./auth.schemas";
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

// POST /api/auth/change-password (🔒)
router.post(
  "/change-password",
  requireAuth as never,
  validate(ChangePasswordSchema),
  asyncHandler((req, res, next) => ctrl.handleChangePassword(req as AuthedRequest, res).catch(next)),
);

// POST /api/auth/change-email (🔒)
router.post(
  "/change-email",
  requireAuth as never,
  validate(ChangeEmailSchema),
  asyncHandler((req, res, next) => ctrl.handleChangeEmail(req as AuthedRequest, res).catch(next)),
);

// POST /api/auth/deactivate (🔒)
router.post(
  "/deactivate",
  requireAuth as never,
  validate(DeactivateAccountSchema),
  asyncHandler((req, res, next) => ctrl.handleDeactivate(req as AuthedRequest, res).catch(next)),
);

// DELETE /api/auth/account (🔒)
router.delete(
  "/account",
  requireAuth as never,
  validate(DeleteAccountSchema),
  asyncHandler((req, res, next) => ctrl.handleDeleteAccount(req as AuthedRequest, res).catch(next)),
);

// GET /api/auth/export-data (🔒)
router.get(
  "/export-data",
  requireAuth as never,
  asyncHandler((req, res, next) => ctrl.handleExportData(req as AuthedRequest, res).catch(next)),
);

// GET /api/auth/me (🔒)
router.get(
  "/me",
  requireAuth as never,
  asyncHandler((req, res, next) => ctrl.handleMe(req as AuthedRequest, res).catch(next)),
);

// ------------------------------------------------------------------
// Sécurité des comptes
// ------------------------------------------------------------------
const authed = (fn: (req: AuthedRequest, res: import("express").Response) => Promise<void>) =>
  asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

router.get("/capabilities", asyncHandler(ctrl.handleCapabilities));

// Parcours publics par lien reçu par e-mail : limite stricte par adresse IP.
router.post("/password/forgot", authRateLimit, validate(ForgotPasswordSchema), asyncHandler(ctrl.handleForgotPassword));
router.post("/password/reset", authRateLimit, validate(ResetPasswordSchema), asyncHandler(ctrl.handleResetPassword));
router.post("/email/verify", authRateLimit, validate(TokenSchema), asyncHandler(ctrl.handleVerifyEmail));
router.post("/email/change/confirm", authRateLimit, validate(TokenSchema), asyncHandler(ctrl.handleConfirmEmailChange));

router.post("/email/verify/resend", requireAuth as never, authed(ctrl.handleResendVerification));
router.post("/logout-all", requireAuth as never, authed(ctrl.handleLogoutAll));
router.get("/sessions", requireAuth as never, authed(ctrl.handleListSessions));
router.delete("/sessions/:id", requireAuth as never, authed(ctrl.handleRevokeSession));
router.get("/login-history", requireAuth as never, authed(ctrl.handleLoginHistory));
router.get("/security", requireAuth as never, authed(ctrl.handleSecurityStatus));
router.post("/2fa/setup", requireAuth as never, validate(TwoFactorSetupSchema), authed(ctrl.handleTwoFactorSetup));
router.post("/2fa/enable", requireAuth as never, validate(TwoFactorCodeSchema), authed(ctrl.handleTwoFactorEnable));
router.post("/2fa/disable", requireAuth as never, validate(TwoFactorDisableSchema), authed(ctrl.handleTwoFactorDisable));

export default router;

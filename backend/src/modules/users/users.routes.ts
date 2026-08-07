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
// Route historique conservée pour compatibilité. Le nouvel écran utilise /api/auth/change-password.
router.post("/me/password", validate(ChangePasswordSchema), wrap(ctrl.handleChangePassword));

// Les anciennes routes /me/deactivate et DELETE /me ont été retirées :
// - la désactivation réelle passe désormais par POST /api/auth/deactivate ;
// - la suppression définitive sera réexposée uniquement avec un service qui nettoie
//   explicitement toutes les relations non-cascade.

export default router;

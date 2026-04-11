import { Router, Response } from "express";
import { Role } from "@prisma/client";
import { asyncHandler } from "../../../core/utils/asyncHandler";
import { validate } from "../../../core/middleware/validate";
import { requireAuth, requireRole } from "../../../core/middleware/auth";
import { AuthedRequest } from "../../../core/types";
import {
  ActivateSalonSchema,
  CreateSalonSchema,
  SalonIdParamsSchema,
  UpdateSalonSchema,
} from "./adminSalons.schemas";
import * as ctrl from "./adminSalons.controller";

const router = Router();

router.use(requireAuth as never);
router.use(requireRole(Role.ADMIN) as never);

const wrap = (
  fn: (req: AuthedRequest, res: Response) => Promise<void>,
) => asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

// GET /api/admin/salons
router.get("/", wrap(ctrl.handleList));

// POST /api/admin/salons
router.post("/", validate(CreateSalonSchema), wrap(ctrl.handleCreate));

// PATCH /api/admin/salons/:id
router.patch(
  "/:id",
  validate(SalonIdParamsSchema, "params"),
  validate(UpdateSalonSchema),
  wrap(ctrl.handleUpdate),
);

// PATCH /api/admin/salons/:id/activate
router.patch(
  "/:id/activate",
  validate(SalonIdParamsSchema, "params"),
  validate(ActivateSalonSchema),
  wrap(ctrl.handleSetActive),
);

export default router;

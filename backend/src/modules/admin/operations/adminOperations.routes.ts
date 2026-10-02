import { Router, Response } from "express";
import { Role } from "@prisma/client";
import { asyncHandler } from "../../../core/utils/asyncHandler";
import { requireAuth, requireRole } from "../../../core/middleware/auth";
import { validate } from "../../../core/middleware/validate";
import { AuthedRequest } from "../../../core/types";
import {
  IncidentIdParamsSchema,
  ListIncidentsQuerySchema,
  ListLoginEventsQuerySchema,
  UpdateIncidentSchema,
} from "./adminOperations.schemas";
import * as ctrl from "./adminOperations.controller";

const router = Router();

router.use(requireAuth as never);
router.use(requireRole(Role.ADMIN) as never);

const wrap = (
  fn: (req: AuthedRequest, res: Response) => Promise<void>,
) => asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

router.get("/overview", wrap(ctrl.handleOverview));
router.get("/logins", validate(ListLoginEventsQuerySchema, "query"), wrap(ctrl.handleLoginEvents));
router.get("/incidents", validate(ListIncidentsQuerySchema, "query"), wrap(ctrl.handleIncidents));
router.patch(
  "/incidents/:id",
  validate(IncidentIdParamsSchema, "params"),
  validate(UpdateIncidentSchema),
  wrap(ctrl.handleUpdateIncident),
);
router.get("/support", wrap(ctrl.handleSupport));

export default router;

import { Router, Response } from "express";
import { Role } from "@prisma/client";
import { asyncHandler } from "../../../core/utils/asyncHandler";
import { requireAuth, requireRole } from "../../../core/middleware/auth";
import { validate } from "../../../core/middleware/validate";
import { AuthedRequest } from "../../../core/types";
import {
  EconomyCatalogParamsSchema,
  ListTransactionsQuerySchema,
  UpdateCatalogItemSchema,
} from "./adminEconomy.schemas";
import * as ctrl from "./adminEconomy.controller";

const router = Router();

router.use(requireAuth as never);
router.use(requireRole(Role.ADMIN) as never);

const wrap = (
  fn: (req: AuthedRequest, res: Response) => Promise<void>,
) => asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

router.get("/overview", wrap(ctrl.handleOverview));
router.get("/transactions", validate(ListTransactionsQuerySchema, "query"), wrap(ctrl.handleTransactions));
router.get("/catalog", wrap(ctrl.handleCatalog));
router.get("/premium-users", wrap(ctrl.handlePremiumUsers));

router.patch(
  "/offerings/:id",
  validate(EconomyCatalogParamsSchema, "params"),
  validate(UpdateCatalogItemSchema),
  wrap(ctrl.handleUpdateOffering),
);

router.patch(
  "/magies/:id",
  validate(EconomyCatalogParamsSchema, "params"),
  validate(UpdateCatalogItemSchema),
  wrap(ctrl.handleUpdateMagie),
);

export default router;

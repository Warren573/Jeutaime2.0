import { Router, Response } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { validate } from "../../core/middleware/validate";
import { requireAuth } from "../../core/middleware/auth";
import { AuthedRequest } from "../../core/types";
import {
  ListReceivedQuerySchema,
  SendOfferingSchema,
} from "./offerings.schemas";
import * as ctrl from "./offerings.controller";

const router = Router();

router.use(requireAuth as never);

const wrap = (
  fn: (req: AuthedRequest, res: Response) => Promise<void>,
) => asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

// GET /api/offerings/catalog
router.get("/catalog", wrap(ctrl.handleCatalog));

// POST /api/offerings/send
router.post("/send", validate(SendOfferingSchema), wrap(ctrl.handleSend));

// GET /api/offerings/received
router.get(
  "/received",
  validate(ListReceivedQuerySchema, "query"),
  wrap(ctrl.handleListReceived),
);

export default router;

import { Router } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { validate } from "../../core/middleware/validate";
import { requireAuth } from "../../core/middleware/auth";
import { ProposeRefugeSchema, AdoptRefugeSchema } from "./refuge.schemas";
import { RefugeController } from "./refuge.controller";
import type { AuthedRequest } from "../../core/types";

const router = Router();

// Middleware: toutes les routes Refuge nécessitent une authentification
router.use(requireAuth as never);

// Helper pour wrapper les async handlers
const wrap = (fn: (req: AuthedRequest, res: import("express").Response) => Promise<void>) =>
  asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

// ============================================================
// Routes publiques du Refuge
// ============================================================

// POST /api/refuge/propose
// Adopté propose son refuge
router.post("/propose", validate(ProposeRefugeSchema), wrap(RefugeController.propose));

// GET /api/refuge/available
// Adoptant voit la liste des refuges disponibles
router.get("/available", wrap(RefugeController.getAvailable));

// POST /api/refuge/adopt
// Adoptant adopte un refuge disponible
router.post("/adopt", validate(AdoptRefugeSchema), wrap(RefugeController.adopt));

export default router;

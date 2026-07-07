import { Router } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { validate } from "../../core/middleware/validate";
import { requireAuth } from "../../core/middleware/auth";
import { ProposeRefugeSchema, AdoptRefugeSchema, DailyChoiceSchema, GuessSchema } from "./refuge.schemas";
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

// GET /api/refuge/session/:sessionId
// Récupère une session Refuge avec métadonnées
router.get("/session/:sessionId", wrap(RefugeController.getSession));

// PATCH /api/refuge/session/:sessionId/background
// Mettre à jour le fond d'ambiance
router.patch("/session/:sessionId/background", wrap(RefugeController.updateBackground));

// POST /api/refuge/daily-choice
// Adopté soumet ses 2 actions pour le jour
router.post("/daily-choice", validate(DailyChoiceSchema), wrap(RefugeController.submitDailyChoice));

// POST /api/refuge/guess
// Adoptant soumet ses devinettes pour le jour
router.post("/guess", validate(GuessSchema), wrap(RefugeController.submitGuess));

export default router;

import { Router } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { validate } from "../../core/middleware/validate";
import { requireAuth } from "../../core/middleware/auth";
import { ProposeRefugeSchema, AdoptRefugeSchema, GuessSchema, DailyChoiceSchema, RevealConsentSchema } from "./refuge.schemas";
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

// GET /api/refuge/active
// Récupère la session Refuge active de l'utilisateur courant
router.get("/active", wrap(RefugeController.getActive));

// POST /api/refuge/adopt
// Adoptant adopte un refuge disponible
router.post("/adopt", validate(AdoptRefugeSchema), wrap(RefugeController.adopt));

// GET /api/refuge/session/:sessionId
// Récupère une session Refuge avec métadonnées
router.get("/session/:sessionId", wrap(RefugeController.getSession));

// GET /api/refuge/sessions/:sessionId/status
// Alias: récupère une session Refuge avec métadonnées (pour compatibilité frontend)
router.get("/sessions/:sessionId/status", wrap(RefugeController.getSession));

// PATCH /api/refuge/session/:sessionId/background
// Mettre à jour le fond d'ambiance
router.patch("/session/:sessionId/background", wrap(RefugeController.updateBackground));

// POST /api/refuge/daily-choice
// Adopté soumet son choix quotidien (2 actions du jour)
router.post("/daily-choice", validate(DailyChoiceSchema), wrap(RefugeController.submitDailyChoice));

// POST /api/refuge/guess
// Adoptant soumet sa tentative du jour (retrouver les 2 actions de l'Adopté)
router.post("/guess", validate(GuessSchema), wrap(RefugeController.submitGuess));

// POST /api/refuge/:sessionId/reveal-consent
// Phase finale — chaque participant accepte ou refuse le dévoilement des profils
router.post(
  "/:sessionId/reveal-consent",
  validate(RevealConsentSchema),
  wrap(RefugeController.submitRevealConsent)
);

// ============================================================
// DEV MODE ROUTES - Time Travel (only if REFUGE_DEV_TIME_TRAVEL=true)
// ============================================================

// POST /api/refuge/dev/:sessionId/set-day
// DEV: Jump to specific day (1-7) for testing
// POST /api/refuge/dev/:sessionId/reset
// DEV: Remise à zéro contrôlée d'une session de test (body: { mode?: "reset" | "abandon" })
// Gate sur la seule variable explicite REFUGE_DEV_TIME_TRAVEL : le staging (build
// production sur Render) doit pouvoir l'activer ; la prod ne définit pas la variable.
if (process.env.REFUGE_DEV_TIME_TRAVEL === "true") {
  router.post("/dev/:sessionId/set-day", wrap(RefugeController.devSetDay));
  router.post("/dev/:sessionId/reset", wrap(RefugeController.devResetSession));
}

export default router;

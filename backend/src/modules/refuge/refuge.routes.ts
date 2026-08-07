import { Router } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { validate } from "../../core/middleware/validate";
import { requireAuth } from "../../core/middleware/auth";
import { ProposeRefugeSchema, AdoptRefugeSchema, GuessSchema, DailyChoiceSchema, RevealConsentSchema, UpdateBackgroundSchema } from "./refuge.schemas";
import { RefugeController } from "./refuge.controller";
import type { AuthedRequest } from "../../core/types";

const router = Router();

router.use(requireAuth as never);

const wrap = (fn: (req: AuthedRequest, res: import("express").Response) => Promise<void>) =>
  asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

router.post("/propose", validate(ProposeRefugeSchema), wrap(RefugeController.propose));
router.get("/available", wrap(RefugeController.getAvailable));
router.get("/active", wrap(RefugeController.getActive));
router.get("/history", wrap(RefugeController.getHistory));
router.post("/adopt", validate(AdoptRefugeSchema), wrap(RefugeController.adopt));
router.get("/session/:sessionId", wrap(RefugeController.getSession));
router.get("/sessions/:sessionId/status", wrap(RefugeController.getSession));
router.patch(
  "/session/:sessionId/background",
  validate(UpdateBackgroundSchema),
  wrap(RefugeController.updateBackground)
);
router.post("/daily-choice", validate(DailyChoiceSchema), wrap(RefugeController.submitDailyChoice));
router.post("/guess", validate(GuessSchema), wrap(RefugeController.submitGuess));
router.post(
  "/:sessionId/reveal-consent",
  validate(RevealConsentSchema),
  wrap(RefugeController.submitRevealConsent)
);

// DEV ONLY — jamais monté lorsque NODE_ENV=production, même si une variable
// REFUGE_DEV_TIME_TRAVEL oubliée reste définie sur l'hébergement.
const refugeDevTimeTravelEnabled =
  process.env.NODE_ENV !== "production" &&
  process.env.REFUGE_DEV_TIME_TRAVEL === "true";

if (refugeDevTimeTravelEnabled) {
  router.post("/dev/:sessionId/set-day", wrap(RefugeController.devSetDay));
  router.post("/dev/:sessionId/advance-day", wrap(RefugeController.devAdvanceDay));
  router.post("/dev/:sessionId/reset", wrap(RefugeController.devResetSession));
}

export default router;

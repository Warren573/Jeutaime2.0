import { Router } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { validate } from "../../core/middleware/validate";
import { requireAuth } from "../../core/middleware/auth";
import { lettersRateLimit } from "../../core/middleware/rateLimit";
import { CreateMatchSchema, GhostRelanceSchema } from "./matches.schemas";
import * as matchCtrl from "./matches.controller";
import * as letterCtrl from "../letters/letters.controller";
import { SendLetterSchema, ListLettersQuerySchema } from "../letters/letters.schemas";
import { AuthedRequest } from "../../core/types";

const router = Router();

// Toutes les routes /matches nécessitent auth
router.use(requireAuth as never);

const wrap = (
  fn: (req: AuthedRequest, res: import("express").Response) => Promise<void>,
) => asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

// ── Matches ───────────────────────────────────────────────────────────────────

// POST /api/matches — Proposer un match
router.post("/", validate(CreateMatchSchema), wrap(matchCtrl.handleCreate));

// GET /api/matches — Liste mes matchs
router.get("/", wrap(matchCtrl.handleList));

// GET /api/matches/:id — Détail + canSend
router.get("/:id", wrap(matchCtrl.handleDetail));

// POST /api/matches/:id/accept — Accepter
router.post("/:id/accept", wrap(matchCtrl.handleAccept));

// POST /api/matches/:id/decline — Refuser
router.post("/:id/decline", wrap(matchCtrl.handleDecline));

// DELETE /api/matches/:id — Rompre
router.delete("/:id", wrap(matchCtrl.handleBreak));

// POST /api/matches/:id/ghost-relance — Relance anti-ghosting
router.post(
  "/:id/ghost-relance",
  validate(GhostRelanceSchema),
  wrap(matchCtrl.handleGhostRelance),
);

// ── Lettres (sous-ressource du match) ────────────────────────────────────────

// GET /api/matches/:matchId/letters — Lister les lettres d'un match
router.get(
  "/:matchId/letters",
  validate(ListLettersQuerySchema, "query"),
  wrap(letterCtrl.handleList),
);

// POST /api/matches/:matchId/letters — Envoyer une lettre 🚦
router.post(
  "/:matchId/letters",
  lettersRateLimit,
  validate(SendLetterSchema),
  wrap(letterCtrl.handleSend),
);

export default router;

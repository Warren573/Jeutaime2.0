import { Router, Response } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { validate } from "../../core/middleware/validate";
import { requireAuth } from "../../core/middleware/auth";
import type { AuthedRequest } from "../../core/types";
import * as controller from "./salonSessions.controller";
import * as actionsSvc from "../salon-actions/salonActions.service";
import { JoinSessionBodySchema, LeaveSessionBodySchema } from "./salonSessions.schemas";
import { DrinkActionSchema, EatActionSchema } from "../salon-actions/salonActions.schemas";

const router = Router();

console.log(`[DEBUG-SALON-SESSIONS] Routes being registered`);

router.use(requireAuth as never);

const wrap = (
  fn: (req: AuthedRequest, res: Response) => Promise<void>,
) => asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

// GET /api/salon-sessions/current — get current active session (if any)
router.get(
  "/current",
  wrap(async (req, res) => {
    await controller.getCurrentActiveSession(req as AuthedRequest, res);
  }),
);

// GET /api/salon-sessions/counters — get participant counts for all salons
router.get(
  "/counters",
  wrap(async (req, res) => {
    await controller.getSalonCounters(req as AuthedRequest, res);
  }),
);

// GET /api/salon-sessions/active/:salonKind — get all active sessions for a salon
router.get(
  "/active/:salonKind",
  wrap(async (req, res) => {
    await controller.getActiveSessions(req as AuthedRequest, res);
  }),
);

// POST /api/salon-sessions/join/:salonKind — join a session
router.post(
  "/join/:salonKind",
  validate(JoinSessionBodySchema),
  wrap(async (req, res) => {
    await controller.joinSession(req as AuthedRequest, res);
  }),
);

// POST /api/salon-sessions/:sessionId/leave — leave a session
router.post(
  "/:sessionId/leave",
  validate(LeaveSessionBodySchema),
  wrap(async (req, res) => {
    await controller.leaveSession(req as AuthedRequest, res);
  }),
);

// POST /api/salon-sessions/:sessionId/drink — perform drink action
router.post(
  "/:sessionId/drink",
  validate(DrinkActionSchema),
  wrap(async (req, res) => {
    const sessionId = req.params['sessionId'] as string;
    const userId = (req as AuthedRequest).user.userId;
    const userPseudo = (req as AuthedRequest).user.pseudo;

    const result = await actionsSvc.performDrinkAction(sessionId, userId, userPseudo);
    res.json(result);
  }),
);

// POST /api/salon-sessions/:sessionId/eat — perform eat action
router.post(
  "/:sessionId/eat",
  validate(EatActionSchema),
  wrap(async (req, res) => {
    const sessionId = req.params['sessionId'] as string;
    const userId = (req as AuthedRequest).user.userId;
    const userPseudo = (req as AuthedRequest).user.pseudo;

    const result = await actionsSvc.performEatAction(sessionId, userId, userPseudo);
    res.json(result);
  }),
);

// GET /api/salon-sessions/encounters/:salonKind — get previous encounters
router.get(
  "/encounters/:salonKind",
  wrap(async (req, res) => {
    await controller.getPreviousEncounters(req as AuthedRequest, res);
  }),
);

// GET /api/salon-sessions/:id — get session detail
// IMPORTANT: Must come LAST after all more specific routes
router.get(
  "/:id",
  wrap(async (req, res) => {
    await controller.getSessionDetail(req as AuthedRequest, res);
  }),
);

// DEBUG: GET /api/salon-sessions/debug/salons — check all salons in DB
router.get(
  "/debug/salons",
  wrap(async (req, res) => {
    await controller.debugGetAllSalons(req as AuthedRequest, res);
  }),
);

// DEBUG: POST /api/salon-sessions/debug/reseed — reseed all 7 salons
router.post(
  "/debug/reseed",
  wrap(async (req, res) => {
    await controller.debugReseedSalons(req as AuthedRequest, res);
  }),
);

export default router;

import { Router, Response } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { validate } from "../../core/middleware/validate";
import { requireAuth } from "../../core/middleware/auth";
import type { AuthedRequest } from "../../core/types";
import * as controller from "./salonSessions.controller";
import { JoinSessionBodySchema, LeaveSessionBodySchema } from "./salonSessions.schemas";

const router = Router();

console.log(`[DEBUG-SALON-SESSIONS] Routes being registered`);

router.use(requireAuth as never);

const wrap = (
  fn: (req: AuthedRequest, res: Response) => Promise<void>,
) => asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

// GET /api/salon-sessions/active/:salonKind — get all active sessions for a salon
router.get(
  "/active/:salonKind",
  wrap(async (req, res) => {
    await controller.getActiveSessions(req as AuthedRequest, res);
  }),
);

// GET /api/salon-sessions/:id — get session detail
router.get(
  "/:id",
  wrap(async (req, res) => {
    await controller.getSessionDetail(req as AuthedRequest, res);
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

// POST /api/salon-sessions/:id/leave — leave a session
router.post(
  "/:id/leave",
  validate(LeaveSessionBodySchema),
  wrap(async (req, res) => {
    await controller.leaveSession(req as AuthedRequest, res);
  }),
);

// GET /api/salon-sessions/encounters/:salonKind — get previous encounters
router.get(
  "/encounters/:salonKind",
  wrap(async (req, res) => {
    await controller.getPreviousEncounters(req as AuthedRequest, res);
  }),
);

export default router;

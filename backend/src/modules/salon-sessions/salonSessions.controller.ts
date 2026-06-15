import type { Response } from "express";
import type { AuthedRequest } from "../../core/types";
import * as salonSessionsService from "./salonSessions.service";
import {
  GetActiveSessionsResponseSchema,
  GetSessionDetailResponseSchema,
  JoinSessionResponseSchema,
  LeaveSessionResponseSchema,
  GetPreviousEncountersResponseSchema,
} from "./salonSessions.schemas";

// ============================================================
// GET /api/salon-sessions/active/:salonKind
// ============================================================
export async function getActiveSessions(req: AuthedRequest, res: Response) {
  const salonKind = req.params["salonKind"] as string;

  try {
    const data = await salonSessionsService.getActiveSessionsForSalon(salonKind);
    const validated = GetActiveSessionsResponseSchema.parse(data);
    res.json({ data: validated });
  } catch (err) {
    console.error(`[DEBUG-SALON-SESSIONS] getActiveSessions error - salonKind: ${salonKind}`, err);
    throw err;
  }
}

// ============================================================
// GET /api/salon-sessions/counters
// ============================================================
export async function getSalonCounters(req: AuthedRequest, res: Response) {
  try {
    const counters = await salonSessionsService.getSalonCountersForAllKinds();
    res.json({ data: counters });
  } catch (err) {
    console.error(`[DEBUG-SALON-SESSIONS] getSalonCounters error`, err);
    throw err;
  }
}

// ============================================================
// GET /api/salon-sessions/:id
// ============================================================
export async function getSessionDetail(req: AuthedRequest, res: Response) {
  const id = req.params["id"] as string;

  const data = await salonSessionsService.getSessionDetail(id);
  const validated = GetSessionDetailResponseSchema.parse(data);

  res.json({ data: validated });
}

// ============================================================
// POST /api/salon-sessions/join/:salonKind
// ============================================================
export async function joinSession(req: AuthedRequest, res: Response) {
  const salonKind = req.params["salonKind"] as string;
  const userId = req.user.userId;

  try {
    const data = await salonSessionsService.joinSession(userId, salonKind);
    const validated = JoinSessionResponseSchema.parse(data);
    res.status(201).json({ data: validated });
  } catch (err) {
    console.error(`[DEBUG-SALON-SESSIONS] joinSession error - salonKind: ${salonKind}, userId: ${userId}`, err);
    throw err;
  }
}

// ============================================================
// POST /api/salon-sessions/:id/leave
// ============================================================
export async function leaveSession(req: AuthedRequest, res: Response) {
  const id = req.params["id"] as string;
  const userId = req.user.userId;

  const data = await salonSessionsService.leaveSession(id, userId);
  const validated = LeaveSessionResponseSchema.parse(data);

  res.json({ data: validated });
}

// ============================================================
// GET /api/salon-sessions/encounters/:salonKind
// ============================================================
export async function getPreviousEncounters(req: AuthedRequest, res: Response) {
  const salonKind = req.params["salonKind"] as string;
  const userId = req.user.userId;

  const data = await salonSessionsService.getPreviousEncounters(
    userId,
    salonKind,
  );
  const validated = GetPreviousEncountersResponseSchema.parse(data);

  res.json({ data: validated });
}

// ============================================================
// GET /api/salon-sessions/current
// ============================================================
export async function getCurrentActiveSession(req: AuthedRequest, res: Response) {
  const userId = req.user.userId;

  const data = await salonSessionsService.getCurrentActiveSession(userId);

  res.json({ data });
}

// ============================================================
// DEBUG: GET /api/salon-sessions/debug/salons
// ============================================================
export async function debugGetAllSalons(req: AuthedRequest, res: Response) {
  console.log(`[DEBUG-ENDPOINT] /debug/salons called by userId: ${req.user.userId}`);
  const salons = await salonSessionsService.getAllSalons();
  console.log(`[DEBUG-ENDPOINT] /debug/salons returning:`, salons);
  res.json({ data: salons });
}

// ============================================================
// DEBUG: POST /api/salon-sessions/debug/reseed
// ============================================================
export async function debugReseedSalons(req: AuthedRequest, res: Response) {
  const result = await salonSessionsService.reseedSalons();
  res.json({ data: result });
}

// ============================================================
// POST /api/salon-sessions/:sessionId/drink
// ============================================================
export async function performDrinkAction(req: AuthedRequest, res: Response) {
  const sessionId = req.params["sessionId"] as string;
  const userId = req.user.userId;

  try {
    const result = await salonSessionsService.performDrinkAction(sessionId, userId);
    res.json({ data: result });
  } catch (err) {
    console.error(`[DEBUG-SALON-SESSIONS] performDrinkAction error - sessionId: ${sessionId}, userId: ${userId}`, err);
    throw err;
  }
}

// ============================================================
// POST /api/salon-sessions/:sessionId/eat
// ============================================================
export async function performEatAction(req: AuthedRequest, res: Response) {
  const sessionId = req.params["sessionId"] as string;
  const userId = req.user.userId;

  try {
    const result = await salonSessionsService.performEatAction(sessionId, userId);
    res.json({ data: result });
  } catch (err) {
    console.error(`[DEBUG-SALON-SESSIONS] performEatAction error - sessionId: ${sessionId}, userId: ${userId}`, err);
    throw err;
  }
}

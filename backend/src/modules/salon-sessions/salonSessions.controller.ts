import type { Request, Response } from "express";
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
export async function getActiveSessions(req: Request, res: Response) {
  const { salonKind } = req.params;

  const data = await salonSessionsService.getActiveSessionsForSalon(salonKind);
  const validated = GetActiveSessionsResponseSchema.parse(data);

  res.json({ data: validated });
}

// ============================================================
// GET /api/salon-sessions/:id
// ============================================================
export async function getSessionDetail(req: Request, res: Response) {
  const { id } = req.params;

  const data = await salonSessionsService.getSessionDetail(id);
  const validated = GetSessionDetailResponseSchema.parse(data);

  res.json({ data: validated });
}

// ============================================================
// POST /api/salon-sessions/join/:salonKind
// ============================================================
export async function joinSession(req: Request, res: Response) {
  const { salonKind } = req.params;
  const userId = req.user.id;

  const data = await salonSessionsService.joinSession(userId, salonKind);
  const validated = JoinSessionResponseSchema.parse(data);

  res.status(201).json({ data: validated });
}

// ============================================================
// POST /api/salon-sessions/:id/leave
// ============================================================
export async function leaveSession(req: Request, res: Response) {
  const { id } = req.params;
  const userId = req.user.id;

  const data = await salonSessionsService.leaveSession(id, userId);
  const validated = LeaveSessionResponseSchema.parse(data);

  res.json({ data: validated });
}

// ============================================================
// GET /api/salon-sessions/encounters/:salonKind
// ============================================================
export async function getPreviousEncounters(req: Request, res: Response) {
  const { salonKind } = req.params;
  const userId = req.user.id;

  const data = await salonSessionsService.getPreviousEncounters(
    userId,
    salonKind,
  );
  const validated = GetPreviousEncountersResponseSchema.parse(data);

  res.json({ data: validated });
}

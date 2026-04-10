import { Response } from "express";
import { AuthedRequest } from "../../core/types";
import { parsePagination } from "../../core/utils/pagination";
import * as svc from "./letters.service";

// Appelé depuis matches.routes.ts (/:matchId/letters)
export async function handleSend(req: AuthedRequest, res: Response) {
  const matchId = req.params["matchId"] as string;
  const letter = await svc.sendLetter(matchId, req.user.userId, req.body);
  res.status(201).json({ data: letter });
}

// Appelé depuis matches.routes.ts (GET /:matchId/letters)
export async function handleList(req: AuthedRequest, res: Response) {
  const matchId = req.params["matchId"] as string;
  const pagination = parsePagination(req.query);
  const result = await svc.listLetters(matchId, req.user.userId, pagination);
  res.json(result);
}

// Appelé depuis letters.routes.ts (PATCH /letters/:id/read)
export async function handleMarkRead(req: AuthedRequest, res: Response) {
  const letterId = req.params["id"] as string;
  const letter = await svc.markLetterRead(letterId, req.user.userId);
  res.json({ data: letter });
}

// GET /api/letters/unread-count
export async function handleUnreadCount(req: AuthedRequest, res: Response) {
  const count = await svc.getUnreadCount(req.user.userId);
  res.json({ data: { unreadCount: count } });
}

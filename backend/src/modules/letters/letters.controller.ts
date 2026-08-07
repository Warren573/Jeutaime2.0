import { Response } from "express";
import { AuthedRequest } from "../../core/types";
import { parsePagination } from "../../core/utils/pagination";
import { prisma } from "../../config/prisma";
import { ForbiddenError } from "../../core/errors";
import { isAccountDeactivated } from "../auth/accountLifecycle.service";
import * as svc from "./letters.service";

// Appelé depuis matches.routes.ts (/:matchId/letters)
export async function handleSend(req: AuthedRequest, res: Response) {
  const matchId = req.params["matchId"] as string;
  const senderId = req.user.userId;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { userAId: true, userBId: true },
  });

  if (match) {
    const otherUserId = match.userAId === senderId ? match.userBId : match.userAId;
    if (otherUserId !== senderId && await isAccountDeactivated(otherUserId)) {
      throw new ForbiddenError("Cette personne a temporairement désactivé son compte");
    }
  }

  const letter = await svc.sendLetter(matchId, senderId, req.body);
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

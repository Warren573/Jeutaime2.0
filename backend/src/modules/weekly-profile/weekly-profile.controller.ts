import { Response } from "express";
import { AuthedRequest } from "../../core/types";
import * as svc from "./weekly-profile.service";
import type { VoteWeeklyProfileDto } from "./weekly-profile.schemas";

// GET /api/weekly-profile
export async function handleGetWeeklyProfile(req: AuthedRequest, res: Response) {
  const data = await svc.getWeeklyProfileState(req.user.userId, req.user.isPremium);
  res.json({ data });
}

// POST /api/weekly-profile/vote
export async function handleVote(req: AuthedRequest, res: Response) {
  const { duelId, chosenId } = req.body as VoteWeeklyProfileDto;
  const data = await svc.voteForDuel(req.user.userId, req.user.isPremium, duelId, chosenId);
  res.status(201).json({ data });
}

// GET /api/weekly-profile/winners
export async function handleGetWinners(req: AuthedRequest, res: Response) {
  const data = await svc.getWeeklyProfileWinners();
  res.json({ data });
}

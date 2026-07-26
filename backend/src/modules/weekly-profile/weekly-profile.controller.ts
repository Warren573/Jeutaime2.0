import { Response } from "express";
import { AuthedRequest } from "../../core/types";
import * as svc from "./weekly-profile.service";
import type { VoteWeeklyProfileDto } from "./weekly-profile.schemas";

// GET /api/weekly-profile
export async function handleGetWeeklyProfile(req: AuthedRequest, res: Response) {
  const data = await svc.getWeeklyProfileData(req.user.userId);
  res.json({ data });
}

// POST /api/weekly-profile/vote
export async function handleVote(req: AuthedRequest, res: Response) {
  const { candidateId } = req.body as VoteWeeklyProfileDto;
  const data = await svc.voteForCandidate(req.user.userId, candidateId);
  res.status(201).json({ data });
}

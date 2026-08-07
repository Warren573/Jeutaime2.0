import { Response } from "express";
import { AuthedRequest } from "../../core/types";
import * as svc from "./weekly-profile.service";
import { applyLocationPrivacy } from "../profiles/profilePrivacy.service";
import type { VoteWeeklyProfileDto } from "./weekly-profile.schemas";

async function sanitizeWeeklyProfile<T extends { id: string; city: string }>(profile: T): Promise<T> {
  const sanitized = await applyLocationPrivacy({ ...profile, userId: profile.id });
  const { userId: _userId, ...rest } = sanitized;
  return rest as unknown as T;
}

async function sanitizeState(data: Awaited<ReturnType<typeof svc.getWeeklyProfileState>>) {
  if (!data.duel) return data;
  const [candidateA, candidateB] = await Promise.all([
    sanitizeWeeklyProfile(data.duel.candidateA),
    sanitizeWeeklyProfile(data.duel.candidateB),
  ]);
  return { ...data, duel: { ...data.duel, candidateA, candidateB } };
}

// GET /api/weekly-profile
export async function handleGetWeeklyProfile(req: AuthedRequest, res: Response) {
  const data = await svc.getWeeklyProfileState(req.user.userId, req.user.isPremium);
  res.json({ data: await sanitizeState(data) });
}

// POST /api/weekly-profile/vote
export async function handleVote(req: AuthedRequest, res: Response) {
  const { duelId, chosenId } = req.body as VoteWeeklyProfileDto;
  const data = await svc.voteForDuel(req.user.userId, req.user.isPremium, duelId, chosenId);
  res.status(201).json({ data: await sanitizeState(data) });
}

// GET /api/weekly-profile/winners
export async function handleGetWinners(req: AuthedRequest, res: Response) {
  const data = await svc.getWeeklyProfileWinners();
  const [male, female] = await Promise.all([
    data.male ? sanitizeWeeklyProfile(data.male) : Promise.resolve(null),
    data.female ? sanitizeWeeklyProfile(data.female) : Promise.resolve(null),
  ]);
  res.json({ data: { ...data, male, female } });
}

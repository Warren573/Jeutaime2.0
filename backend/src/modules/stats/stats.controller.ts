import { Response } from "express";
import { AuthedRequest } from "../../core/types";
import * as svc from "./stats.service";

// GET /api/stats/community
export async function handleGetCommunityStats(_req: AuthedRequest, res: Response) {
  const data = await svc.getCommunityStats();
  res.json({ data });
}

// GET /api/stats/daily
export async function handleGetDailyStats(_req: AuthedRequest, res: Response) {
  const data = await svc.getDailyStats();
  res.json({ data });
}

// GET /api/stats/refuge
export async function handleGetRefugeStats(_req: AuthedRequest, res: Response) {
  const data = await svc.getRefugeStats();
  res.json({ data });
}

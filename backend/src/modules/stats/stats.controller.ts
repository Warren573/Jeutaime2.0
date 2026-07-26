import { Response } from "express";
import { AuthedRequest } from "../../core/types";
import * as svc from "./stats.service";

// GET /api/stats/community
export async function handleGetCommunityStats(_req: AuthedRequest, res: Response) {
  const data = await svc.getCommunityStats();
  res.json({ data });
}

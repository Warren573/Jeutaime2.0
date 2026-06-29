import type { Request, Response } from "express";
import { env } from "../../config/env";
import * as debugService from "./debug.service";

// Only allow in staging/dev
function isDebugAllowed(): boolean {
  return env.ALLOW_DEBUG_ENDPOINTS || env.NODE_ENV !== "production";
}

export async function getStagingStatus(req: Request, res: Response) {
  if (!isDebugAllowed()) {
    return res.status(403).json({ error: "Debug endpoint disabled in production" });
  }

  const data = await debugService.getStagingStatus();
  res.json({ data });
}

export async function getSeedSource(req: Request, res: Response) {
  if (!isDebugAllowed()) {
    return res.status(403).json({ error: "Debug endpoint disabled in production" });
  }

  const data = await debugService.getSeedSource();
  res.json({ data });
}

export async function resetTestUsers(req: Request, res: Response) {
  if (!isDebugAllowed()) {
    return res.status(403).json({ error: "Debug endpoint disabled in production" });
  }

  const data = await debugService.resetTestUsers();
  res.json({ data });
}

export async function resetTestMatches(req: Request, res: Response) {
  if (!isDebugAllowed()) {
    return res.status(403).json({ error: "Debug endpoint disabled in production" });
  }

  const data = await debugService.resetTestMatches();
  res.json({ data });
}

export async function resetTestSalons(req: Request, res: Response) {
  if (!isDebugAllowed()) {
    return res.status(403).json({ error: "Debug endpoint disabled in production" });
  }

  const data = await debugService.resetTestSalons();
  res.json({ data });
}

export async function resetTestCoins(req: Request, res: Response) {
  if (!isDebugAllowed()) {
    return res.status(403).json({ error: "Debug endpoint disabled in production" });
  }

  const data = await debugService.resetTestCoins();
  res.json({ data });
}


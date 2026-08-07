import type { Request, Response } from "express";
import { env } from "../../config/env";
import * as debugService from "./debug.service";

// Defense in depth: debug endpoints are never allowed in production,
// even if this router is accidentally mounted or a debug env flag is set.
function isDebugAllowed(): boolean {
  return env.NODE_ENV !== "production";
}

export async function getStagingStatus(_req: Request, res: Response) {
  if (!isDebugAllowed()) {
    return res.status(403).json({ error: "Debug endpoint disabled in production" });
  }

  const data = await debugService.getStagingStatus();
  res.json({ data });
}

export async function getSeedSource(_req: Request, res: Response) {
  if (!isDebugAllowed()) {
    return res.status(403).json({ error: "Debug endpoint disabled in production" });
  }

  const data = await debugService.getSeedSource();
  res.json({ data });
}

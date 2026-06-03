import type { Request, Response } from "express";
import { env } from "../../config/env";
import * as debugService from "./debug.service";

// Only allow in staging/dev
function isDebugAllowed(): boolean {
  return env.NODE_ENV !== "production" || env.STAGING_DEBUG;
}

export async function getStagingStatus(req: Request, res: Response) {
  if (!isDebugAllowed()) {
    return res.status(403).json({ error: "Debug endpoint disabled in production" });
  }

  const data = await debugService.getStagingStatus();
  res.json({ data });
}

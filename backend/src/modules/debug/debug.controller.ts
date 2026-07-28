import type { Request, Response } from "express";
import { env } from "../../config/env";
import * as debugService from "./debug.service";

// Only allow in staging/dev, or in production if explicitly enabled
function isDebugAllowed(): boolean {
  if (env.NODE_ENV === "production") {
    return process.env.ALLOW_DEBUG_ENDPOINTS === "true";
  }
  return true;
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

export async function getSchemaCheck(req: Request, res: Response) {
  if (!isDebugAllowed()) {
    return res.status(403).json({ error: "Debug endpoint disabled in production" });
  }

  const data = await debugService.checkSchemaDrift();
  res.json({ data });
}

import { Response } from "express";
import { AuthedRequest } from "../../core/types";
import * as svc from "./souvenirs.service";

// GET /api/souvenirs
export async function handleGetSouvenirs(req: AuthedRequest, res: Response) {
  const data = await svc.getSouvenirs(req.user.userId);
  res.json({ data });
}

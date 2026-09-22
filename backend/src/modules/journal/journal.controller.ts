import { Response } from "express";
import { AuthedRequest } from "../../core/types";
import * as svc from "./journal.service";

export async function handleGetTodayEdition(req: AuthedRequest, res: Response) {
  const data = await svc.getTodayEdition(req.user.userId);
  res.json({ data });
}

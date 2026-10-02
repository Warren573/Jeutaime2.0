import { Response } from "express";
import { AuthedRequest } from "../../core/types";
import * as svc from "./adminMessages.service";

export async function handleListMine(req: AuthedRequest, res: Response) {
  res.json({ data: await svc.listMine(req.user.userId) });
}

export async function handleRead(req: AuthedRequest, res: Response) {
  res.json({ data: await svc.markRead(req.user.userId, req.params["id"] as string) });
}

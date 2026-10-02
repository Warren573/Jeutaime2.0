import { Response } from "express";
import { AuthedRequest } from "../../core/types";
import * as svc from "./privateSalons.service";

export async function handleListMine(req: AuthedRequest, res: Response) {
  res.json({ data: await svc.listMine(req.user.userId) });
}

export async function handleAccept(req: AuthedRequest, res: Response) {
  res.json({ data: await svc.acceptInvitation(req.user.userId, req.params["id"] as string) });
}

export async function handleSession(req: AuthedRequest, res: Response) {
  res.json({ data: await svc.getPrivateSession(req.user.userId, req.params["sessionId"] as string) });
}

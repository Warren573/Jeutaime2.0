import { Response } from "express";
import { AuthedRequest } from "../../../core/types";
import * as svc from "./adminEngagement.service";

export async function handleSendMessage(req: AuthedRequest, res: Response) {
  const data = await svc.sendAdminMessage(
    req.user.userId,
    req.params["id"] as string,
    req.body.subject,
    req.body.message,
  );
  res.status(201).json({ data });
}

export async function handleListUserMessages(req: AuthedRequest, res: Response) {
  res.json({ data: await svc.listMessagesForUser(req.params["id"] as string) });
}

export async function handleCreatePrivateSalon(req: AuthedRequest, res: Response) {
  res.status(201).json({ data: await svc.createPrivateSalon(req.user.userId, req.body) });
}

export async function handleListPrivateSalons(_req: AuthedRequest, res: Response) {
  res.json({ data: await svc.listPrivateSalons() });
}

export async function handleInvite(req: AuthedRequest, res: Response) {
  res.status(201).json({
    data: await svc.inviteToPrivateSalon(
      req.user.userId,
      req.params["sessionId"] as string,
      req.params["userId"] as string,
    ),
  });
}

export async function handleRemove(req: AuthedRequest, res: Response) {
  res.json({
    data: await svc.removeFromPrivateSalon(
      req.user.userId,
      req.params["sessionId"] as string,
      req.params["userId"] as string,
    ),
  });
}

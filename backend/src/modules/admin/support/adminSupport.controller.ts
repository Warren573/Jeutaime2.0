import { Response } from "express";
import { NotFoundError } from "../../../core/errors";
import { AuthedRequest } from "../../../core/types";
import * as svc from "./adminSupport.service";

export async function handleList(_req: AuthedRequest, res: Response) {
  res.json({ data: await svc.listSupportTickets() });
}

export async function handleUpdate(req: AuthedRequest, res: Response) {
  const ticket = await svc.updateSupportTicket(
    req.user.userId,
    req.params["id"] as string,
    req.body.status,
    req.body.reply,
  );
  if (!ticket) throw new NotFoundError("Ticket support");
  res.json({ data: ticket });
}

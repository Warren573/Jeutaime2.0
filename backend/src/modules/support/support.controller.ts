import { Response } from "express";
import { AuthedRequest } from "../../core/types";
import * as svc from "./support.service";
import type { CreateSupportTicketDto } from "./support.schemas";

export async function handleCreateTicket(req: AuthedRequest, res: Response) {
  const ticket = await svc.createSupportTicket(req.user.userId, req.body as CreateSupportTicketDto);
  res.status(201).json({ data: ticket });
}

export async function handleListMine(req: AuthedRequest, res: Response) {
  const tickets = await svc.listMySupportTickets(req.user.userId);
  res.json({ data: tickets });
}

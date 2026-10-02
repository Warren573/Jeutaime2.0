import { Response } from "express";
import { AuthedRequest } from "../../../core/types";
import * as svc from "./adminOperations.service";

export async function handleOverview(_req: AuthedRequest, res: Response) {
  res.json({ data: await svc.getOperationsOverview() });
}

export async function handleLoginEvents(req: AuthedRequest, res: Response) {
  res.json({ data: await svc.listLoginEvents(req.query as any) });
}

export async function handleIncidents(req: AuthedRequest, res: Response) {
  res.json({ data: await svc.listIncidents(req.query as any) });
}

export async function handleUpdateIncident(req: AuthedRequest, res: Response) {
  const id = req.params["id"] as string;
  const data = await svc.updateIncident(
    req.user.userId,
    id,
    req.body.resolved,
    req.body.resolution,
  );
  res.json({ data });
}

export async function handleSupport(_req: AuthedRequest, res: Response) {
  res.json({ data: await svc.getSupportTickets() });
}

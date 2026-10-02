import { Response } from "express";
import { AuthedRequest } from "../../../core/types";
import * as svc from "./adminEconomy.service";

export async function handleOverview(_req: AuthedRequest, res: Response) {
  res.json({ data: await svc.getEconomyOverview() });
}

export async function handleTransactions(req: AuthedRequest, res: Response) {
  res.json({ data: await svc.listTransactions(req.query as any) });
}

export async function handleCatalog(_req: AuthedRequest, res: Response) {
  res.json({ data: await svc.listCatalog() });
}

export async function handleUpdateOffering(req: AuthedRequest, res: Response) {
  const id = req.params["id"] as string;
  res.json({ data: await svc.updateOffering(req.user.userId, id, req.body) });
}

export async function handleUpdateMagie(req: AuthedRequest, res: Response) {
  const id = req.params["id"] as string;
  res.json({ data: await svc.updateMagie(req.user.userId, id, req.body) });
}

export async function handlePremiumUsers(_req: AuthedRequest, res: Response) {
  res.json({ data: await svc.listPremiumUsers() });
}

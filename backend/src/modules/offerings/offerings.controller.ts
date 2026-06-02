import { Response } from "express";
import { AuthedRequest } from "../../core/types";
import * as svc from "./offerings.service";
import type {
  ListReceivedQueryDto,
  SendOfferingDto,
  ConsumeOfferingBodyDto,
} from "./offerings.schemas";

// GET /api/offerings/catalog
export async function handleCatalog(_req: AuthedRequest, res: Response) {
  const data = await svc.listCatalog();
  res.json({ data });
}

// POST /api/offerings/send
export async function handleSend(req: AuthedRequest, res: Response) {
  const dto = req.body as SendOfferingDto;
  const data = await svc.sendOffering(req.user.userId, dto);
  res.status(201).json({ data });
}

// GET /api/offerings/received
export async function handleListReceived(
  req: AuthedRequest,
  res: Response,
) {
  const query = req.query as unknown as ListReceivedQueryDto;
  const { items, ...meta } = await svc.listReceived(req.user.userId, query);
  res.json({ data: items, meta });
}

// GET /api/offerings/salon/:salonId
export async function handleListSalonOfferings(
  req: AuthedRequest,
  res: Response,
) {
  const salonId = req.params["salonId"] as string;
  const data = await svc.listSalonOfferings(salonId);
  res.json({ data });
}

// POST /api/offerings/:offeringId/consume
export async function handleConsume(req: AuthedRequest, res: Response) {
  const offeringId = req.params["offeringId"] as string;
  const body = req.body as ConsumeOfferingBodyDto;
  const data = await svc.consumeOffering(offeringId, req.user.userId);
  res.json({ success: true, data });
}

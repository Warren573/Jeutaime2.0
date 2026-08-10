import { Response } from "express";
import { AuthedRequest } from "../../core/types";
import { ForbiddenError } from "../../core/errors";
import { isAccountDeactivated } from "../auth/accountLifecycle.service";
import * as svc from "./offerings.service";
import { listOfferingHistory } from "./offerings.history.service";
import { assertPersonalOfferingAllowed } from "./personalOfferings.policy";
import { getPersonalOfferingSpotlight } from "./personalOfferingsSpotlight.service";
import type {
  ListReceivedQueryDto,
  SendOfferingDto,
  SendOfferingToSessionDto,
  ConsumeOfferingBodyDto,
} from "./offerings.schemas";

// GET /api/offerings/catalog
export async function handleCatalog(_req: AuthedRequest, res: Response) {
  const data = await svc.listCatalog();
  res.json({ data });
}

// GET /api/offerings/desk-state/:userId
export async function handleDeskState(req: AuthedRequest, res: Response) {
  const userId = req.params["userId"] as string;
  const data = await getPersonalOfferingSpotlight(userId);
  res.json({ data });
}

// POST /api/offerings/send
export async function handleSend(req: AuthedRequest, res: Response) {
  const dto = req.body as SendOfferingDto;

  if (await isAccountDeactivated(dto.toUserId)) {
    throw new ForbiddenError("Cette personne a temporairement désactivé son compte");
  }

  await assertPersonalOfferingAllowed(
    req.user.userId,
    dto.toUserId,
    dto.offeringId,
    dto.salonId,
  );

  const data = await svc.sendOffering(req.user.userId, dto);
  res.status(201).json({ data });
}

// POST /api/offerings/send-to-session (Tournée générale)
export async function handleSendToSession(req: AuthedRequest, res: Response) {
  const dto = req.body as SendOfferingToSessionDto;
  const data = await svc.sendOfferingToSession(req.user.userId, dto);
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

// GET /api/offerings/history
export async function handleHistory(req: AuthedRequest, res: Response) {
  const data = await listOfferingHistory(req.user.userId);
  res.json({ data });
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
  void body;
  const data = await svc.consumeOffering(offeringId, req.user.userId);
  res.json({ success: true, data });
}

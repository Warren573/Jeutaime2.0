import { Response } from "express";
import { AuthedRequest } from "../../core/types";
import * as svc from "./magies.service";
import type { BreakMagieDto, CastMagieDto } from "./magies.schemas";

// GET /api/magies/catalog
export async function handleCatalog(_req: AuthedRequest, res: Response) {
  const data = await svc.listCatalog();
  res.json({ data });
}

// POST /api/magies/cast
export async function handleCast(req: AuthedRequest, res: Response) {
  const dto = req.body as CastMagieDto;
  const data = await svc.castSpell(req.user.userId, dto);
  res.status(201).json({ data });
}

// GET /api/magies/active/:userId
export async function handleListActive(req: AuthedRequest, res: Response) {
  const userId = req.params["userId"] as string;
  const data = await svc.listActive(userId);
  res.json({ data });
}

// POST /api/magies/:id/break
export async function handleBreak(req: AuthedRequest, res: Response) {
  const id = req.params["id"] as string;
  const { antiSpellId } = req.body as BreakMagieDto;
  const data = await svc.breakMagie(req.user.userId, id, antiSpellId);
  res.json({ data });
}

import { Response } from "express";
import { AuthedRequest } from "../../core/types";
import * as svc from "./card-game.service";
import type { RevealCardDto } from "./card-game.schemas";

export async function handleStart(req: AuthedRequest, res: Response) {
  const result = await svc.start(req.user.userId);
  res.status(201).json({ data: result });
}

export async function handleReveal(req: AuthedRequest, res: Response) {
  const sessionId = req.params["sessionId"] as string;
  const { cardIndex } = req.body as RevealCardDto;
  const result = await svc.reveal(req.user.userId, sessionId, cardIndex);
  res.json({ data: result });
}

export async function handleClaim(req: AuthedRequest, res: Response) {
  const sessionId = req.params["sessionId"] as string;
  const result = await svc.claim(req.user.userId, sessionId);
  res.json({ data: result });
}

export async function handleBet(req: AuthedRequest, res: Response) {
  const sessionId = req.params["sessionId"] as string;
  const result = await svc.bet(req.user.userId, sessionId);
  res.json({ data: result });
}

export async function handleHistory(req: AuthedRequest, res: Response) {
  const result = await svc.history(req.user.userId);
  res.json({ data: result });
}

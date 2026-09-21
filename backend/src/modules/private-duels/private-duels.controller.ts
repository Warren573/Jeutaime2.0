import { Response } from "express";
import { AuthedRequest } from "../../core/types";
import { PrivateDuelChoice } from "@prisma/client";
import * as svc from "./private-duels.service";
import type {
  CreatePrivateDuelDto,
  SubmitPrivateDuelChoiceDto,
} from "./private-duels.schemas";

export async function handleCreate(req: AuthedRequest, res: Response) {
  const { targetUserId } = req.body as CreatePrivateDuelDto;
  const result = await svc.create(req.user.userId, targetUserId);
  res.status(201).json({ data: result });
}

export async function handleListCandidates(req: AuthedRequest, res: Response) {
  const result = await svc.listCandidates(req.user.userId);
  res.json({ data: result });
}

export async function handleListMine(req: AuthedRequest, res: Response) {
  const result = await svc.listMine(req.user.userId);
  res.json({ data: result });
}

export async function handleGetOne(req: AuthedRequest, res: Response) {
  const result = await svc.getOne(req.user.userId, req.params["id"] as string);
  res.json({ data: result });
}

export async function handleSubmitChoice(req: AuthedRequest, res: Response) {
  const { choice } = req.body as SubmitPrivateDuelChoiceDto;
  const result = await svc.submitChoice(
    req.user.userId,
    req.params["id"] as string,
    choice as PrivateDuelChoice,
  );
  res.json({ data: result });
}

export async function handleRematch(req: AuthedRequest, res: Response) {
  const result = await svc.rematch(req.user.userId, req.params["id"] as string);
  res.status(201).json({ data: result });
}

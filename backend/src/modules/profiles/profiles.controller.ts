import { Response } from "express";
import * as svc from "./profiles.service";
import { AuthedRequest } from "../../core/types";

export async function handleGetMe(req: AuthedRequest, res: Response) {
  const profile = await svc.getMyProfile(req.user.userId);
  res.json({ data: profile });
}

export async function handleUpdateMe(req: AuthedRequest, res: Response) {
  const profile = await svc.updateMyProfile(req.user.userId, req.body);
  res.json({ data: profile });
}

export async function handleUpdateQuestions(req: AuthedRequest, res: Response) {
  const questions = await svc.updateQuestions(req.user.userId, req.body);
  res.json({ data: questions });
}

export async function handleGetProfile(req: AuthedRequest, res: Response) {
  const result = await svc.getPublicProfile(
    req.user.userId,
    req.params["id"] as string,
    req.user.isPremium,
  );
  res.json({ data: result });
}

export async function handleDiscovery(req: AuthedRequest, res: Response) {
  const result = await svc.discoverProfiles(req.user.userId, req.query as never);
  res.json(result);
}

export async function handleBlock(req: AuthedRequest, res: Response) {
  await svc.blockUser(req.user.userId, req.params["id"] as string);
  res.status(201).json({ data: { message: "Utilisateur bloqué" } });
}

export async function handleUnblock(req: AuthedRequest, res: Response) {
  await svc.unblockUser(req.user.userId, req.params["id"] as string);
  res.json({ data: { message: "Utilisateur débloqué" } });
}

export async function handleGetMyPhotos(req: AuthedRequest, res: Response) {
  const photos = await svc.getMyPhotos(req.user.userId);
  res.json({ data: photos });
}

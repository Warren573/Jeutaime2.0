import { Response } from "express";
import * as svc from "./profiles.service";
import { listBlockedUsers } from "./blockedUsers.service";
import { getUserSettings, updateUserSettings, type UserSettingsPatch } from "./userSettings.service";
import { applyLocationPrivacy, applyLocationPrivacyToMany } from "./profilePrivacy.service";
import { AuthedRequest } from "../../core/types";
import { computeProfileStatus } from "../../policies/profiles";

export async function handleGetMe(req: AuthedRequest, res: Response) {
  const profile = await svc.getMyProfile(req.user.userId);
  res.json({ data: { ...profile, profileStatus: computeProfileStatus(profile) } });
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
  const profile = await applyLocationPrivacy(result.profile);
  res.json({ data: { ...result, profile } });
}

export async function handleDiscovery(req: AuthedRequest, res: Response) {
  const result = await svc.discoverProfiles(req.user.userId, req.query as never);
  const data = await applyLocationPrivacyToMany(result.data);
  res.json({ ...result, data });
}

export async function handleListBlocked(req: AuthedRequest, res: Response) {
  const users = await listBlockedUsers(req.user.userId);
  res.json({ data: users });
}

export async function handleGetSettings(req: AuthedRequest, res: Response) {
  res.json({ data: await getUserSettings(req.user.userId) });
}

export async function handleUpdateSettings(req: AuthedRequest, res: Response) {
  const allowedKeys: Array<keyof UserSettingsPatch> = [
    "notifEmail",
    "notifPush",
    "soundEnabled",
    "showInDiscovery",
    "locationShared",
  ];
  const patch: UserSettingsPatch = {};
  for (const key of allowedKeys) {
    if (req.body?.[key] !== undefined) {
      if (typeof req.body[key] !== "boolean") {
        res.status(400).json({ error: `${key} must be a boolean` });
        return;
      }
      patch[key] = req.body[key];
    }
  }
  res.json({ data: await updateUserSettings(req.user.userId, patch) });
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

export async function handleUpdateShowPhotoByDefault(req: AuthedRequest, res: Response) {
  const { showPhotoByDefault } = req.body as { showPhotoByDefault: boolean };
  if (typeof showPhotoByDefault !== 'boolean') {
    res.status(400).json({ error: 'showPhotoByDefault must be a boolean' });
    return;
  }
  await svc.updateShowPhotoByDefault(req.user.userId, showPhotoByDefault);
  res.json({ data: { showPhotoByDefault } });
}

import fs from "fs";
import path from "path";
import { Response } from "express";
import { AuthedRequest } from "../../../core/types";
import * as svc from "./adminModeration.service";
import type {
  ModeratePhotoDto,
  ModerateProfileDto,
  ModerateSalonMessageDto,
} from "./adminModeration.schemas";

export async function handleOverview(_req: AuthedRequest, res: Response) {
  res.json({ data: await svc.getModerationOverview() });
}

export async function handleListPhotos(req: AuthedRequest, res: Response) {
  const status = typeof req.query["status"] === "string" ? req.query["status"] : undefined;
  res.json({ data: await svc.listPhotos(status) });
}

export async function handlePhotoFile(req: AuthedRequest, res: Response) {
  const id = req.params["id"] as string;
  const { absolutePath } = await svc.getPhotoFile(id);
  const safeName = path.basename(absolutePath);
  res.setHeader("Content-Type", "image/webp");
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Disposition", `inline; filename="${safeName}"`);
  const stream = fs.createReadStream(absolutePath);
  stream.on("error", () => {
    if (!res.headersSent) {
      res.status(404).json({ error: { code: "PHOTO_FILE_MISSING", message: "Fichier introuvable" } });
    } else {
      res.end();
    }
  });
  stream.pipe(res);
}

export async function handleModeratePhoto(req: AuthedRequest, res: Response) {
  const id = req.params["id"] as string;
  const { status, reason } = req.body as ModeratePhotoDto;
  res.json({ data: await svc.moderatePhoto(req.user.userId, id, status, reason) });
}

export async function handleProfileContent(req: AuthedRequest, res: Response) {
  const id = req.params["id"] as string;
  res.json({ data: await svc.getProfileContent(id) });
}

export async function handleModerateProfile(req: AuthedRequest, res: Response) {
  const id = req.params["id"] as string;
  const { action, reason } = req.body as ModerateProfileDto;
  res.json({ data: await svc.moderateProfile(req.user.userId, id, action, reason) });
}

export async function handleListSalonMessages(req: AuthedRequest, res: Response) {
  const hiddenRaw = typeof req.query["hidden"] === "string" ? req.query["hidden"] : undefined;
  const hidden = hiddenRaw === undefined ? undefined : hiddenRaw === "true";
  res.json({ data: await svc.listSalonMessages(hidden) });
}

export async function handleModerateSalonMessage(req: AuthedRequest, res: Response) {
  const id = req.params["id"] as string;
  const { hidden, reason } = req.body as ModerateSalonMessageDto;
  res.json({ data: await svc.moderateSalonMessage(req.user.userId, id, hidden, reason) });
}

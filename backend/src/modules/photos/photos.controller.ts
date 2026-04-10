import { Response } from "express";
import fs from "fs";
import path from "path";
import { AuthedRequest } from "../../core/types";
import { BadRequestError } from "../../core/errors";
import * as svc from "./photos.service";
import type { PhotoVariant } from "./photos.urls";

// ============================================================
// GET /api/photos/me
// ============================================================
export async function handleListMine(req: AuthedRequest, res: Response) {
  const photos = await svc.listMyPhotos(req.user.userId);
  res.json({ data: photos });
}

// ============================================================
// POST /api/photos/me
// ============================================================
export async function handleUpload(req: AuthedRequest, res: Response) {
  if (!req.file) {
    throw new BadRequestError("Fichier manquant (champ 'photo' requis)");
  }
  const photo = await svc.uploadPhoto({
    userId: req.user.userId,
    buffer: req.file.buffer,
    mimetype: req.file.mimetype,
  });
  res.status(201).json({ data: photo });
}

// ============================================================
// PATCH /api/photos/:id
// ============================================================
export async function handleUpdate(req: AuthedRequest, res: Response) {
  const photoId = req.params["id"] as string;
  const photo = await svc.updatePhoto({
    userId: req.user.userId,
    photoId,
    dto: req.body,
  });
  res.json({ data: photo });
}

// ============================================================
// DELETE /api/photos/:id
// ============================================================
export async function handleDelete(req: AuthedRequest, res: Response) {
  const photoId = req.params["id"] as string;
  await svc.deletePhoto({ userId: req.user.userId, photoId });
  res.status(204).send();
}

// ============================================================
// GET /api/photos/user/:userId
// ============================================================
export async function handleListForUser(req: AuthedRequest, res: Response) {
  const targetUserId = req.params["userId"] as string;
  const result = await svc.listPhotosForViewer({
    viewerId: req.user.userId,
    targetUserId,
    viewerIsPremium: req.user.isPremium,
  });
  res.json({
    data: result.photos,
    meta: { unlocked: result.unlocked },
  });
}

// ============================================================
// GET /api/photos/file/:id/:variant
// Stream sécurisé du fichier
// ============================================================
export async function handleStreamFile(req: AuthedRequest, res: Response) {
  const photoId = req.params["id"] as string;
  const variant = req.params["variant"] as PhotoVariant;

  const { absolutePath } = await svc.resolvePhotoForStream({
    viewerId: req.user.userId,
    viewerIsPremium: req.user.isPremium,
    photoId,
    variant,
  });

  // Défense en profondeur : ne JAMAIS faire confiance au path
  const safeName = path.basename(absolutePath);
  res.setHeader("Content-Type", "image/webp");
  res.setHeader("Cache-Control", "private, max-age=300");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Disposition", `inline; filename="${safeName}"`);

  const stream = fs.createReadStream(absolutePath);
  stream.on("error", () => {
    if (!res.headersSent) {
      res.status(404).json({
        error: { code: "PHOTO_FILE_MISSING", message: "Fichier introuvable" },
      });
    } else {
      res.end();
    }
  });
  stream.pipe(res);
}

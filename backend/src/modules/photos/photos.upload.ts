import multer, { FileFilterCallback } from "multer";
import { Request } from "express";
import { env } from "../../config/env";
import { PHOTO_ACCEPTED_MIMETYPES } from "../../config/constants";
import { BadRequestError } from "../../core/errors";

/**
 * Multer en mémoire (buffer) — sharp relira le buffer et écrira les fichiers
 * finaux. On ne laisse JAMAIS multer écrire directement sur disque pour éviter
 * d'avoir des fichiers non-normalisés sur le système de fichiers.
 */
const storage = multer.memoryStorage();

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
): void {
  if (!PHOTO_ACCEPTED_MIMETYPES.includes(file.mimetype as (typeof PHOTO_ACCEPTED_MIMETYPES)[number])) {
    cb(new BadRequestError(
      `Type de fichier non autorisé : ${file.mimetype}. Formats acceptés : JPEG, PNG, WebP.`,
    ));
    return;
  }
  cb(null, true);
}

export const uploadSinglePhoto = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024, // 5 MB par défaut
    files: 1,
  },
}).single("photo");

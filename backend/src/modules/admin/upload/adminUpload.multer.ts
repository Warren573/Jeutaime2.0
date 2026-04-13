import multer, { FileFilterCallback } from "multer";
import { Request } from "express";
import { BadRequestError } from "../../../core/errors";
import {
  ADMIN_IMAGE_MAX_BYTES,
  ADMIN_IMAGE_MIMETYPES,
} from "./adminFileStorage";

/**
 * Multer memory storage : sharp lira le buffer ensuite pour
 * valider le bitstream ET re-encoder en WebP, avant toute
 * écriture disque. Aucun fichier brut n'atterrit sur le FS.
 */
const storage = multer.memoryStorage();

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
): void {
  if (
    !ADMIN_IMAGE_MIMETYPES.includes(
      file.mimetype as (typeof ADMIN_IMAGE_MIMETYPES)[number],
    )
  ) {
    cb(
      new BadRequestError(
        `Type de fichier non autorisé : ${file.mimetype}. Formats acceptés : JPEG, PNG, WebP.`,
      ),
    );
    return;
  }
  cb(null, true);
}

export const uploadAdminImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: ADMIN_IMAGE_MAX_BYTES,
    files: 1,
  },
}).single("file");

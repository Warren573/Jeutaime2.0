import path from "path";
import fs from "fs/promises";
import sharp from "sharp";
import { env } from "../../config/env";
import {
  PHOTO_ORIGINAL_MAX_WIDTH,
  PHOTO_BLURRED_MAX_WIDTH,
  PHOTO_BLUR_SIGMA,
  PHOTO_WEBP_QUALITY,
  PHOTO_BLURRED_WEBP_QUALITY,
} from "../../config/constants";
import { UnprocessableError } from "../../core/errors";
import { logger } from "../../config/logger";

/**
 * Racine absolue du stockage des photos.
 * Calculée une seule fois au démarrage du module.
 */
export const PHOTO_ROOT = path.resolve(env.UPLOAD_DIR);

/**
 * Garantit que le répertoire du user existe sur disque.
 * Retourne le chemin absolu.
 */
export async function ensureUserDir(userId: string): Promise<string> {
  const dir = path.join(PHOTO_ROOT, userId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Convertit un chemin relatif (stocké en DB) en chemin absolu sur disque.
 * Garantit l'absence de path traversal.
 */
export function resolveStoredPath(relativePath: string): string {
  const abs = path.resolve(PHOTO_ROOT, relativePath);
  if (!abs.startsWith(PHOTO_ROOT + path.sep) && abs !== PHOTO_ROOT) {
    throw new UnprocessableError("Chemin de fichier invalide");
  }
  return abs;
}

/**
 * Construit les chemins relatifs (stockés en DB) pour un photoId donné.
 */
export function buildRelativePaths(userId: string, photoId: string) {
  return {
    originalPath: path.posix.join(userId, `${photoId}-original.webp`),
    blurredPath: path.posix.join(userId, `${photoId}-blurred.webp`),
  };
}

/**
 * Écrit l'original et le flou sur disque à partir d'un buffer d'entrée.
 * Utilise sharp pour :
 *  - valider le bitstream (rejette si non-image)
 *  - strip EXIF (pas de withMetadata)
 *  - redimensionner (downsize only, pas d'upscale)
 *  - ré-encoder en WebP
 *  - appliquer un blur fort sur la version floutée
 *
 * Retourne les chemins relatifs à stocker en DB.
 */
export async function processAndWrite(params: {
  userId: string;
  photoId: string;
  inputBuffer: Buffer;
}): Promise<{ originalPath: string; blurredPath: string }> {
  const { userId, photoId, inputBuffer } = params;

  // Vérifier que sharp accepte le bitstream
  let meta;
  try {
    meta = await sharp(inputBuffer).metadata();
  } catch (e) {
    throw new UnprocessableError("Fichier image invalide ou corrompu");
  }
  if (!meta.format || !["jpeg", "png", "webp"].includes(meta.format)) {
    throw new UnprocessableError("Format d'image non supporté");
  }

  const dir = await ensureUserDir(userId);
  const { originalPath, blurredPath } = buildRelativePaths(userId, photoId);
  const absOriginal = path.join(dir, path.basename(originalPath));
  const absBlurred = path.join(dir, path.basename(blurredPath));

  // Original : downsize, strip EXIF via rotate() (EXIF orientation baked in)
  try {
    await sharp(inputBuffer)
      .rotate()
      .resize({
        width: PHOTO_ORIGINAL_MAX_WIDTH,
        height: PHOTO_ORIGINAL_MAX_WIDTH,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: PHOTO_WEBP_QUALITY })
      .toFile(absOriginal);

    // Blurred : plus petit, blur fort, quality basse
    await sharp(inputBuffer)
      .rotate()
      .resize({
        width: PHOTO_BLURRED_MAX_WIDTH,
        height: PHOTO_BLURRED_MAX_WIDTH,
        fit: "inside",
        withoutEnlargement: true,
      })
      .blur(PHOTO_BLUR_SIGMA)
      .webp({ quality: PHOTO_BLURRED_WEBP_QUALITY })
      .toFile(absBlurred);
  } catch (e) {
    // Cleanup en cas d'échec partiel
    await safeUnlink(absOriginal);
    await safeUnlink(absBlurred);
    throw new UnprocessableError("Traitement de l'image échoué");
  }

  return { originalPath, blurredPath };
}

/**
 * Supprime les deux variantes d'une photo sur disque.
 * Idempotent : ignore ENOENT.
 */
export async function deletePhotoFiles(
  relativeOriginal: string,
  relativeBlurred: string,
): Promise<void> {
  await Promise.all([
    safeUnlink(resolveStoredPath(relativeOriginal)),
    safeUnlink(resolveStoredPath(relativeBlurred)),
  ]);
}

async function safeUnlink(absPath: string): Promise<void> {
  try {
    await fs.unlink(absPath);
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code !== "ENOENT") {
      logger.warn({ err, absPath }, "photos.storage: échec unlink");
    }
  }
}

import path from "path";
import fs from "fs/promises";
import sharp from "sharp";
import { env } from "../../config/env";
import {
  PHOTO_ORIGINAL_MAX_WIDTH,
  PHOTO_BLURRED_MAX_WIDTH,
  PHOTO_BLUR_SIGMA,
  PHOTO_BLUR_MEDIUM_SIGMA,
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
    blurMediumPath: path.posix.join(userId, `${photoId}-blur-medium.webp`),
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
}): Promise<{ originalPath: string; blurredPath: string; blurMediumPath: string }> {
  const { userId, photoId, inputBuffer } = params;

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
  const { originalPath, blurredPath, blurMediumPath } = buildRelativePaths(userId, photoId);
  const absOriginal = path.join(dir, path.basename(originalPath));
  const absBlurred = path.join(dir, path.basename(blurredPath));
  const absBlurMedium = path.join(dir, path.basename(blurMediumPath));

  try {
    // Original : downsize, strip EXIF
    await sharp(inputBuffer)
      .rotate()
      .resize({ width: PHOTO_ORIGINAL_MAX_WIDTH, height: PHOTO_ORIGINAL_MAX_WIDTH, fit: "inside", withoutEnlargement: true })
      .webp({ quality: PHOTO_WEBP_QUALITY })
      .toFile(absOriginal);

    // blurStrong (level 1) : forte anonymisation
    await sharp(inputBuffer)
      .rotate()
      .resize({ width: PHOTO_BLURRED_MAX_WIDTH, height: PHOTO_BLURRED_MAX_WIDTH, fit: "inside", withoutEnlargement: true })
      .blur(PHOTO_BLUR_SIGMA)
      .webp({ quality: PHOTO_BLURRED_WEBP_QUALITY })
      .toFile(absBlurred);

    // blurMedium (level 2) : légèrement flouté, silhouette visible
    await sharp(inputBuffer)
      .rotate()
      .resize({ width: PHOTO_BLURRED_MAX_WIDTH, height: PHOTO_BLURRED_MAX_WIDTH, fit: "inside", withoutEnlargement: true })
      .blur(PHOTO_BLUR_MEDIUM_SIGMA)
      .webp({ quality: PHOTO_BLURRED_WEBP_QUALITY })
      .toFile(absBlurMedium);
  } catch (e) {
    await safeUnlink(absOriginal);
    await safeUnlink(absBlurred);
    await safeUnlink(absBlurMedium);
    throw new UnprocessableError("Traitement de l'image échoué");
  }

  return { originalPath, blurredPath, blurMediumPath };
}

/**
 * Supprime les deux variantes d'une photo sur disque.
 * Idempotent : ignore ENOENT.
 */
export async function deletePhotoFiles(
  relativeOriginal: string,
  relativeBlurred: string,
  relativeBlurMedium?: string | null,
): Promise<void> {
  const tasks = [
    safeUnlink(resolveStoredPath(relativeOriginal)),
    safeUnlink(resolveStoredPath(relativeBlurred)),
  ];
  if (relativeBlurMedium) {
    tasks.push(safeUnlink(resolveStoredPath(relativeBlurMedium)));
  }
  await Promise.all(tasks);
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

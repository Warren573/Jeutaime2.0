import { env } from "../../config/env";

/** Variantes de fichier stockées sur disque */
export type PhotoVariant = "original" | "blurred" | "blurMedium";

/**
 * Construit l'URL API sécurisée d'une photo.
 * Format : `/api/photos/file/{photoId}/{variant}`
 *
 * Les consommateurs (web/mobile) feront un GET authentifié vers cette URL
 * et recevront le stream du fichier via la route sécurisée.
 */
export function buildPhotoUrl(photoId: string, variant: PhotoVariant): string {
  return `${env.API_PREFIX}/photos/file/${photoId}/${variant}`;
}

import { env } from "../../config/env";

export type PhotoVariant = "original";

export function buildPhotoUrl(photoId: string, variant: PhotoVariant): string {
  return `${env.API_PREFIX}/photos/file/${photoId}/${variant}`;
}

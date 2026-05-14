import { env } from "../../config/env";
export type { PhotoVariant } from "../../policies/photoUnlock";

export function buildPhotoUrl(photoId: string, variant: string): string {
  return `${env.API_PREFIX}/photos/file/${photoId}/${variant}`;
}

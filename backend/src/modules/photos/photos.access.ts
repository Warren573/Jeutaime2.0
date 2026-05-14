import { getPhotoLevel, getPhotoVariant, type PhotoLevel, type PhotoVariant } from "../../policies/photoUnlock";

export type { PhotoVariant, PhotoLevel };

export type PhotoAccessReason =
  | "OWNER"
  | "BLOCKED"
  | "NO_MATCH"
  | "LEVEL_0"
  | "LEVEL_1"
  | "LEVEL_2"
  | "LEVEL_3";

export interface PhotoAccessContext {
  viewerId: string;
  ownerId: string;
  viewerIsPremium: boolean;
  hasBlock: boolean;
  match: {
    userAId: string;
    letterCountA: number;
    letterCountB: number;
  } | null;
}

export interface PhotoAccessResult {
  allowed: boolean;
  reason: PhotoAccessReason;
  level?: PhotoLevel;
  variant?: PhotoVariant | null;
}

export function resolvePhotoAccess(ctx: PhotoAccessContext): PhotoAccessResult {
  const { viewerId, ownerId, viewerIsPremium, hasBlock, match } = ctx;

  if (viewerId === ownerId) return { allowed: true, reason: "OWNER", level: 3, variant: "original" };
  if (hasBlock) return { allowed: false, reason: "BLOCKED" };
  if (!match) return { allowed: false, reason: "NO_MATCH" };

  const totalLetters = match.letterCountA + match.letterCountB;
  const level = getPhotoLevel({ totalLetters, viewerIsPremium });
  const variant = getPhotoVariant(level);
  const allowed = level > 0;

  const reason: PhotoAccessReason = allowed ? `LEVEL_${level}` : "LEVEL_0";

  return {
    allowed,
    reason,
    level,
    variant,
  };
}

// ============================================================
// Promotion primary après suppression
// ============================================================

export interface PhotoForOrdering {
  id: string;
  position: number;
  createdAt: Date;
}

export function pickNextPrimary<T extends PhotoForOrdering>(
  photos: readonly T[],
): T | null {
  if (photos.length === 0) return null;
  const sorted = [...photos].sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    const aTime = a.createdAt.getTime();
    const bTime = b.createdAt.getTime();
    if (aTime !== bTime) return aTime - bTime;
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });
  return sorted[0] ?? null;
}

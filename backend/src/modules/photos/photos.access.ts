import { isPhotoUnlocked } from "../../policies/photoUnlock";
import type { PhotoVariant } from "./photos.urls";

export type { PhotoVariant };

export type PhotoAccessReason =
  | "OWNER"
  | "UNLOCKED"
  | "BLOCKED"
  | "NO_MATCH"
  | "NOT_UNLOCKED";

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
}

export function resolvePhotoAccess(ctx: PhotoAccessContext): PhotoAccessResult {
  const { viewerId, ownerId, viewerIsPremium, hasBlock, match } = ctx;

  if (viewerId === ownerId) return { allowed: true, reason: "OWNER" };
  if (hasBlock) return { allowed: false, reason: "BLOCKED" };
  if (!match) return { allowed: false, reason: "NO_MATCH" };

  const myLetterCount = match.userAId === viewerId ? match.letterCountA : match.letterCountB;
  const otherLetterCount = match.userAId === viewerId ? match.letterCountB : match.letterCountA;

  return isPhotoUnlocked({ myLetterCount, otherLetterCount, viewerIsPremium })
    ? { allowed: true, reason: "UNLOCKED" }
    : { allowed: false, reason: "NOT_UNLOCKED" };
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

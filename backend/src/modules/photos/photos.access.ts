/**
 * Helpers purs pour la logique d'accès photos.
 * Aucune dépendance à Prisma : permet des tests unitaires rapides.
 */
import { computePhotoLevel } from "../../policies/photoUnlock";
import type { PhotoVariant } from "./photos.urls";

export type { PhotoVariant };

export type PhotoAccessReason =
  | "OWNER"
  | "NO_BLOCK_BLURRED"
  | "UNLOCKED"
  | "BLOCKED"
  | "NO_MATCH_FOR_ORIGINAL"
  | "NOT_UNLOCKED";

export interface PhotoAccessContext {
  viewerId: string;
  ownerId: string;
  variant: PhotoVariant;
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

/**
 * Résout l'autorisation d'accès à une variante de photo.
 *
 * Règles :
 * 1. Le propriétaire voit toujours ses propres photos (toute variante)
 * 2. Un blocage refuse tout accès
 * 3. "blurred" (blurStrong, level 1) : accessible sans match si pas de blocage
 * 4. "blurMedium" (level 2) : requiert un match et level >= 2
 * 5. "original" (clear, level 3) : requiert un match et level >= 3
 */
export function resolvePhotoAccess(ctx: PhotoAccessContext): PhotoAccessResult {
  const { viewerId, ownerId, variant, viewerIsPremium, hasBlock, match } = ctx;

  if (viewerId === ownerId) return { allowed: true, reason: "OWNER" };
  if (hasBlock) return { allowed: false, reason: "BLOCKED" };

  // blurStrong : accessible dès qu'il n'y a pas de blocage (discovery)
  if (variant === "blurred") {
    return { allowed: true, reason: "NO_BLOCK_BLURRED" };
  }

  // blurMedium et original requièrent un match
  if (!match) {
    return { allowed: false, reason: "NO_MATCH_FOR_ORIGINAL" };
  }

  const myLetterCount =
    match.userAId === viewerId ? match.letterCountA : match.letterCountB;
  const otherLetterCount =
    match.userAId === viewerId ? match.letterCountB : match.letterCountA;

  const level = computePhotoLevel({ myLetterCount, otherLetterCount, viewerIsPremium });

  if (variant === "blurMedium") {
    return level >= 2
      ? { allowed: true, reason: "UNLOCKED" }
      : { allowed: false, reason: "NOT_UNLOCKED" };
  }

  // "original"
  return level >= 3
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

/**
 * Sélectionne de manière déterministe la prochaine photo à promouvoir
 * en primary après la suppression de l'ancienne.
 */
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

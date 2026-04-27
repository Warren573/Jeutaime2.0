import {
  PHOTO_UNLOCK_LETTERS_FREE,
  PHOTO_UNLOCK_LETTERS_PREMIUM,
  PHOTO_LEVEL_1_FREE,
  PHOTO_LEVEL_2_FREE,
  PHOTO_LEVEL_1_PREMIUM,
  PHOTO_LEVEL_2_PREMIUM,
} from "../config/constants";

export interface UnlockContext {
  myLetterCount: number;
  otherLetterCount: number;
  viewerIsPremium: boolean;
}

export type PhotoUnlockLevel = 0 | 1 | 2 | 3;
export type PhotoVariant = "hidden" | "blurStrong" | "blurMedium" | "clear";

/**
 * Calcule le niveau de dévoilement progressif des photos.
 *
 * Level 0 → hidden     : aucune lettre des deux côtés
 * Level 1 → blurStrong : chacun a envoyé ≥ L1 lettres
 * Level 2 → blurMedium : chacun a envoyé ≥ L2 lettres
 * Level 3 → clear      : seuil final atteint (10 free / 3 premium par côté)
 */
export function computePhotoLevel(ctx: UnlockContext): PhotoUnlockLevel {
  const l1 = ctx.viewerIsPremium ? PHOTO_LEVEL_1_PREMIUM : PHOTO_LEVEL_1_FREE;
  const l2 = ctx.viewerIsPremium ? PHOTO_LEVEL_2_PREMIUM : PHOTO_LEVEL_2_FREE;
  const l3 = ctx.viewerIsPremium ? PHOTO_UNLOCK_LETTERS_PREMIUM : PHOTO_UNLOCK_LETTERS_FREE;

  const both = (n: number) => ctx.myLetterCount >= n && ctx.otherLetterCount >= n;

  if (both(l3)) return 3;
  if (both(l2)) return 2;
  if (both(l1)) return 1;
  return 0;
}

export function levelToVariant(level: PhotoUnlockLevel): PhotoVariant {
  switch (level) {
    case 3: return "clear";
    case 2: return "blurMedium";
    case 1: return "blurStrong";
    default: return "hidden";
  }
}

export function isPhotoUnlocked(ctx: UnlockContext): boolean {
  return computePhotoLevel(ctx) === 3;
}

export function getPhotoUnlockProgress(ctx: UnlockContext): {
  threshold: number;
  myCount: number;
  otherCount: number;
  unlocked: boolean;
  level: PhotoUnlockLevel;
  variant: PhotoVariant;
} {
  const threshold = ctx.viewerIsPremium
    ? PHOTO_UNLOCK_LETTERS_PREMIUM
    : PHOTO_UNLOCK_LETTERS_FREE;
  const level = computePhotoLevel(ctx);

  return {
    threshold,
    myCount: ctx.myLetterCount,
    otherCount: ctx.otherLetterCount,
    unlocked: level === 3,
    level,
    variant: levelToVariant(level),
  };
}

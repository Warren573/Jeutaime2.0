import {
  PHOTO_THRESHOLDS_FREE,
  PHOTO_THRESHOLDS_PREMIUM,
} from "../config/constants";

export type PhotoLevel = 0 | 1 | 2 | 3;
export type PhotoVariant = "blurred" | "medium" | "original";

export interface UnlockContext {
  totalLetters: number;
  viewerIsPremium: boolean;
}

export function getPhotoLevel(ctx: UnlockContext): PhotoLevel {
  const thresholds = ctx.viewerIsPremium ? PHOTO_THRESHOLDS_PREMIUM : PHOTO_THRESHOLDS_FREE;
  const { level1, level2, level3 } = thresholds;

  if (ctx.totalLetters >= level3) return 3;
  if (ctx.totalLetters >= level2) return 2;
  if (ctx.totalLetters >= level1) return 1;
  return 0;
}

export function getPhotoVariant(level: PhotoLevel): PhotoVariant | null {
  switch (level) {
    case 3:
      return "original";
    case 2:
      return "medium";
    case 1:
      return "blurred";
    case 0:
      return null;
  }
}

export function getPhotoUnlockProgress(ctx: UnlockContext): {
  level: PhotoLevel;
  totalLetters: number;
  nextLevelAt: number | null;
  progressPercent: number;
} {
  const level = getPhotoLevel(ctx);
  const thresholds = ctx.viewerIsPremium ? PHOTO_THRESHOLDS_PREMIUM : PHOTO_THRESHOLDS_FREE;
  const { level1, level2, level3 } = thresholds;

  let nextLevelAt: number | null = null;
  let progressPercent = 100;

  if (level === 0) {
    nextLevelAt = level1;
    progressPercent = Math.round((ctx.totalLetters / level1) * 100);
  } else if (level === 1) {
    nextLevelAt = level2;
    progressPercent = Math.round(((ctx.totalLetters - level1) / (level2 - level1)) * 100);
  } else if (level === 2) {
    nextLevelAt = level3;
    progressPercent = Math.round(((ctx.totalLetters - level2) / (level3 - level2)) * 100);
  }

  return {
    level,
    totalLetters: ctx.totalLetters,
    nextLevelAt,
    progressPercent: Math.min(100, progressPercent),
  };
}

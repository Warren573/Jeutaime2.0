import {
  PHOTO_THRESHOLD_FREE,
  PHOTO_THRESHOLD_PREMIUM,
} from "../config/constants";

export type PhotoLevel = 0 | 3;
export type PhotoVariant = "original";

export interface UnlockContext {
  totalLetters: number;
  viewerIsPremium: boolean;
}

export function getPhotoLevel(ctx: UnlockContext): PhotoLevel {
  const threshold = ctx.viewerIsPremium ? PHOTO_THRESHOLD_PREMIUM : PHOTO_THRESHOLD_FREE;
  return ctx.totalLetters >= threshold ? 3 : 0;
}

export function getPhotoVariant(level: PhotoLevel): PhotoVariant | null {
  return level === 3 ? "original" : null;
}

export function getPhotoUnlockProgress(ctx: UnlockContext): {
  level: PhotoLevel;
  totalLetters: number;
  nextLevelAt: number | null;
  progressPercent: number;
} {
  const threshold = ctx.viewerIsPremium ? PHOTO_THRESHOLD_PREMIUM : PHOTO_THRESHOLD_FREE;
  const level = getPhotoLevel(ctx);

  if (level === 0) {
    const progressPercent = Math.round((ctx.totalLetters / threshold) * 100);
    return {
      level: 0,
      totalLetters: ctx.totalLetters,
      nextLevelAt: threshold,
      progressPercent: Math.min(100, progressPercent),
    };
  }

  return {
    level: 3,
    totalLetters: ctx.totalLetters,
    nextLevelAt: null,
    progressPercent: 100,
  };
}

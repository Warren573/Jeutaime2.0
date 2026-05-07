import {
  PHOTO_UNLOCK_LETTERS_FREE,
  PHOTO_UNLOCK_LETTERS_PREMIUM,
} from "../config/constants";

export interface UnlockContext {
  myLetterCount: number;
  otherLetterCount: number;
  viewerIsPremium: boolean;
}

export function isPhotoUnlocked(ctx: UnlockContext): boolean {
  const threshold = ctx.viewerIsPremium ? PHOTO_UNLOCK_LETTERS_PREMIUM : PHOTO_UNLOCK_LETTERS_FREE;
  return ctx.myLetterCount >= threshold && ctx.otherLetterCount >= threshold;
}

export function getPhotoUnlockProgress(ctx: UnlockContext): {
  threshold: number;
  myCount: number;
  otherCount: number;
  unlocked: boolean;
} {
  const threshold = ctx.viewerIsPremium
    ? PHOTO_UNLOCK_LETTERS_PREMIUM
    : PHOTO_UNLOCK_LETTERS_FREE;
  return {
    threshold,
    myCount: ctx.myLetterCount,
    otherCount: ctx.otherLetterCount,
    unlocked: isPhotoUnlocked(ctx),
  };
}

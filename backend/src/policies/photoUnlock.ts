import {
  PHOTO_UNLOCK_LETTERS_FREE,
  PHOTO_UNLOCK_LETTERS_PREMIUM,
} from "../config/constants";

export interface UnlockContext {
  /** Lettres envoyées par l'utilisateur qui regarde */
  myLetterCount: number;
  /** Lettres envoyées par l'autre */
  otherLetterCount: number;
  /** L'utilisateur qui regarde est-il Premium ? */
  viewerIsPremium: boolean;
}

/**
 * Détermine si les photos de l'autre sont déverrouillées pour ce viewer.
 *
 * Règles :
 * - Premium viewer : seuil = 3 lettres envoyées chacun
 * - Free viewer    : seuil = 10 lettres envoyées chacun
 * - "chacun" = chaque côté a envoyé au moins N lettres dans cette relation
 */
export function isPhotoUnlocked(ctx: UnlockContext): boolean {
  const threshold = ctx.viewerIsPremium
    ? PHOTO_UNLOCK_LETTERS_PREMIUM
    : PHOTO_UNLOCK_LETTERS_FREE;

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

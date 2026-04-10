import {
  BOOK_UNLOCK_LETTERS_FREE,
  BOOK_UNLOCK_LETTERS_PREMIUM,
} from "../config/constants";
import { UnlockContext } from "./photoUnlock";

/**
 * Détermine si le book privé d'un utilisateur est accessible pour ce viewer.
 * Mêmes seuils que les photos (centralisés dans constants.ts).
 */
export function isBookUnlocked(ctx: UnlockContext): boolean {
  const threshold = ctx.viewerIsPremium
    ? BOOK_UNLOCK_LETTERS_PREMIUM
    : BOOK_UNLOCK_LETTERS_FREE;

  return ctx.myLetterCount >= threshold && ctx.otherLetterCount >= threshold;
}

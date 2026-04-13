import { LetterAlternationError } from "../core/errors";

export interface AlternationContext {
  /** userId du dernier expéditeur dans ce match (null si aucune lettre) */
  lastLetterBy: string | null;
  /** userId de celui qui veut envoyer */
  senderId: string;
  /** userId de celui qui a initié le match (envoie la première lettre) */
  initiatorId: string;
}

/**
 * Vérifie si l'expéditeur peut envoyer la prochaine lettre.
 *
 * Règles :
 * - Aucune lettre encore : seul l'initiateur peut envoyer
 * - Dernière lettre envoyée par A → B doit répondre (et vice-versa)
 * - Impossible d'envoyer deux fois de suite
 *
 * Lance LetterAlternationError si non autorisé.
 */
export function assertCanSendLetter(ctx: AlternationContext): void {
  if (ctx.lastLetterBy === null) {
    // Première lettre : seul l'initiateur
    if (ctx.senderId !== ctx.initiatorId) {
      throw new LetterAlternationError();
    }
    return;
  }

  // Alternation stricte
  if (ctx.lastLetterBy === ctx.senderId) {
    throw new LetterAlternationError();
  }
}

/**
 * Retourne true si l'expéditeur peut envoyer (sans lancer d'erreur).
 */
export function canSendLetter(ctx: AlternationContext): boolean {
  try {
    assertCanSendLetter(ctx);
    return true;
  } catch {
    return false;
  }
}

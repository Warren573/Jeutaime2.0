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
 * - Aucune lettre encore : n'IMPORTE QUI peut envoyer (après validation questions)
 * - Dernière lettre envoyée par A → B doit répondre (et vice-versa)
 * - Impossible d'envoyer deux fois de suite
 *
 * Lance LetterAlternationError si non autorisé.
 */
export function assertCanSendLetter(ctx: AlternationContext): void {
  if (ctx.lastLetterBy === null) {
    // Première lettre : n'IMPORTE QUI peut envoyer (questionsValidated = true doit être vérifié par appelant)
    console.log("[assertCanSendLetter] FIRST LETTER ALLOWED (questionsValidated should be checked by caller)");
    return;
  }

  // Alternation stricte : pas deux fois de suite
  if (ctx.lastLetterBy === ctx.senderId) {
    console.log("[assertCanSendLetter] ALTERNATION VIOLATION REJECTED:", {
      reason: "Trying to send twice in a row",
      senderId: ctx.senderId,
      lastLetterBy: ctx.lastLetterBy,
    });
    throw new LetterAlternationError();
  }
  console.log("[assertCanSendLetter] ALTERNATION CHECK PASSED");
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

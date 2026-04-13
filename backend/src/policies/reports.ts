/**
 * Policy pure pour la création de Reports.
 * Aucune dépendance Prisma — testable unitairement.
 *
 * Règles métier :
 *   1. Un user ne peut pas se signaler lui-même.
 *   2. Un même reporter ne peut pas avoir plus d'un report "ouvert"
 *      (status OPEN ou REVIEWING) sur la même cible. On évite ainsi
 *      l'inondation de la modération par un user vindicatif. La
 *      vérification du seuil se fait sur un compteur préalablement
 *      calculé par le service depuis la DB.
 */
import { BadRequestError, ConflictError } from "../core/errors";

/** Nombre max de reports "ouverts" par couple (reporter, target). */
export const MAX_OPEN_REPORTS_PER_TARGET = 1;

/**
 * Empêche un utilisateur de se signaler lui-même.
 * @throws BadRequestError 400
 */
export function assertNotSelfReport(
  reporterId: string,
  targetId: string,
): void {
  if (reporterId === targetId) {
    throw new BadRequestError("Tu ne peux pas te signaler toi-même");
  }
}

/**
 * Vérifie qu'un nouveau report peut être créé pour ce couple.
 * @param existingOpenCount nombre de reports OPEN/REVIEWING existants
 *                          du même reporter contre la même cible
 * @throws ConflictError 409 si un report ouvert existe déjà
 */
export function assertCanCreateNewReport(existingOpenCount: number): void {
  if (existingOpenCount >= MAX_OPEN_REPORTS_PER_TARGET) {
    throw new ConflictError(
      "Tu as déjà un signalement en cours sur cet utilisateur",
    );
  }
}

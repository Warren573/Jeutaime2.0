/**
 * Logique pure de mutation du solde d'un wallet.
 * Sépare le calcul (vérifiable unitairement) de la persistance Prisma.
 *
 * Invariant absolu : le solde ne peut JAMAIS devenir négatif.
 * Toute tentative de débit insuffisant lance NotEnoughCoinsError.
 */
import { BadRequestError, NotEnoughCoinsError } from "../core/errors";

/**
 * Calcule le nouveau solde après débit.
 * @param currentBalance solde actuel (doit être ≥ 0)
 * @param amount montant à débiter (doit être > 0, on passe une valeur positive)
 * @returns nouveau solde
 * @throws NotEnoughCoinsError si fonds insuffisants
 * @throws BadRequestError si amount ≤ 0
 */
export function computeDebitBalance(
  currentBalance: number,
  amount: number,
): number {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new BadRequestError("Montant de débit invalide");
  }
  if (currentBalance < amount) {
    throw new NotEnoughCoinsError(amount, currentBalance);
  }
  return currentBalance - amount;
}

/**
 * Calcule le nouveau solde après crédit.
 * @param currentBalance solde actuel
 * @param amount montant à créditer (doit être > 0)
 * @throws BadRequestError si amount ≤ 0
 */
export function computeCreditBalance(
  currentBalance: number,
  amount: number,
): number {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new BadRequestError("Montant de crédit invalide");
  }
  return currentBalance + amount;
}

/**
 * Helpers purs pour les jobs de maintenance.
 *
 * Aucune dépendance Prisma — tout est testable unitairement.
 * Les jobs eux-mêmes (src/jobs/*) consomment ces fonctions et ajoutent
 * la couche d'exécution.
 *
 * Principe clé : aucun job n'est nécessaire à la correction métier.
 * Ces helpers servent uniquement à la maintenance / hygiène DB.
 */
import { PremiumTier } from "@prisma/client";
import { BadRequestError } from "../core/errors";

// ============================================================
// computeRefreshTokenPurgeCutoff
// ============================================================

/**
 * Calcule la date limite en-dessous de laquelle un refresh token peut
 * être supprimé. Tout token dont `expiresAt < cutoff` est purgeable.
 *
 * `graceMs` permet de retarder la suppression (ex: garder 1h après
 * expiration pour éviter de purger un token juste utilisé en
 * condition de course).
 *
 * @throws BadRequestError si graceMs n'est pas un entier >= 0
 */
export function computeRefreshTokenPurgeCutoff(
  now: Date,
  graceMs: number,
): Date {
  if (!Number.isInteger(graceMs) || graceMs < 0) {
    throw new BadRequestError("graceMs doit être un entier >= 0");
  }
  return new Date(now.getTime() - graceMs);
}

// ============================================================
// isPremiumToDemote
// ============================================================

export interface PremiumDemoteCandidate {
  premiumTier: PremiumTier;
  premiumUntil: Date | null;
}

/**
 * Détermine si un utilisateur au tier PREMIUM doit être rétrogradé à
 * FREE parce que son `premiumUntil` est passé.
 *
 * Règles :
 *   - tier !== PREMIUM → false (rien à faire)
 *   - premiumUntil === null → false (état exotique, on ne touche pas)
 *   - premiumUntil > now → false (encore actif)
 *   - premiumUntil <= now → true (expiré → demote)
 *
 * Note : la sémantique est alignée sur `isPremiumActive` de
 * `src/policies/premium.ts`. Un user dont `isPremiumActive` retourne
 * false et dont le tier est encore PREMIUM est demotable.
 */
export function isPremiumToDemote(
  user: PremiumDemoteCandidate,
  now: Date,
): boolean {
  if (user.premiumTier !== PremiumTier.PREMIUM) return false;
  if (user.premiumUntil === null) return false;
  return user.premiumUntil.getTime() <= now.getTime();
}

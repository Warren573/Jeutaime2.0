/**
 * Logique pure pour le statut Premium.
 * Aucune dépendance Prisma : garantit la testabilité et une source
 * unique de vérité pour toutes les couches (middleware auth, services).
 */
import { PremiumTier } from "@prisma/client";

export interface PremiumSnapshot {
  premiumTier: PremiumTier;
  premiumUntil: Date | null;
}

/**
 * Un user est Premium ssi :
 *   - premiumTier === PREMIUM
 *   - ET premiumUntil !== null
 *   - ET premiumUntil > now
 *
 * Interprétation stricte (pas de "Premium à vie" implicite) :
 * premiumUntil === null est considéré comme INACTIF même si le tier
 * est PREMIUM, pour éviter tout état ambigu dû à un bug ou un seed
 * incomplet. Une souscription doit toujours définir une date de fin.
 */
export function isPremiumActive(
  user: PremiumSnapshot,
  now: Date = new Date(),
): boolean {
  if (user.premiumTier !== PremiumTier.PREMIUM) return false;
  if (user.premiumUntil === null) return false;
  return user.premiumUntil.getTime() > now.getTime();
}

/**
 * Calcule la nouvelle date d'expiration Premium après une souscription.
 *
 * Règle : si l'utilisateur a déjà un Premium actif, on étend à partir
 * de sa date de fin actuelle (cumul). Sinon, on part de `now`.
 * Retourne une nouvelle Date (ne mute pas les arguments).
 */
export function computeNewPremiumUntil(
  current: Date | null,
  durationDays: number,
  now: Date = new Date(),
): Date {
  const base =
    current !== null && current.getTime() > now.getTime() ? current : now;
  const result = new Date(base.getTime());
  result.setUTCDate(result.getUTCDate() + durationDays);
  return result;
}

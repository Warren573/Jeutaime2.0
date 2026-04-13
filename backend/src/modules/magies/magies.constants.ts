/**
 * Constantes partagées du module Magies.
 *
 * Ces valeurs forment un contrat avec le seed Prisma (prisma/seed.ts).
 * Si tu modifies ce mapping, vérifie que les ids du catalogue existent.
 */

/**
 * Mapping breakConditionId → anti-sort qui la satisfait.
 *
 * Un sort porté dans le catalogue déclare un `breakConditionId` (ex:
 * "kiss"). Pour casser ce sort, un user doit caster l'anti-sort
 * correspondant — ici `mag_bisou`. Ce mapping est la source de vérité
 * pour la policy `assertAntiSpellBreaksCondition`.
 *
 * Les clés doivent matcher les `breakConditionId` du seed, les valeurs
 * les `id` des anti-sorts (entrées du catalogue avec durationSec === 0).
 */
export const BREAK_CONDITION_TO_ANTISPELL: Readonly<Record<string, string>> = {
  kiss: "mag_bisou",
  compliment: "mag_compliment",
  water: "mag_eau",
  dance: "mag_danse",
  laughter: "mag_rire",
  music: "mag_musique",
} as const;

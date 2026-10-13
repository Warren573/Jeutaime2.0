/**
 * Récompenses finales du Refuge, décidées le 13 octobre 2026.
 *
 * Une participation complète est nécessaire CHAQUE JOUR pour être assidu.
 * Le score parfait collectif nécessite, en plus, un résultat parfait à
 * chacune des sept journées pour les deux joueurs.
 * Aucun versement n'est effectué ici : ce module calcule uniquement les droits.
 */
export interface RefugeFinalParticipation {
  adopteDays: readonly number[];
  adoptantDays: readonly number[];
  perfectDays: readonly number[];
}
export interface RefugeFinalRewards {
  adopte: 0 | 50 | 100;
  adoptant: 0 | 50 | 100;
  collectivePerfect: boolean;
}
export const REFUGE_REQUIRED_DAYS = 7;
function hasEveryDay(days: readonly number[]): boolean {
  const present = new Set(days);
  return Array.from({length: REFUGE_REQUIRED_DAYS}, (_, i) => i + 1)
    .every(day => present.has(day));
}
export function calculateRefugeFinalRewards(p: RefugeFinalParticipation): RefugeFinalRewards {
  const adopteAssiduous = hasEveryDay(p.adopteDays);
  const adoptantAssiduous = hasEveryDay(p.adoptantDays);
  const collectivePerfect = adopteAssiduous && adoptantAssiduous && hasEveryDay(p.perfectDays);
  return {
    adopte: collectivePerfect ? 100 : adopteAssiduous ? 50 : 0,
    adoptant: collectivePerfect ? 100 : adoptantAssiduous ? 50 : 0,
    collectivePerfect,
  };
}

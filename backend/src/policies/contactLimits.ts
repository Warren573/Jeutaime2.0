import { MATCH_LIMIT_FREE, MATCH_LIMIT_PREMIUM } from "../config/constants";

/**
 * Retourne le nombre de matchs actifs autorisés selon la formule.
 */
export function getMatchLimit(isPremium: boolean): number {
  return isPremium ? MATCH_LIMIT_PREMIUM : MATCH_LIMIT_FREE;
}

/**
 * Vérifie si un user peut encore ouvrir un nouveau match.
 */
export function canOpenNewMatch(currentActiveMatches: number, isPremium: boolean): boolean {
  return currentActiveMatches < getMatchLimit(isPremium);
}

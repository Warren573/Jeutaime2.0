/**
 * JeuTaime — Registre central des features
 *
 * États possibles :
 *   "unlocked" → accessible normalement
 *   "locked"   → visible mais non accessible (teaser verrouillé)
 *   "teased"   → visible comme promesse / découverte future
 *   "hidden"   → complètement masqué (UI + routes)
 *
 * C'est ici qu'on pilote la visibilité/accessibilité de toute l'app.
 * Ne jamais hardcoder la logique d'accès ailleurs.
 */

export type FeatureState = "unlocked" | "locked" | "teased" | "hidden";

export const FEATURES: Record<string, FeatureState> = {
  home:      "unlocked",
  profiles:  "unlocked",
  letters:   "unlocked",
  journal:   "hidden",
  social:    "unlocked",
  salons:    "unlocked",
  refuge:    "hidden",
  offrandes: "unlocked",
  magie:     "unlocked",
  games:     "unlocked",
  premium:   "unlocked",
  settings:  "unlocked",
};

/** Retourne true si la feature est accessible (unlocked) */
export function isUnlocked(key: string): boolean {
  return FEATURES[key] === "unlocked";
}

/** Retourne true si la feature doit être visible dans l'UI */
export function isVisible(key: string): boolean {
  return FEATURES[key] !== "hidden";
}

/** Retourne true si la feature est verrouillée (locked ou teased) */
export function isLocked(key: string): boolean {
  const state = FEATURES[key];
  return state === "locked" || state === "teased";
}

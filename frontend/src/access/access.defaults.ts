import type { AccessState } from "./access.types";
import type { FeatureKey } from "./feature.keys";

/**
 * État d'accès par défaut pour chaque feature.
 * Toutes sont "unlocked" — à modifier ici pour ajuster plus tard.
 *
 * Exemples futurs :
 *   salons:    "teased"
 *   refuge:    "hidden"
 *   premium:   "locked"
 */
export const DEFAULT_ACCESS: Record<FeatureKey, AccessState> = {
  home:      "unlocked",
  profiles:  "unlocked",
  social:    "unlocked",
  letters:   "unlocked",
  journal:   "unlocked",
  salons:    "unlocked",
  refuge:    "unlocked",
  offrandes: "unlocked",
  magie:     "unlocked",
  games:     "unlocked",
  premium:   "unlocked",
  settings:  "unlocked",
};

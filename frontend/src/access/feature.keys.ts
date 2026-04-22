export const FEATURE_KEYS = {
  HOME:      "home",
  PROFILES:  "profiles",
  SOCIAL:    "social",
  LETTERS:   "letters",
  JOURNAL:   "journal",
  SALONS:    "salons",
  REFUGE:    "refuge",
  OFFRANDES: "offrandes",
  MAGIE:     "magie",
  GAMES:     "games",
  PREMIUM:   "premium",
  SETTINGS:  "settings",
} as const;

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS];

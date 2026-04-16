export type FeatureState = "unlocked" | "locked" | "teased" | "hidden";

export const FEATURES: Record<string, FeatureState> = {
  home: "unlocked",
  profiles: "unlocked",
  letters: "hidden",
  journal: "hidden",
  social: "unlocked",
  salons: "unlocked",
  refuge: "hidden",
  offrandes: "unlocked",
  magie: "unlocked",
  games: "unlocked",
  premium: "unlocked",
  settings: "unlocked",
};

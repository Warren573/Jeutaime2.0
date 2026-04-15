export type FeatureState = "unlocked" | "locked" | "teased" | "hidden";

export const FEATURES: Record<string, FeatureState> = {
  home: "unlocked",
  profiles: "unlocked",
  letters: "hidden",
  journal: "unlocked",
  social: "unlocked",
  salons: "hidden",
  refuge: "hidden",
  offrandes: "unlocked",
  magie: "unlocked",
  games: "unlocked",
  premium: "unlocked",
  settings: "unlocked",
};

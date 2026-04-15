export type FeatureState = "unlocked" | "locked" | "teased" | "hidden";

export const FEATURES: Record<string, FeatureState> = {
  home: "unlocked",
  profiles: "hidden",
  letters: "hidden",
  journal: "unlocked",
  social: "unlocked",
  salons: "unlocked",
  refuge: "hidden",
  offrandes: "unlocked",
  magie: "unlocked",
  games: "hidden",
  premium: "unlocked",
  settings: "unlocked",
};

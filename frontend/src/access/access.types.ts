export type AccessState = "unlocked" | "locked" | "teased" | "hidden";

export interface TabConfig {
  icon: string;
  label: string;
}

export interface FeatureDefinition {
  /** Clé unique de la feature (correspond à FEATURE_KEYS) */
  key: string;
  /** Libellé lisible */
  label: string;
  /** Routes Expo Router associées à cette feature */
  routes: string[];
  /** Config onglet — présent seulement pour les features visibles dans la TabBar */
  tab?: TabConfig;
  /** État d'accès courant */
  access: AccessState;
}

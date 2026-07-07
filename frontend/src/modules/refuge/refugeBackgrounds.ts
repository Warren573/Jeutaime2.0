export interface BackgroundDefinition {
  id: string;
  name: string;
  colors: [string, string];
}

export const BACKGROUND_DEFINITIONS: Record<string, BackgroundDefinition> = {
  FORET: {
    id: "FORET",
    name: "Forêt",
    colors: ["#2D5016", "#0F3E14"],
  },
  PLAGE: {
    id: "PLAGE",
    name: "Plage",
    colors: ["#87CEEB", "#FFFACD"],
  },
  NEIGE: {
    id: "NEIGE",
    name: "Neige",
    colors: ["#E0F6FF", "#F0FFFF"],
  },
  AUTOMNE: {
    id: "AUTOMNE",
    name: "Automne",
    colors: ["#FF8C00", "#FFD700"],
  },
  MONTAGNE: {
    id: "MONTAGNE",
    name: "Montagne",
    colors: ["#4B0082", "#708090"],
  },
  NUIT_ETOILEE: {
    id: "NUIT_ETOILEE",
    name: "Nuit Étoilée",
    colors: ["#0B1929", "#1A237E"],
  },
};

/**
 * Fonds d'ambiance du Refuge — purement esthétiques, sans effet gameplay.
 *
 * Les CLÉS sont les valeurs EXACTES de l'enum Prisma `RefugeBackground`
 * (backend/prisma/schema.prisma) : c'est ce que l'API envoie et attend.
 * Les libellés français ne servent qu'à l'affichage.
 * Défaut serveur : FORET.
 */

export const REFUGE_BACKGROUND_IDS = [
  "FORET",
  "PLAGE",
  "NEIGE",
  "AUTOMNE",
  "MONTAGNE",
  "NUIT_ETOILEE",
] as const;

export type RefugeBackgroundType = (typeof REFUGE_BACKGROUND_IDS)[number];

/** Garde de type : valide une valeur venue du serveur contre l'enum. */
export function isRefugeBackground(value: string | null | undefined): value is RefugeBackgroundType {
  return typeof value === "string" && (REFUGE_BACKGROUND_IDS as readonly string[]).includes(value);
}

export interface RefugeBackground {
  id: RefugeBackgroundType;
  label: string;
  emoji: string;
  description: string;
  gradient: string[]; // Array of 2-3 colors for gradient
}

export const REFUGE_BACKGROUNDS: Record<RefugeBackgroundType, RefugeBackground> = {
  FORET: {
    id: "FORET",
    label: "Forêt",
    emoji: "🌲",
    description: "Ambiance boisée et naturelle",
    gradient: ["#A8B895", "#7A9B6E"], // Soft greens
  },
  PLAGE: {
    id: "PLAGE",
    label: "Plage",
    emoji: "🏖️",
    description: "Sable et mer apaisants",
    gradient: ["#E8D5C4", "#B8A896"], // Sand tones, slightly desaturated
  },
  NEIGE: {
    id: "NEIGE",
    label: "Neige",
    emoji: "❄️",
    description: "Paysage enneigé doux",
    gradient: ["#E8F0F8", "#D0DFE8"], // Cool whites, slightly desaturated
  },
  AUTOMNE: {
    id: "AUTOMNE",
    label: "Automne",
    emoji: "🍂",
    description: "Teintes chaudes d'automne",
    gradient: ["#C9A383", "#A5845C"], // Warm autumn tones, desaturated
  },
  MONTAGNE: {
    id: "MONTAGNE",
    label: "Montagne",
    emoji: "⛰️",
    description: "Pics montagneux majestueux",
    gradient: ["#9B9B9B", "#6B6B6B"], // Cool grays, slightly desaturated
  },
  NUIT_ETOILEE: {
    id: "NUIT_ETOILEE",
    label: "Nuit Étoilée",
    emoji: "✨",
    description: "Ciel nocturne paisible",
    gradient: ["#2C3E50", "#1A2332"], // Deep blue-grays
  },
};

/** Défaut aligné sur le défaut Prisma (`background @default(FORET)`). */
export const DEFAULT_REFUGE_BACKGROUND: RefugeBackgroundType = "FORET";

export function getBackgroundGradientStyle(backgroundId: string | null | undefined) {
  const bg = isRefugeBackground(backgroundId)
    ? REFUGE_BACKGROUNDS[backgroundId]
    : REFUGE_BACKGROUNDS[DEFAULT_REFUGE_BACKGROUND];

  // For React Native, we'll use backgroundColor with opacity for soft effect
  // The first color is the primary background
  return {
    backgroundColor: bg.gradient[0],
  };
}

export function getBackgroundLabel(backgroundId: string): string {
  return isRefugeBackground(backgroundId)
    ? REFUGE_BACKGROUNDS[backgroundId].label
    : REFUGE_BACKGROUNDS[DEFAULT_REFUGE_BACKGROUND].label;
}

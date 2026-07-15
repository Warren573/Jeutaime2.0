/**
 * Système d'actions du Refuge.
 * Actions disponibles : nourrir, jouer, caresser, laver.
 */

export const REFUGE_ACTIONS = [
  "feed",
  "play",
  "pet",
  "wash",
] as const;

export type RefugeActionType = (typeof REFUGE_ACTIONS)[number];

export const ACTION_LABELS: Record<RefugeActionType, string> = {
  feed: "Nourrir",
  play: "Jouer",
  pet: "Câliner",
  wash: "Laver",
};

// Correspondance clés UI ↔ enum backend (RefugeAction Prisma)
export const ACTION_TO_BACKEND: Record<RefugeActionType, string> = {
  feed: "NOURRIR",
  play: "JOUER",
  pet: "CARESSER",
  wash: "LAVER",
};

export const BACKEND_ACTION_LABELS: Record<string, string> = {
  NOURRIR: "Nourrir",
  JOUER: "Jouer",
  CARESSER: "Caresser",
  LAVER: "Laver",
};

export const BACKEND_ACTION_ICONS: Record<string, string> = {
  NOURRIR: "🍖",
  JOUER: "🎾",
  CARESSER: "🤗",
  LAVER: "🧼",
};

export const ACTION_DURATION_MS = 1200;
export const ACTION_FRAME_INTERVAL_MS = 180;

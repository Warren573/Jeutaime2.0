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

export const ACTION_DURATION_MS = 1200;
export const ACTION_FRAME_INTERVAL_MS = 180;

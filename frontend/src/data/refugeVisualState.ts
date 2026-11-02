import type { RefugeAnimalVisualState } from "./refugeAnimalImages";

/**
 * Pure mapping of existing Refuge session facts to the five shipped PNG states.
 * Never stores visual state separately: reloading/reconnecting derives it again.
 */
export function getRefugeVisualState(input: {
  status: string;
  todayResult?: { matches: number } | null;
  selectedActions?: readonly string[];
  adopteSubmittedToday?: boolean;
  adoptantSubmittedToday?: boolean;
}): RefugeAnimalVisualState {
  if (input.status === "WAITING_FOR_ADOPTANT" || input.status === "CREATION") return "dort";
  if (input.todayResult) return input.todayResult.matches > 0 ? "content" : "boude";
  if (input.selectedActions?.includes("play")) return "joue";
  if (input.adopteSubmittedToday && !input.adoptantSubmittedToday) return "dort";
  return "assis";
}

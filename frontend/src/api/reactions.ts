import { apiFetch } from "./client";

export type ReactionType = "SMILE" | "GRIMACE";

export interface ReactionDTO {
  id: string;
  fromId: string;
  toId: string;
  type: ReactionType;
  createdAt: string;
  matchCreated: boolean;
  matchId?: string;
  /** Compatibilité temporaire avec l'écran Découverte. */
  debugBranch?: "NEW-MATCH";
}

export interface ReactionStatusDTO {
  outgoingType: ReactionType | null;
  incomingType: ReactionType | null;
  mutualSmile: boolean;
}

/**
 * Envoyer un sourire ou une grimace à un profil.
 * Si sourire mutuel : matchCreated = true et matchId est retourné.
 */
export async function sendReaction(
  toId: string,
  type: ReactionType,
): Promise<ReactionDTO> {
  const res = await apiFetch("/discover/react", {
    method: "POST",
    body: JSON.stringify({ toId, type }),
  });
  return res.data;
}

export async function getReactionStatus(toId: string): Promise<ReactionStatusDTO> {
  const res = await apiFetch(`/discover/reaction-status/${toId}`);
  return res.data;
}

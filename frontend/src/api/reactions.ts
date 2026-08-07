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
  source?: string;
  debugBranch?: string;
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
  console.log("[sendReaction] RAW_RESPONSE:", JSON.stringify(res, null, 2));
  return res.data;
}

export async function getReactionStatus(toId: string): Promise<ReactionStatusDTO> {
  const res = await apiFetch(`/discover/reaction-status/${toId}`);
  return res.data;
}

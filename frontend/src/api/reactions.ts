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
  }) as { data: ReactionDTO };
  return res.data;
}

import { apiFetch } from "./client";

export type PrivateDuelChoice = "ROCK" | "PAPER" | "SCISSORS";
export type PrivateDuelStatus = "PENDING" | "RESOLVED" | "CANCELLED" | "EXPIRED";
export type PrivateDuelResult = "WIN" | "LOSE" | "DRAW" | "PENDING";

export interface PrivateDuelCandidate {
  id: string;
  pseudo: string;
}

export interface PrivateDuelDTO {
  id: string;
  status: PrivateDuelStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  isChallenger: boolean;
  myUserId: string;
  myPseudo: string;
  opponentId: string;
  opponentPseudo: string;
  myChoice: PrivateDuelChoice | null;
  opponentChoice: PrivateDuelChoice | null;
  hasPlayed: boolean;
  opponentHasPlayed: boolean;
  winnerId: string | null;
  result: PrivateDuelResult;
}

export async function listPrivateDuelCandidates(): Promise<PrivateDuelCandidate[]> {
  const res = await apiFetch("/private-duels/candidates") as { data: PrivateDuelCandidate[] };
  return res?.data ?? [];
}

export async function createPrivateDuel(targetUserId: string): Promise<PrivateDuelDTO> {
  const res = await apiFetch("/private-duels", {
    method: "POST",
    body: JSON.stringify({ targetUserId }),
  }) as { data: PrivateDuelDTO };
  return res.data;
}

export async function listPrivateDuels(): Promise<PrivateDuelDTO[]> {
  const res = await apiFetch("/private-duels") as { data: PrivateDuelDTO[] };
  return res?.data ?? [];
}

export async function getPrivateDuel(id: string): Promise<PrivateDuelDTO> {
  const res = await apiFetch(`/private-duels/${id}`) as { data: PrivateDuelDTO };
  return res.data;
}

export async function submitPrivateDuelChoice(
  id: string,
  choice: PrivateDuelChoice,
): Promise<PrivateDuelDTO> {
  const res = await apiFetch(`/private-duels/${id}/choice`, {
    method: "POST",
    body: JSON.stringify({ choice }),
  }) as { data: PrivateDuelDTO };
  return res.data;
}

export async function rematchPrivateDuel(id: string): Promise<PrivateDuelDTO> {
  const res = await apiFetch(`/private-duels/${id}/rematch`, {
    method: "POST",
  }) as { data: PrivateDuelDTO };
  return res.data;
}

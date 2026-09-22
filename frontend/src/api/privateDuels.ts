import { apiFetch } from "./client";

export type PrivateDuelChoice = "ROCK" | "PAPER" | "SCISSORS";
export type PrivateDuelStatus = "PENDING" | "RESOLVED" | "CANCELLED" | "EXPIRED";
export type PrivateDuelResult = "WIN" | "LOSE" | "DRAW" | "PENDING" | "DECLINED" | "EXPIRED";

export interface PrivateDuelCandidate {
  id: string;
  pseudo: string;
  commonUserId: string;
  commonPseudo: string;
}

export interface PrivateDuelStats {
  participations: number;
  wins: number;
  participationPoints: number;
  victoryPoints: number;
}

export interface PrivateDuelDTO {
  id: string;
  status: PrivateDuelStatus;
  createdAt: string;
  expiresAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  declinedAt: string | null;
  isChallenger: boolean;
  myUserId: string;
  myPseudo: string;
  opponentId: string;
  opponentPseudo: string;
  commonUserId: string | null;
  commonUserPseudo: string;
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

export async function createPrivateDuel(targetUserId: string, commonUserId: string): Promise<PrivateDuelDTO> {
  const res = await apiFetch("/private-duels", {
    method: "POST",
    body: JSON.stringify({ targetUserId, commonUserId }),
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

export async function getPrivateDuelStats(): Promise<PrivateDuelStats> {
  const res = await apiFetch("/private-duels/stats") as { data: PrivateDuelStats };
  return res.data;
}

export async function declinePrivateDuel(id: string): Promise<PrivateDuelDTO> {
  const res = await apiFetch(`/private-duels/${id}/decline`, {
    method: "POST",
  }) as { data: PrivateDuelDTO };
  return res.data;
}

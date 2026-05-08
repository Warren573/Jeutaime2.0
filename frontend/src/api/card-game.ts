import { apiFetch } from "./client";

export type CardSuit = "heart" | "spade" | "club" | "diamond";

export interface GameStartHint {
  suit: CardSuit;
  count: number;
}

export interface DiamondHint {
  row: 1 | 2;
  suit: CardSuit;
}

export interface CardEffect {
  suit: CardSuit;
  gainsDelta: number;
  newGains: number;
  allRevealed: boolean;
  diamondHint?: DiamondHint;
}

export interface StartResult {
  sessionId: string;
  hint: GameStartHint;
  expiresAt: string;
}

export interface RevealResult {
  cardIndex: number;
  effect: CardEffect;
  gainsCurrent: number;
}

export interface ClaimResult {
  gained: number;
  newBalance: number;
}

export interface BetResult {
  heartsRemaining: number;
  won: boolean;
  gained: number;
  newBalance: number;
}

export interface HistoryItem {
  id: string;
  status: "ACTIVE" | "CLAIMED" | "EXPIRED";
  gainsCurrent: number;
  claimedAmount: number | null;
  entryAmount: number;
  expiresAt: string;
  claimedAt: string | null;
  createdAt: string;
}

export async function startCardGame(): Promise<StartResult> {
  const res = (await apiFetch("/card-game/start", { method: "POST" })) as {
    data: StartResult;
  };
  return res.data;
}

export async function revealCard(
  sessionId: string,
  cardIndex: number,
): Promise<RevealResult> {
  const res = (await apiFetch(`/card-game/${sessionId}/reveal`, {
    method: "POST",
    body: JSON.stringify({ cardIndex }),
  })) as { data: RevealResult };
  return res.data;
}

export async function claimCardGame(sessionId: string): Promise<ClaimResult> {
  const res = (await apiFetch(`/card-game/${sessionId}/claim`, {
    method: "POST",
  })) as { data: ClaimResult };
  return res.data;
}

export async function betCardGame(sessionId: string): Promise<BetResult> {
  const res = (await apiFetch(`/card-game/${sessionId}/bet`, {
    method: "POST",
  })) as { data: BetResult };
  return res.data;
}

export async function getCardGameHistory(): Promise<HistoryItem[]> {
  const res = (await apiFetch("/card-game/history")) as {
    data: HistoryItem[];
  };
  return res.data;
}

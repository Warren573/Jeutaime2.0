import { apiFetch } from "./client";

export interface DuelProfileDTO {
  id: string;
  pseudo: string;
  age: number;
  city: string;
  bio: string | null;
  avatarConfig: Record<string, unknown> | null;
}

export interface DuelDTO {
  duelId: string;
  candidateA: DuelProfileDTO;
  candidateB: DuelProfileDTO;
}

export interface WeeklyProfileStateDTO {
  remainingToday: number;
  dailyLimit: number;
  limitReached: boolean;
  notEnoughCandidates: boolean;
  duel: DuelDTO | null;
}

export interface WeeklyProfileWinnerDTO {
  id: string;
  pseudo: string;
  age: number;
  city: string;
  bio: string | null;
  avatarConfig: Record<string, unknown> | null;
  gender: "HOMME" | "FEMME" | "AUTRE";
  totalVotes: number;
  weekKey: string;
}

export interface WeeklyProfileWinnersDTO {
  weekKey: string;
  male: WeeklyProfileWinnerDTO | null;
  female: WeeklyProfileWinnerDTO | null;
}

export async function getWeeklyProfileState(): Promise<WeeklyProfileStateDTO> {
  const res = (await apiFetch("/weekly-profile")) as { data: WeeklyProfileStateDTO };
  return res.data;
}

export async function voteForDuel(duelId: string, chosenId: string): Promise<WeeklyProfileStateDTO> {
  const res = (await apiFetch("/weekly-profile/vote", {
    method: "POST",
    body: JSON.stringify({ duelId, chosenId }),
  })) as { data: WeeklyProfileStateDTO };
  return res.data;
}

export async function getWeeklyProfileWinners(): Promise<WeeklyProfileWinnersDTO> {
  const res = (await apiFetch("/weekly-profile/winners")) as { data: WeeklyProfileWinnersDTO };
  return res.data;
}

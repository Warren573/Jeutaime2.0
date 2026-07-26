import { apiFetch } from "./client";

export interface WeeklyProfileCandidateDTO {
  id: string;
  pseudo: string;
  age: number;
  city: string;
  gender: "HOMME" | "FEMME" | "AUTRE";
  bio: string | null;
  avatarConfig: unknown;
  votes: number;
}

export interface WeeklyProfileWinnerDTO extends WeeklyProfileCandidateDTO {
  weekKey: string;
}

export interface WeeklyProfileDTO {
  weekKey: string;
  candidates: WeeklyProfileCandidateDTO[];
  votedCandidateId: string | null;
  winners: {
    male: WeeklyProfileWinnerDTO | null;
    female: WeeklyProfileWinnerDTO | null;
  };
}

export async function getWeeklyProfile(): Promise<WeeklyProfileDTO> {
  const res = (await apiFetch("/weekly-profile")) as { data: WeeklyProfileDTO };
  return res.data;
}

export async function voteWeeklyProfile(candidateId: string): Promise<WeeklyProfileDTO> {
  const res = (await apiFetch("/weekly-profile/vote", {
    method: "POST",
    body: JSON.stringify({ candidateId }),
  })) as { data: WeeklyProfileDTO };
  return res.data;
}

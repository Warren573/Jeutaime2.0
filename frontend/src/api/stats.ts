import { apiFetch } from "./client";

export interface CommunityStatsDTO {
  matchesToday: number;
  lettersSent: number;
  giftsSent: number;
  activeMembers: number;
}

export interface DailyStatsDTO {
  matchesToday: number;
  bottlesSentToday: number;
  smilesSentToday: number;
  grimacesSentToday: number;
  offeringsSentToday: number;
  duelsPlayedToday: number;
  lettersSentToday: number;
}

export interface RefugeStatsDTO {
  activeRefuges: number;
  awaitingReveal: number;
  completedRefuges: number;
}

export async function getCommunityStats(): Promise<CommunityStatsDTO> {
  const res = (await apiFetch("/stats/community")) as { data: CommunityStatsDTO };
  return res.data;
}

export async function getDailyStats(): Promise<DailyStatsDTO> {
  const res = (await apiFetch("/stats/daily")) as { data: DailyStatsDTO };
  return res.data;
}

export async function getRefugeStats(): Promise<RefugeStatsDTO> {
  const res = (await apiFetch("/stats/refuge")) as { data: RefugeStatsDTO };
  return res.data;
}

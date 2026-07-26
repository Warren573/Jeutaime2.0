import { apiFetch } from "./client";

export interface CommunityStatsDTO {
  matchesToday: number;
  lettersSent: number;
  giftsSent: number;
  activeMembers: number;
}

export async function getCommunityStats(): Promise<CommunityStatsDTO> {
  const res = (await apiFetch("/stats/community")) as { data: CommunityStatsDTO };
  return res.data;
}

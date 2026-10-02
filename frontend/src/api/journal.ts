import { apiFetch } from "./client";

export interface CommunityJournalPostDTO {
  id: string;
  title: string;
  body: string;
  publishedAt: string;
}

export interface JournalEditionDTO {
  date: string;
  communityPosts: CommunityJournalPostDTO[];
}

export async function getJournalEdition(): Promise<JournalEditionDTO> {
  const res = await apiFetch("/journal/edition") as { data: JournalEditionDTO };
  return res.data;
}

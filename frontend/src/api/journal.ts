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
  const res = await apiFetch("/journal/edition") as {
    data?: Partial<JournalEditionDTO> & {
      communityPosts?: CommunityJournalPostDTO[];
    };
  };

  return {
    date: typeof res?.data?.date === 'string' ? res.data.date : new Date().toISOString(),
    communityPosts: Array.isArray(res?.data?.communityPosts) ? res.data.communityPosts : [],
  };
}

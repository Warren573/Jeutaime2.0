import { z } from "zod";

export const CreateCommunityJournalPostSchema = z.object({
  title: z.string().trim().min(3).max(160),
  body: z.string().trim().min(3).max(5000),
}).strict();

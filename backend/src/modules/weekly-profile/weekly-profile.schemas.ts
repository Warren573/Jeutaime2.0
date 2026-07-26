import { z } from "zod";

// ============================================================
// POST /api/weekly-profile/vote
// ============================================================
export const VoteWeeklyProfileSchema = z
  .object({
    candidateId: z.string().min(1).max(64),
  })
  .strict();

export type VoteWeeklyProfileDto = z.infer<typeof VoteWeeklyProfileSchema>;

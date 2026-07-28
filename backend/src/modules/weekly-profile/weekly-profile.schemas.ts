import { z } from "zod";

// ============================================================
// POST /api/weekly-profile/vote
// Le client ne renvoie que l'identifiant du duel émis par le serveur et le
// profil choisi — jamais les candidats eux-mêmes (relus depuis la table
// WeeklyProfileDuel, jamais depuis ce payload).
// ============================================================
export const VoteWeeklyProfileSchema = z
  .object({
    duelId: z.string().min(1).max(64),
    chosenId: z.string().min(1).max(64),
  })
  .strict();

export type VoteWeeklyProfileDto = z.infer<typeof VoteWeeklyProfileSchema>;

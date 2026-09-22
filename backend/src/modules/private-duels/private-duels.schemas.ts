import { z } from "zod";

export const CreatePrivateDuelSchema = z.object({
  targetUserId: z.string().min(1, "Adversaire requis"),
  commonUserId: z.string().min(1, "Correspondant commun requis"),
});

export const SubmitPrivateDuelChoiceSchema = z.object({
  choice: z.enum(["ROCK", "PAPER", "SCISSORS"]),
});

export const PrivateDuelIdParamsSchema = z.object({
  id: z.string().min(1, "Duel invalide"),
});

export type CreatePrivateDuelDto = z.infer<typeof CreatePrivateDuelSchema>;
export type SubmitPrivateDuelChoiceDto = z.infer<typeof SubmitPrivateDuelChoiceSchema>;

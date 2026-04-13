import { z } from "zod";

export const CreateMatchSchema = z.object({
  targetUserId: z.string().min(1, "targetUserId requis"),
});

export const GhostRelanceSchema = z.object({
  message: z
    .string()
    .max(500, "Message de relance : 500 caractères max")
    .optional(),
});

export const MatchIdParamSchema = z.object({
  id: z.string().min(1, "Match ID requis"),
});

export type CreateMatchDto = z.infer<typeof CreateMatchSchema>;
export type GhostRelanceDto = z.infer<typeof GhostRelanceSchema>;

import { z } from "zod";

export const SendReactionSchema = z.object({
  toId: z.string().min(1, "toId requis"),
  type: z.enum(["SMILE", "GRIMACE"], {
    errorMap: () => ({ message: "type doit être SMILE ou GRIMACE" }),
  }),
});

export type SendReactionDto = z.infer<typeof SendReactionSchema>;

import { z } from "zod";
import { TOTAL_CARDS } from "../../policies/cardGame";

export const RevealCardSchema = z.object({
  cardIndex: z
    .number()
    .int()
    .min(0)
    .max(TOTAL_CARDS - 1),
});

export type RevealCardDto = z.infer<typeof RevealCardSchema>;

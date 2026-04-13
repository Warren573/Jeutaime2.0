import { z } from "zod";
import { LETTER_MAX_LENGTH } from "../../config/constants";

export const SendLetterSchema = z.object({
  content: z
    .string()
    .min(1, "La lettre ne peut pas être vide")
    .max(
      LETTER_MAX_LENGTH,
      `La lettre ne peut pas dépasser ${LETTER_MAX_LENGTH} caractères`,
    ),
});

export const ListLettersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
});

export const LetterIdParamSchema = z.object({
  id: z.string().min(1, "Letter ID requis"),
});

export type SendLetterDto = z.infer<typeof SendLetterSchema>;
export type ListLettersQuery = z.infer<typeof ListLettersQuerySchema>;

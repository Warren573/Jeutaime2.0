import { z } from "zod";
import { LETTER_MAX_WORDS } from "../../config/constants";

export const SendLetterSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "La lettre ne peut pas être vide")
    .refine(
      (value) => value.split(/\s+/u).length <= LETTER_MAX_WORDS,
      `La lettre ne peut pas dépasser ${LETTER_MAX_WORDS} mots`,
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

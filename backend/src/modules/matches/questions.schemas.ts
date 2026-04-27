import { z } from "zod";

export const SubmitAnswersSchema = z.object({
  answers: z
    .array(
      z.object({
        profileQuestionId: z.string().min(1, "profileQuestionId requis"),
        answer: z.string().min(1, "Réponse requise").max(200),
      }),
    )
    .length(3, "Tu dois répondre aux 3 questions"),
});

export type SubmitAnswersDto = z.infer<typeof SubmitAnswersSchema>;

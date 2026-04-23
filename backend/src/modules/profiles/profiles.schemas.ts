import { z } from "zod";
import { QUESTION_IDS } from "../../config/questions";

const GenderEnum = z.enum(["HOMME", "FEMME", "AUTRE"]);
const LookingForEnum = z.enum(["AMITIE", "RELATION", "FLIRT", "DISCUSSION", "SERIEUX"]);

export const UpdateProfileSchema = z.object({
  pseudo: z
    .string()
    .trim()
    .min(3, "Pseudo : 3 caractères minimum")
    .max(30, "Pseudo : 30 caractères maximum")
    .regex(/^[a-zA-Z0-9_.-]+$/, "Pseudo invalide")
    .optional(),
  birthDate: z.coerce.date().optional(),
  bio: z.string().max(500, "Bio : 500 caractères max").optional(),
  city: z.string().min(1).max(100).optional(),
  postalCode: z.string().max(10).optional(),
  job: z.string().max(100).optional(),
  physicalDesc: z
    .enum(["filiforme", "ras_motte", "grande_gigue", "costaud", "mignon", "mysterieux", "athletique", "doux"])
    .optional(),
  interests: z.array(z.string().max(50)).max(20).optional(),
  lookingFor: z.array(LookingForEnum).optional(),
  interestedIn: z.array(GenderEnum).optional(),
  hasChildren: z.boolean().optional(),
  wantsChildren: z.boolean().optional(),
  avatarConfig: z.record(z.unknown()).optional(),
  height: z.number().int().min(100).max(250).optional(),
  vibe: z.string().max(80).optional(),
  quote: z.string().max(150).optional(),
  identityTags: z.array(z.string().max(30)).max(5).optional(),
  qualities: z.array(z.string().max(50)).max(5).optional(),
  defaults: z.array(z.string().max(50)).max(5).optional(),
  idealDay: z.array(z.string().max(100)).max(5).optional(),
  skills: z
    .array(
      z.object({
        label:  z.string().max(50),
        detail: z.string().max(100),
        score:  z.number().int().min(0).max(100),
        emoji:  z.string().max(10),
      }),
    )
    .max(6)
    .optional(),
});

export const UpdateQuestionsSchema = z.object({
  questions: z
    .array(
      z.object({
        questionId: z.string().refine((id) => QUESTION_IDS.includes(id), {
          message: "Question ID invalide",
        }),
        answer: z.string().min(1, "Réponse requise").max(500, "Réponse : 500 caractères max"),
      }),
    )
    .length(3, "Tu dois répondre exactement à 3 questions"),
});

export const DiscoveryQuerySchema = z.object({
  gender: GenderEnum.optional(),
  city: z.string().optional(),
  lookingFor: LookingForEnum.optional(),
  minAge: z.coerce.number().int().min(18).max(99).optional(),
  maxAge: z.coerce.number().int().min(18).max(99).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;
export type UpdateQuestionsDto = z.infer<typeof UpdateQuestionsSchema>;
export type DiscoveryQuery = z.infer<typeof DiscoveryQuerySchema>;

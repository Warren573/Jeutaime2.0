import { z } from "zod";
import { RefugeAnimalType, RefugeAnimalCategory, RefugeAnimalSexe, RefugeAcceptedSexe, RefugeAction } from "@prisma/client";

// ============================================================
// Enums Zod (synchronisés avec Prisma)
// ============================================================

const RefugeAnimalTypeEnum = z.enum(Object.values(RefugeAnimalType) as [string, ...string[]]);
const RefugeAnimalCategoryEnum = z.enum(Object.values(RefugeAnimalCategory) as [string, ...string[]]);
const RefugeAnimalSexeEnum = z.enum(Object.values(RefugeAnimalSexe) as [string, ...string[]]);
const RefugeAcceptedSexeEnum = z.enum(Object.values(RefugeAcceptedSexe) as [string, ...string[]]);
const RefugeActionEnum = z.enum(Object.values(RefugeAction) as [string, ...string[]]);

// ============================================================
// Schemas de requête
// ============================================================

export const ProposeRefugeSchema = z.object({
  animalType: RefugeAnimalTypeEnum,
  acceptedSexe: RefugeAcceptedSexeEnum,
});

export const AdoptRefugeSchema = z.object({
  refugeSessionId: z.string().min(1, "refugeSessionId requis"),
});

export const RefugeSessionIdParamSchema = z.object({
  id: z.string().min(1, "ID du refuge requis"),
});

export const DailyChoiceSchema = z.object({
  sessionId: z.string().min(1, "sessionId requis"),
  dayNumber: z.number().int().min(1).max(7, "dayNumber doit être entre 1 et 7"),
  action1: RefugeActionEnum,
  action2: RefugeActionEnum,
});

export const GuessSchema = z.object({
  sessionId: z.string().min(1, "sessionId requis"),
  dayNumber: z.number().int().min(1).max(7, "dayNumber doit être entre 1 et 7"),
  guessedAction1: RefugeActionEnum,
  guessedAction2: RefugeActionEnum,
});

// ============================================================
// Types extraits
// ============================================================

export type ProposeRefugeDto = z.infer<typeof ProposeRefugeSchema>;
export type AdoptRefugeDto = z.infer<typeof AdoptRefugeSchema>;
export type DailyChoiceDto = z.infer<typeof DailyChoiceSchema>;
export type GuessDto = z.infer<typeof GuessSchema>;

import { z } from "zod";
import { RefugeAnimalType, RefugeAcceptedSexe, RefugeAction, RefugeBackground } from "@prisma/client";

// ============================================================
// Enums Zod (synchronisés avec Prisma)
// ============================================================

const RefugeAnimalTypeEnum = z.nativeEnum(RefugeAnimalType);
const RefugeAcceptedSexeEnum = z.nativeEnum(RefugeAcceptedSexe);
const RefugeActionEnum = z.nativeEnum(RefugeAction);

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

export const GuessSchema = z.object({
  sessionId: z.string().min(1, "sessionId requis"),
  dayNumber: z.number().int().min(1).max(7, "dayNumber doit être entre 1 et 7"),
  guessedAction1: RefugeActionEnum,
  guessedAction2: RefugeActionEnum,
});

export const DailyChoiceSchema = z.object({
  sessionId: z.string().min(1, "sessionId requis"),
  dayNumber: z.number().int().min(1).max(7, "dayNumber doit être entre 1 et 7"),
  action1: RefugeActionEnum,
  action2: RefugeActionEnum,
});

export const RevealConsentSchema = z.object({
  decision: z.enum(["ACCEPT", "REFUSE"]),
});

// Le fond d'ambiance doit être une valeur EXACTE de l'enum Prisma RefugeBackground :
// toute valeur localisée ("forêt", "default"…) est rejetée en 400 avant Prisma.
export const UpdateBackgroundSchema = z.object({
  background: z.nativeEnum(RefugeBackground),
});

// ============================================================
// Types extraits
// ============================================================

export type ProposeRefugeDto = z.infer<typeof ProposeRefugeSchema>;
export type AdoptRefugeDto = z.infer<typeof AdoptRefugeSchema>;
export type GuessDto = z.infer<typeof GuessSchema>;
export type DailyChoiceDto = z.infer<typeof DailyChoiceSchema>;
export type RevealConsentDto = z.infer<typeof RevealConsentSchema>;
export type UpdateBackgroundDto = z.infer<typeof UpdateBackgroundSchema>;

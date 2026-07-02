import { z } from "zod";
import { RefugeAnimalType, RefugeAnimalCategory, RefugeAnimalSexe, RefugeAcceptedSexe } from "@prisma/client";

// ============================================================
// Enums Zod (synchronisés avec Prisma)
// ============================================================

const RefugeAnimalTypeEnum = z.enum(Object.values(RefugeAnimalType) as [string, ...string[]]);
const RefugeAnimalCategoryEnum = z.enum(Object.values(RefugeAnimalCategory) as [string, ...string[]]);
const RefugeAnimalSexeEnum = z.enum(Object.values(RefugeAnimalSexe) as [string, ...string[]]);
const RefugeAcceptedSexeEnum = z.enum(Object.values(RefugeAcceptedSexe) as [string, ...string[]]);

// ============================================================
// Schemas de requête
// ============================================================

export const ProposeRefugeSchema = z.object({
  animalType: RefugeAnimalTypeEnum,
  animalCategory: RefugeAnimalCategoryEnum,
  animalSexe: RefugeAnimalSexeEnum,
  acceptedSexe: RefugeAcceptedSexeEnum,
});

export const AdoptRefugeSchema = z.object({
  refugeSessionId: z.string().min(1, "refugeSessionId requis"),
});

export const RefugeSessionIdParamSchema = z.object({
  id: z.string().min(1, "ID du refuge requis"),
});

// ============================================================
// Types extraits
// ============================================================

export type ProposeRefugeDto = z.infer<typeof ProposeRefugeSchema>;
export type AdoptRefugeDto = z.infer<typeof AdoptRefugeSchema>;

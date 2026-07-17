import { describe, it, expect } from "vitest";
import {
  UpdateBackgroundSchema,
  ProposeRefugeSchema,
  DailyChoiceSchema,
} from "../../src/modules/refuge/refuge.schemas";

// ============================================================
// UpdateBackgroundSchema — la route PATCH /session/:id/background
// n'accepte QUE les valeurs de l'enum Prisma RefugeBackground.
// ============================================================

describe("UpdateBackgroundSchema", () => {
  const VALID_BACKGROUNDS = ["FORET", "PLAGE", "NEIGE", "AUTOMNE", "MONTAGNE", "NUIT_ETOILEE"];

  it.each(VALID_BACKGROUNDS)("accepts the enum value %s", (background) => {
    const result = UpdateBackgroundSchema.safeParse({ background });
    expect(result.success).toBe(true);
  });

  it("rejects the localized value 'forêt' (frontend must send enum values)", () => {
    expect(UpdateBackgroundSchema.safeParse({ background: "forêt" }).success).toBe(false);
  });

  it("rejects the localized value 'nuit_étoilée'", () => {
    expect(UpdateBackgroundSchema.safeParse({ background: "nuit_étoilée" }).success).toBe(false);
  });

  it("rejects the legacy pseudo-value 'default'", () => {
    expect(UpdateBackgroundSchema.safeParse({ background: "default" }).success).toBe(false);
  });

  it("rejects an arbitrary value", () => {
    expect(UpdateBackgroundSchema.safeParse({ background: "WHATEVER" }).success).toBe(false);
  });

  it("rejects a missing background", () => {
    expect(UpdateBackgroundSchema.safeParse({}).success).toBe(false);
  });
});

// ============================================================
// Enums natifs — les schémas refusent les variantes localisées
// ============================================================

describe("Refuge schemas use exact Prisma enum values", () => {
  it("ProposeRefugeSchema accepts CHAT and rejects 'Chat'", () => {
    expect(
      ProposeRefugeSchema.safeParse({ animalType: "CHAT", acceptedSexe: "HOMME_FEMME" }).success
    ).toBe(true);
    expect(
      ProposeRefugeSchema.safeParse({ animalType: "Chat", acceptedSexe: "HOMME_FEMME" }).success
    ).toBe(false);
  });

  it("DailyChoiceSchema accepts NOURRIR and rejects 'Nourrir'", () => {
    const base = { sessionId: "s1", dayNumber: 1, action2: "JOUER" };
    expect(DailyChoiceSchema.safeParse({ ...base, action1: "NOURRIR" }).success).toBe(true);
    expect(DailyChoiceSchema.safeParse({ ...base, action1: "Nourrir" }).success).toBe(false);
  });
});

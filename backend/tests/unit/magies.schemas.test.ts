/**
 * Tests unitaires des schémas Zod du module Magies.
 */
import { describe, it, expect } from "vitest";
import {
  CastMagieSchema,
  BreakMagieSchema,
  MagieIdParamsSchema,
  UserIdParamsSchema,
} from "../../src/modules/magies/magies.schemas";

// ============================================================
// CastMagieSchema
// ============================================================
describe("CastMagieSchema", () => {
  const base = {
    magieId: "mag_grenouille",
    toUserId: "user-123",
  };

  it("minimum valide → OK", () => {
    const res = CastMagieSchema.parse(base);
    expect(res.magieId).toBe("mag_grenouille");
    expect(res.toUserId).toBe("user-123");
    expect(res.salonId).toBeUndefined();
  });

  it("avec salonId → OK", () => {
    const res = CastMagieSchema.parse({ ...base, salonId: "salon-42" });
    expect(res.salonId).toBe("salon-42");
  });

  it("magieId manquant → rejeté", () => {
    expect(() => CastMagieSchema.parse({ toUserId: "u1" })).toThrow();
  });

  it("toUserId manquant → rejeté", () => {
    expect(() => CastMagieSchema.parse({ magieId: "mag_x" })).toThrow();
  });

  it("magieId vide → rejeté", () => {
    expect(() =>
      CastMagieSchema.parse({ magieId: "", toUserId: "u1" }),
    ).toThrow();
  });

  it("toUserId vide → rejeté", () => {
    expect(() =>
      CastMagieSchema.parse({ magieId: "m", toUserId: "" }),
    ).toThrow();
  });

  it("champ inconnu → rejeté (strict)", () => {
    expect(() =>
      CastMagieSchema.parse({ ...base, duration: 60 }),
    ).toThrow();
  });
});

// ============================================================
// BreakMagieSchema
// ============================================================
describe("BreakMagieSchema", () => {
  it("antiSpellId valide → OK", () => {
    const res = BreakMagieSchema.parse({ antiSpellId: "mag_bisou" });
    expect(res.antiSpellId).toBe("mag_bisou");
  });

  it("antiSpellId manquant → rejeté", () => {
    expect(() => BreakMagieSchema.parse({})).toThrow();
  });

  it("antiSpellId vide → rejeté", () => {
    expect(() => BreakMagieSchema.parse({ antiSpellId: "" })).toThrow();
  });

  it("champ inconnu → rejeté (strict)", () => {
    expect(() =>
      BreakMagieSchema.parse({
        antiSpellId: "mag_eau",
        multiplier: 2,
      }),
    ).toThrow();
  });
});

// ============================================================
// Params
// ============================================================
describe("MagieIdParamsSchema", () => {
  it("id non vide → OK", () => {
    expect(MagieIdParamsSchema.parse({ id: "cast_1" })).toEqual({
      id: "cast_1",
    });
  });

  it("id vide → rejeté", () => {
    expect(() => MagieIdParamsSchema.parse({ id: "" })).toThrow();
  });
});

describe("UserIdParamsSchema", () => {
  it("userId non vide → OK", () => {
    expect(UserIdParamsSchema.parse({ userId: "u1" })).toEqual({
      userId: "u1",
    });
  });

  it("userId vide → rejeté", () => {
    expect(() => UserIdParamsSchema.parse({ userId: "" })).toThrow();
  });
});

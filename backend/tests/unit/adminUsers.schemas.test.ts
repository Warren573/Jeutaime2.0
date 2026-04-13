/**
 * Tests unitaires des schémas Zod admin/users.
 */
import { describe, it, expect } from "vitest";
import {
  BanUserSchema,
  UnbanUserSchema,
  WarnUserSchema,
  UserIdParamsSchema,
} from "../../src/modules/admin/users/adminUsers.schemas";

// ============================================================
// BanUserSchema
// ============================================================
describe("BanUserSchema", () => {
  it("reason valide → OK", () => {
    const res = BanUserSchema.parse({ reason: "Harcèlement répété" });
    expect(res.reason).toBe("Harcèlement répété");
  });

  it("reason trop courte → rejeté", () => {
    expect(() => BanUserSchema.parse({ reason: "x" })).toThrow();
  });

  it("reason manquante → rejeté", () => {
    expect(() => BanUserSchema.parse({})).toThrow();
  });

  it("reason > 500 → rejeté", () => {
    expect(() =>
      BanUserSchema.parse({ reason: "x".repeat(501) }),
    ).toThrow();
  });

  it("champ inconnu → rejeté (strict)", () => {
    expect(() =>
      BanUserSchema.parse({ reason: "abc", durationDays: 7 }),
    ).toThrow();
  });
});

// ============================================================
// UnbanUserSchema
// ============================================================
describe("UnbanUserSchema", () => {
  it("corps vide → OK", () => {
    expect(UnbanUserSchema.parse({})).toEqual({});
  });

  it("champ envoyé par erreur → rejeté (strict)", () => {
    expect(() => UnbanUserSchema.parse({ reason: "x" })).toThrow();
  });
});

// ============================================================
// WarnUserSchema
// ============================================================
describe("WarnUserSchema", () => {
  it("message valide → OK", () => {
    const res = WarnUserSchema.parse({
      message: "Merci de modérer ton vocabulaire",
    });
    expect(res.message).toMatch(/modérer/);
  });

  it("message trop court → rejeté", () => {
    expect(() => WarnUserSchema.parse({ message: "ok" })).toThrow();
  });

  it("message manquant → rejeté", () => {
    expect(() => WarnUserSchema.parse({})).toThrow();
  });

  it("message > 500 → rejeté", () => {
    expect(() =>
      WarnUserSchema.parse({ message: "x".repeat(501) }),
    ).toThrow();
  });

  it("champ inconnu → rejeté (strict)", () => {
    expect(() =>
      WarnUserSchema.parse({ message: "ok ok ok", level: "high" }),
    ).toThrow();
  });
});

// ============================================================
// UserIdParamsSchema
// ============================================================
describe("UserIdParamsSchema", () => {
  it("id valide → OK", () => {
    expect(UserIdParamsSchema.parse({ id: "u_1" })).toEqual({ id: "u_1" });
  });

  it("id vide → rejeté", () => {
    expect(() => UserIdParamsSchema.parse({ id: "" })).toThrow();
  });
});

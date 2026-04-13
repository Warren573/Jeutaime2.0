/**
 * Tests unitaires des schémas Zod de l'admin salons.
 * Pure : les schémas Zod sont des validateurs sans dépendance runtime.
 */
import { describe, it, expect } from "vitest";
import { SalonKind } from "@prisma/client";
import {
  CreateSalonSchema,
  UpdateSalonSchema,
  ActivateSalonSchema,
} from "../../src/modules/admin/salons/adminSalons.schemas";

// ============================================================
// CreateSalonSchema
// ============================================================

describe("CreateSalonSchema", () => {
  const base = {
    kind: SalonKind.PISCINE,
    name: "La Piscine",
  };

  it("minimum valide : kind + name → defaults appliqués", () => {
    const res = CreateSalonSchema.parse(base);
    expect(res.backgroundType).toBe("gradient");
    expect(res.isActive).toBe(true);
    expect(res.order).toBe(0);
  });

  it("avec couleurs hex valides", () => {
    const res = CreateSalonSchema.parse({
      ...base,
      primaryColor: "#FF6B9D",
      secondaryColor: "#fff",
      textColor: "#00000080",
    });
    expect(res.primaryColor).toBe("#FF6B9D");
  });

  it("couleur hex invalide → rejetée", () => {
    expect(() =>
      CreateSalonSchema.parse({ ...base, primaryColor: "red" }),
    ).toThrow();
  });

  it("kind manquant → rejeté", () => {
    expect(() => CreateSalonSchema.parse({ name: "x" })).toThrow();
  });

  it("kind invalide → rejeté", () => {
    expect(() =>
      CreateSalonSchema.parse({ kind: "PARADISE", name: "x" }),
    ).toThrow();
  });

  it("name vide → rejeté", () => {
    expect(() =>
      CreateSalonSchema.parse({ kind: SalonKind.PISCINE, name: "" }),
    ).toThrow();
  });

  it("backgroundType invalide → rejeté", () => {
    expect(() =>
      CreateSalonSchema.parse({ ...base, backgroundType: "video" }),
    ).toThrow();
  });

  it("order négatif → rejeté", () => {
    expect(() =>
      CreateSalonSchema.parse({ ...base, order: -1 }),
    ).toThrow();
  });

  it("champ inconnu → rejeté (strict)", () => {
    expect(() =>
      CreateSalonSchema.parse({ ...base, unknownField: "x" }),
    ).toThrow();
  });
});

// ============================================================
// UpdateSalonSchema
// ============================================================

describe("UpdateSalonSchema", () => {
  it("update d'un seul champ accepté", () => {
    const res = UpdateSalonSchema.parse({ name: "Nouveau nom" });
    expect(res.name).toBe("Nouveau nom");
  });

  it("update vide → rejeté", () => {
    expect(() => UpdateSalonSchema.parse({})).toThrow();
  });

  it("passage d'un champ à null (remise à null explicite)", () => {
    const res = UpdateSalonSchema.parse({ description: null });
    expect(res.description).toBe(null);
  });

  it("backgroundConfig avec options valides", () => {
    const res = UpdateSalonSchema.parse({
      backgroundConfig: {
        start: "#FF0000",
        end: "#00FF00",
        angle: 45,
      },
    });
    expect(res.backgroundConfig).toEqual({
      start: "#FF0000",
      end: "#00FF00",
      angle: 45,
    });
  });

  it("backgroundConfig.angle > 360 → rejeté", () => {
    expect(() =>
      UpdateSalonSchema.parse({
        backgroundConfig: { angle: 400 },
      }),
    ).toThrow();
  });

  it("champ inconnu → rejeté (strict)", () => {
    expect(() =>
      UpdateSalonSchema.parse({ fooBar: "x" }),
    ).toThrow();
  });
});

// ============================================================
// ActivateSalonSchema
// ============================================================

describe("ActivateSalonSchema", () => {
  it("isActive=true → OK", () => {
    expect(ActivateSalonSchema.parse({ isActive: true })).toEqual({
      isActive: true,
    });
  });

  it("isActive=false → OK", () => {
    expect(ActivateSalonSchema.parse({ isActive: false })).toEqual({
      isActive: false,
    });
  });

  it("isActive manquant → rejeté", () => {
    expect(() => ActivateSalonSchema.parse({})).toThrow();
  });

  it("isActive non boolean → rejeté", () => {
    expect(() => ActivateSalonSchema.parse({ isActive: "true" })).toThrow();
  });

  it("champ inconnu → rejeté (strict)", () => {
    expect(() =>
      ActivateSalonSchema.parse({ isActive: true, extra: 1 }),
    ).toThrow();
  });
});

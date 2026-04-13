/**
 * Tests unitaires des policies pures d'Offerings.
 * Aucune dépendance Prisma.
 */
import { describe, it, expect } from "vitest";
import { SalonKind } from "@prisma/client";
import {
  assertNotSelfOffering,
  assertOfferingUsable,
  assertSalonOnlyRespected,
  computeOfferingExpiry,
  isOfferingActive,
} from "../../src/policies/offerings";
import { BadRequestError, NotFoundError } from "../../src/core/errors";

const now = new Date("2026-04-11T12:00:00.000Z");
const inPast = new Date("2026-04-11T11:59:00.000Z");
const inFuture = new Date("2026-04-11T12:01:00.000Z");

// ============================================================
// assertOfferingUsable
// ============================================================
describe("assertOfferingUsable", () => {
  it("enabled → OK", () => {
    expect(() => assertOfferingUsable({ enabled: true })).not.toThrow();
  });

  it("disabled → rejeté (NotFound)", () => {
    expect(() => assertOfferingUsable({ enabled: false })).toThrow(
      NotFoundError,
    );
  });
});

// ============================================================
// assertSalonOnlyRespected
// ============================================================
describe("assertSalonOnlyRespected", () => {
  it("salonOnly null + pas de salon → OK", () => {
    expect(() => assertSalonOnlyRespected(null, null)).not.toThrow();
  });

  it("salonOnly null + salon quelconque → OK", () => {
    expect(() =>
      assertSalonOnlyRespected(null, {
        isActive: true,
        kind: SalonKind.PISCINE,
      }),
    ).not.toThrow();
  });

  it("salonOnly METAL + salon METAL → OK", () => {
    expect(() =>
      assertSalonOnlyRespected(SalonKind.METAL, {
        isActive: true,
        kind: SalonKind.METAL,
      }),
    ).not.toThrow();
  });

  it("salonOnly METAL + pas de salon → rejeté", () => {
    expect(() =>
      assertSalonOnlyRespected(SalonKind.METAL, null),
    ).toThrow(BadRequestError);
  });

  it("salonOnly METAL + salon PISCINE → rejeté", () => {
    expect(() =>
      assertSalonOnlyRespected(SalonKind.METAL, {
        isActive: true,
        kind: SalonKind.PISCINE,
      }),
    ).toThrow(BadRequestError);
  });
});

// ============================================================
// computeOfferingExpiry
// ============================================================
describe("computeOfferingExpiry", () => {
  it("durationMs null → expiresAt null (cadeau permanent)", () => {
    expect(computeOfferingExpiry(now, null)).toBeNull();
  });

  it("durationMs positif → ajoute correctement", () => {
    const start = new Date("2026-04-11T12:00:00.000Z");
    const res = computeOfferingExpiry(start, 86_400_000); // 24h
    expect(res?.toISOString()).toBe("2026-04-12T12:00:00.000Z");
  });

  it("durationMs 0 → rejeté", () => {
    expect(() => computeOfferingExpiry(now, 0)).toThrow(BadRequestError);
  });

  it("durationMs négatif → rejeté", () => {
    expect(() => computeOfferingExpiry(now, -5)).toThrow(BadRequestError);
  });

  it("durationMs non entier → rejeté", () => {
    expect(() => computeOfferingExpiry(now, 1.5)).toThrow(BadRequestError);
  });
});

// ============================================================
// isOfferingActive
// ============================================================
describe("isOfferingActive", () => {
  it("expiresAt null → actif (cadeau permanent)", () => {
    expect(isOfferingActive({ expiresAt: null }, now)).toBe(true);
  });

  it("expiresAt futur → actif", () => {
    expect(isOfferingActive({ expiresAt: inFuture }, now)).toBe(true);
  });

  it("expiresAt passé → inactif", () => {
    expect(isOfferingActive({ expiresAt: inPast }, now)).toBe(false);
  });

  it("expiresAt === now → inactif (borne stricte)", () => {
    expect(isOfferingActive({ expiresAt: now }, now)).toBe(false);
  });
});

// ============================================================
// assertNotSelfOffering
// ============================================================
describe("assertNotSelfOffering", () => {
  it("ids différents → OK", () => {
    expect(() => assertNotSelfOffering("u1", "u2")).not.toThrow();
  });

  it("ids identiques → rejeté", () => {
    expect(() => assertNotSelfOffering("u1", "u1")).toThrow(
      BadRequestError,
    );
  });
});

/**
 * Tests unitaires de la policy Premium.
 * Pure, aucune dépendance Prisma.
 */
import { describe, it, expect } from "vitest";
import { PremiumTier } from "@prisma/client";
import {
  isPremiumActive,
  computeNewPremiumUntil,
} from "../../src/policies/premium";

// ============================================================
// isPremiumActive
// ============================================================

describe("isPremiumActive", () => {
  const now = new Date("2026-04-10T12:00:00Z");

  it("FREE → inactif", () => {
    expect(
      isPremiumActive(
        { premiumTier: PremiumTier.FREE, premiumUntil: null },
        now,
      ),
    ).toBe(false);
  });

  it("FREE avec date future → inactif (tier prime)", () => {
    expect(
      isPremiumActive(
        {
          premiumTier: PremiumTier.FREE,
          premiumUntil: new Date("2030-01-01T00:00:00Z"),
        },
        now,
      ),
    ).toBe(false);
  });

  it("PREMIUM + premiumUntil null → inactif (interprétation stricte)", () => {
    expect(
      isPremiumActive(
        { premiumTier: PremiumTier.PREMIUM, premiumUntil: null },
        now,
      ),
    ).toBe(false);
  });

  it("PREMIUM + premiumUntil dans le futur → actif", () => {
    expect(
      isPremiumActive(
        {
          premiumTier: PremiumTier.PREMIUM,
          premiumUntil: new Date("2026-05-10T12:00:00Z"),
        },
        now,
      ),
    ).toBe(true);
  });

  it("PREMIUM + premiumUntil exactement = now → inactif (> strict)", () => {
    expect(
      isPremiumActive(
        { premiumTier: PremiumTier.PREMIUM, premiumUntil: now },
        now,
      ),
    ).toBe(false);
  });

  it("PREMIUM + premiumUntil dans le passé → inactif (expiré)", () => {
    expect(
      isPremiumActive(
        {
          premiumTier: PremiumTier.PREMIUM,
          premiumUntil: new Date("2026-03-01T00:00:00Z"),
        },
        now,
      ),
    ).toBe(false);
  });
});

// ============================================================
// computeNewPremiumUntil
// ============================================================

describe("computeNewPremiumUntil", () => {
  const now = new Date("2026-04-10T12:00:00Z");

  it("current null → now + durationDays", () => {
    const result = computeNewPremiumUntil(null, 30, now);
    expect(result.toISOString()).toBe("2026-05-10T12:00:00.000Z");
  });

  it("current passé → now + durationDays (reset)", () => {
    const past = new Date("2026-01-01T00:00:00Z");
    const result = computeNewPremiumUntil(past, 30, now);
    expect(result.toISOString()).toBe("2026-05-10T12:00:00.000Z");
  });

  it("current futur → extension (cumul à partir de current)", () => {
    const future = new Date("2026-05-10T12:00:00Z");
    const result = computeNewPremiumUntil(future, 30, now);
    expect(result.toISOString()).toBe("2026-06-09T12:00:00.000Z");
  });

  it("ne mute pas l'argument current", () => {
    const future = new Date("2026-05-10T12:00:00Z");
    const snapshot = future.toISOString();
    computeNewPremiumUntil(future, 90, now);
    expect(future.toISOString()).toBe(snapshot);
  });

  it("durée 365 depuis null", () => {
    const result = computeNewPremiumUntil(null, 365, now);
    expect(result.toISOString()).toBe("2027-04-10T12:00:00.000Z");
  });
});

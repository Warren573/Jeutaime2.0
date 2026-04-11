/**
 * Tests unitaires des helpers purs de la couche jobs.
 * Aucune dépendance Prisma.
 */
import { describe, it, expect } from "vitest";
import { PremiumTier } from "@prisma/client";
import {
  computeRefreshTokenPurgeCutoff,
  isPremiumToDemote,
} from "../../src/policies/jobs";
import { BadRequestError } from "../../src/core/errors";

const now = new Date("2026-04-11T12:00:00.000Z");
const inPast = new Date("2026-04-11T11:59:00.000Z");
const inFuture = new Date("2026-04-11T12:01:00.000Z");

// ============================================================
// computeRefreshTokenPurgeCutoff
// ============================================================
describe("computeRefreshTokenPurgeCutoff", () => {
  it("graceMs === 0 → cutoff === now", () => {
    const cutoff = computeRefreshTokenPurgeCutoff(now, 0);
    expect(cutoff.toISOString()).toBe(now.toISOString());
  });

  it("graceMs positif → cutoff = now - graceMs", () => {
    const cutoff = computeRefreshTokenPurgeCutoff(now, 60_000); // -1 min
    expect(cutoff.toISOString()).toBe("2026-04-11T11:59:00.000Z");
  });

  it("graceMs 1h → cutoff décalé d'1h dans le passé", () => {
    const cutoff = computeRefreshTokenPurgeCutoff(now, 3_600_000);
    expect(cutoff.toISOString()).toBe("2026-04-11T11:00:00.000Z");
  });

  it("graceMs négatif → rejeté", () => {
    expect(() => computeRefreshTokenPurgeCutoff(now, -1)).toThrow(
      BadRequestError,
    );
  });

  it("graceMs non entier → rejeté", () => {
    expect(() => computeRefreshTokenPurgeCutoff(now, 1.5)).toThrow(
      BadRequestError,
    );
  });
});

// ============================================================
// isPremiumToDemote
// ============================================================
describe("isPremiumToDemote", () => {
  it("tier FREE → false (rien à faire)", () => {
    expect(
      isPremiumToDemote(
        { premiumTier: PremiumTier.FREE, premiumUntil: inPast },
        now,
      ),
    ).toBe(false);
  });

  it("tier PREMIUM + premiumUntil null → false (état exotique laissé tranquille)", () => {
    expect(
      isPremiumToDemote(
        { premiumTier: PremiumTier.PREMIUM, premiumUntil: null },
        now,
      ),
    ).toBe(false);
  });

  it("tier PREMIUM + premiumUntil futur → false (encore actif)", () => {
    expect(
      isPremiumToDemote(
        { premiumTier: PremiumTier.PREMIUM, premiumUntil: inFuture },
        now,
      ),
    ).toBe(false);
  });

  it("tier PREMIUM + premiumUntil passé → true", () => {
    expect(
      isPremiumToDemote(
        { premiumTier: PremiumTier.PREMIUM, premiumUntil: inPast },
        now,
      ),
    ).toBe(true);
  });

  it("tier PREMIUM + premiumUntil === now → true (borne inclusive)", () => {
    expect(
      isPremiumToDemote(
        { premiumTier: PremiumTier.PREMIUM, premiumUntil: now },
        now,
      ),
    ).toBe(true);
  });
});

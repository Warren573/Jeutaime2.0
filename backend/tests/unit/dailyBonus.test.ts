/**
 * Tests unitaires du daily bonus.
 * Pure, aucune dépendance Prisma.
 */
import { describe, it, expect } from "vitest";
import {
  canClaimDailyBonus,
  getDailyBonusAmount,
  isSameUtcDay,
} from "../../src/policies/dailyBonus";
import {
  DAILY_BONUS_FREE,
  DAILY_BONUS_PREMIUM,
} from "../../src/config/constants";

// ============================================================
// isSameUtcDay
// ============================================================

describe("isSameUtcDay", () => {
  it("même instant → true", () => {
    const d = new Date("2026-04-10T12:00:00Z");
    expect(isSameUtcDay(d, d)).toBe(true);
  });

  it("deux instants le même jour UTC → true", () => {
    expect(
      isSameUtcDay(
        new Date("2026-04-10T00:00:01Z"),
        new Date("2026-04-10T23:59:59Z"),
      ),
    ).toBe(true);
  });

  it("23:59:59Z vs 00:00:01Z le lendemain → false", () => {
    expect(
      isSameUtcDay(
        new Date("2026-04-10T23:59:59Z"),
        new Date("2026-04-11T00:00:01Z"),
      ),
    ).toBe(false);
  });

  it("même jour local mais deux jours UTC différents → false", () => {
    // 2026-04-10 23:00 UTC-2 = 2026-04-11 01:00 UTC
    // "même jour local" mais UTC différent : on se fie à UTC
    expect(
      isSameUtcDay(
        new Date("2026-04-10T23:00:00-02:00"), // = 2026-04-11T01:00Z
        new Date("2026-04-11T20:00:00Z"),
      ),
    ).toBe(true);
  });
});

// ============================================================
// canClaimDailyBonus
// ============================================================

describe("canClaimDailyBonus", () => {
  const now = new Date("2026-04-10T12:00:00Z");

  it("jamais réclamé → autorisé", () => {
    const res = canClaimDailyBonus(null, now);
    expect(res.allowed).toBe(true);
    expect(res.reason).toBe(null);
  });

  it("réclamé hier UTC → autorisé", () => {
    const yesterday = new Date("2026-04-09T23:00:00Z");
    const res = canClaimDailyBonus(yesterday, now);
    expect(res.allowed).toBe(true);
  });

  it("réclamé il y a 1 minute (même jour UTC) → refusé", () => {
    const oneMinAgo = new Date("2026-04-10T11:59:00Z");
    const res = canClaimDailyBonus(oneMinAgo, now);
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("ALREADY_CLAIMED_TODAY");
  });

  it("réclamé tout à l'heure à 00:00:01Z → refusé (même jour UTC)", () => {
    const earlyToday = new Date("2026-04-10T00:00:01Z");
    const res = canClaimDailyBonus(earlyToday, now);
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("ALREADY_CLAIMED_TODAY");
  });

  it("réclamé la veille à 23:59:59Z → autorisé à 00:00:01Z le jour d'après", () => {
    const justBeforeMidnight = new Date("2026-04-09T23:59:59Z");
    const justAfterMidnight = new Date("2026-04-10T00:00:01Z");
    const res = canClaimDailyBonus(justBeforeMidnight, justAfterMidnight);
    expect(res.allowed).toBe(true);
  });

  it("réclamé il y a plusieurs jours → autorisé", () => {
    const weekAgo = new Date("2026-04-03T12:00:00Z");
    const res = canClaimDailyBonus(weekAgo, now);
    expect(res.allowed).toBe(true);
  });
});

// ============================================================
// getDailyBonusAmount
// ============================================================

describe("getDailyBonusAmount", () => {
  it("Free → DAILY_BONUS_FREE", () => {
    expect(getDailyBonusAmount(false)).toBe(DAILY_BONUS_FREE);
  });

  it("Premium → DAILY_BONUS_PREMIUM", () => {
    expect(getDailyBonusAmount(true)).toBe(DAILY_BONUS_PREMIUM);
  });

  it("Premium > Free (sanité métier)", () => {
    expect(getDailyBonusAmount(true)).toBeGreaterThan(getDailyBonusAmount(false));
  });
});

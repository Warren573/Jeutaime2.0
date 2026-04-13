/**
 * Tests unitaires des policies pures de Magies.
 * Aucune dépendance Prisma — on passe juste les types structuraux.
 */
import { describe, it, expect } from "vitest";
import {
  isMagieActive,
  computeMagieExpiry,
  assertCastableSpell,
  assertValidAntiSpell,
  assertCanBreakMagie,
  assertAntiSpellBreaksCondition,
  assertNotSelfCast,
} from "../../src/policies/magies";
import { BREAK_CONDITION_TO_ANTISPELL } from "../../src/modules/magies/magies.constants";
import { BadRequestError } from "../../src/core/errors";

const now = new Date("2026-04-11T12:00:00.000Z");
const inPast = new Date("2026-04-11T11:59:00.000Z");
const inFuture = new Date("2026-04-11T12:01:00.000Z");

// ============================================================
// isMagieActive
// ============================================================
describe("isMagieActive", () => {
  it("cast non cassé + expiresAt futur → active", () => {
    expect(
      isMagieActive({ brokenAt: null, expiresAt: inFuture }, now),
    ).toBe(true);
  });

  it("cast cassé → inactive", () => {
    expect(
      isMagieActive(
        { brokenAt: inPast, expiresAt: inFuture },
        now,
      ),
    ).toBe(false);
  });

  it("cast expiré → inactive", () => {
    expect(
      isMagieActive({ brokenAt: null, expiresAt: inPast }, now),
    ).toBe(false);
  });

  it("exactement à expiresAt === now → inactive (borne stricte)", () => {
    expect(
      isMagieActive({ brokenAt: null, expiresAt: now }, now),
    ).toBe(false);
  });
});

// ============================================================
// computeMagieExpiry
// ============================================================
describe("computeMagieExpiry", () => {
  it("durée positive → ajoute correctement", () => {
    const start = new Date("2026-04-11T12:00:00.000Z");
    const res = computeMagieExpiry(start, 120);
    expect(res.toISOString()).toBe("2026-04-11T12:02:00.000Z");
  });

  it("durée == 0 → rejeté (anti-sort, pas un cast)", () => {
    expect(() => computeMagieExpiry(now, 0)).toThrow(BadRequestError);
  });

  it("durée négative → rejeté", () => {
    expect(() => computeMagieExpiry(now, -5)).toThrow(BadRequestError);
  });

  it("durée non entière → rejeté", () => {
    expect(() => computeMagieExpiry(now, 1.5)).toThrow(BadRequestError);
  });
});

// ============================================================
// assertCastableSpell
// ============================================================
describe("assertCastableSpell", () => {
  it("enabled + durée > 0 → OK", () => {
    expect(() =>
      assertCastableSpell({ enabled: true, durationSec: 120 }),
    ).not.toThrow();
  });

  it("disabled → rejeté", () => {
    expect(() =>
      assertCastableSpell({ enabled: false, durationSec: 120 }),
    ).toThrow(BadRequestError);
  });

  it("durationSec === 0 → rejeté (anti-sort)", () => {
    expect(() =>
      assertCastableSpell({ enabled: true, durationSec: 0 }),
    ).toThrow(BadRequestError);
  });
});

// ============================================================
// assertValidAntiSpell
// ============================================================
describe("assertValidAntiSpell", () => {
  it("enabled + durée === 0 → OK", () => {
    expect(() =>
      assertValidAntiSpell({ enabled: true, durationSec: 0 }),
    ).not.toThrow();
  });

  it("disabled → rejeté", () => {
    expect(() =>
      assertValidAntiSpell({ enabled: false, durationSec: 0 }),
    ).toThrow(BadRequestError);
  });

  it("durationSec > 0 → rejeté (c'est un sort, pas un anti-sort)", () => {
    expect(() =>
      assertValidAntiSpell({ enabled: true, durationSec: 60 }),
    ).toThrow(BadRequestError);
  });
});

// ============================================================
// assertCanBreakMagie
// ============================================================
describe("assertCanBreakMagie", () => {
  it("actif → OK", () => {
    expect(() =>
      assertCanBreakMagie({ brokenAt: null, expiresAt: inFuture }, now),
    ).not.toThrow();
  });

  it("déjà cassé → rejeté", () => {
    expect(() =>
      assertCanBreakMagie(
        { brokenAt: inPast, expiresAt: inFuture },
        now,
      ),
    ).toThrow(BadRequestError);
  });

  it("déjà expiré → rejeté", () => {
    expect(() =>
      assertCanBreakMagie({ brokenAt: null, expiresAt: inPast }, now),
    ).toThrow(BadRequestError);
  });

  it("exactement à expiresAt → rejeté (borne stricte)", () => {
    expect(() =>
      assertCanBreakMagie({ brokenAt: null, expiresAt: now }, now),
    ).toThrow(BadRequestError);
  });
});

// ============================================================
// assertAntiSpellBreaksCondition
// ============================================================
describe("assertAntiSpellBreaksCondition", () => {
  it("mapping cohérent → OK", () => {
    expect(() =>
      assertAntiSpellBreaksCondition("kiss", "mag_bisou"),
    ).not.toThrow();
    expect(() =>
      assertAntiSpellBreaksCondition("water", "mag_eau"),
    ).not.toThrow();
    expect(() =>
      assertAntiSpellBreaksCondition("compliment", "mag_compliment"),
    ).not.toThrow();
  });

  it("mauvais anti-sort → rejeté", () => {
    expect(() =>
      assertAntiSpellBreaksCondition("kiss", "mag_eau"),
    ).toThrow(BadRequestError);
  });

  it("condition inconnue → rejeté", () => {
    expect(() =>
      assertAntiSpellBreaksCondition("nopes", "mag_bisou"),
    ).toThrow(BadRequestError);
  });

  it("breakConditionId null → rejeté (le sort ne casse pas)", () => {
    expect(() =>
      assertAntiSpellBreaksCondition(null, "mag_bisou"),
    ).toThrow(BadRequestError);
  });

  it("tout le mapping est exhaustivement valide", () => {
    for (const [cond, antiSpell] of Object.entries(BREAK_CONDITION_TO_ANTISPELL)) {
      expect(() =>
        assertAntiSpellBreaksCondition(cond, antiSpell),
      ).not.toThrow();
    }
  });
});

// ============================================================
// assertNotSelfCast
// ============================================================
describe("assertNotSelfCast", () => {
  it("ids différents → OK", () => {
    expect(() => assertNotSelfCast("u1", "u2")).not.toThrow();
  });

  it("ids identiques → rejeté", () => {
    expect(() => assertNotSelfCast("u1", "u1")).toThrow(BadRequestError);
  });
});

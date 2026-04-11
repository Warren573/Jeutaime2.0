/**
 * Tests unitaires des policies pures de Reports.
 * Aucune dépendance Prisma.
 */
import { describe, it, expect } from "vitest";
import {
  assertNotSelfReport,
  assertCanCreateNewReport,
  MAX_OPEN_REPORTS_PER_TARGET,
} from "../../src/policies/reports";
import { BadRequestError, ConflictError } from "../../src/core/errors";

// ============================================================
// assertNotSelfReport
// ============================================================
describe("assertNotSelfReport", () => {
  it("ids différents → OK", () => {
    expect(() => assertNotSelfReport("u1", "u2")).not.toThrow();
  });

  it("ids identiques → BadRequestError", () => {
    expect(() => assertNotSelfReport("u1", "u1")).toThrow(BadRequestError);
  });

  it("le message mentionne le self-report", () => {
    try {
      assertNotSelfReport("x", "x");
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestError);
      expect((e as Error).message).toMatch(/toi-même/i);
    }
  });
});

// ============================================================
// assertCanCreateNewReport
// ============================================================
describe("assertCanCreateNewReport", () => {
  it("0 report ouvert → OK", () => {
    expect(() => assertCanCreateNewReport(0)).not.toThrow();
  });

  it("1 report ouvert (= MAX) → ConflictError", () => {
    expect(() => assertCanCreateNewReport(1)).toThrow(ConflictError);
  });

  it("au-delà du max → ConflictError (sécurité)", () => {
    expect(() => assertCanCreateNewReport(5)).toThrow(ConflictError);
  });

  it("constante exposée = 1", () => {
    expect(MAX_OPEN_REPORTS_PER_TARGET).toBe(1);
  });
});

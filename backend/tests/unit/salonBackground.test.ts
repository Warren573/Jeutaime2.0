/**
 * Tests unitaires de la policy salonBackground.
 * Pure, aucune dépendance Prisma.
 */
import { describe, it, expect } from "vitest";
import {
  assertBackgroundCoherence,
  resolveNextValue,
} from "../../src/policies/salonBackground";
import { BadRequestError } from "../../src/core/errors";

// ============================================================
// assertBackgroundCoherence
// ============================================================

describe("assertBackgroundCoherence", () => {
  // --- image -----------------------------------------------
  it("type=image avec URL → OK", () => {
    expect(() =>
      assertBackgroundCoherence("image", null, "/api/files/admin/salons/bg.webp"),
    ).not.toThrow();
  });

  it("type=image sans URL → BadRequestError", () => {
    expect(() => assertBackgroundCoherence("image", null, null)).toThrow(
      BadRequestError,
    );
  });

  it("type=image avec chaîne vide → BadRequestError", () => {
    expect(() => assertBackgroundCoherence("image", null, "")).toThrow(
      BadRequestError,
    );
  });

  // --- color -----------------------------------------------
  it("type=color avec { color: '#ff0000' } → OK", () => {
    expect(() =>
      assertBackgroundCoherence("color", { color: "#ff0000" }, null),
    ).not.toThrow();
  });

  it("type=color sans config → BadRequestError", () => {
    expect(() => assertBackgroundCoherence("color", null, null)).toThrow(
      BadRequestError,
    );
  });

  it("type=color avec config {} vide → BadRequestError", () => {
    expect(() => assertBackgroundCoherence("color", {}, null)).toThrow(
      BadRequestError,
    );
  });

  it("type=color avec config.color non-string → BadRequestError", () => {
    expect(() =>
      assertBackgroundCoherence("color", { color: 0xff0000 }, null),
    ).toThrow(BadRequestError);
  });

  // --- gradient --------------------------------------------
  it("type=gradient avec config → OK", () => {
    expect(() =>
      assertBackgroundCoherence(
        "gradient",
        { start: "#FF0000", end: "#00FF00" },
        null,
      ),
    ).not.toThrow();
  });

  it("type=gradient sans config (legacy fallback) → OK", () => {
    expect(() =>
      assertBackgroundCoherence("gradient", null, null),
    ).not.toThrow();
  });

  // --- invalide --------------------------------------------
  it("type inconnu → BadRequestError", () => {
    expect(() =>
      assertBackgroundCoherence("video", null, null),
    ).toThrow(BadRequestError);
  });

  it("type vide → BadRequestError", () => {
    expect(() => assertBackgroundCoherence("", null, null)).toThrow(
      BadRequestError,
    );
  });
});

// ============================================================
// resolveNextValue
// ============================================================

describe("resolveNextValue", () => {
  it("undefined → garde la valeur actuelle", () => {
    expect(resolveNextValue(undefined, "current")).toBe("current");
    expect(resolveNextValue(undefined, null)).toBe(null);
  });

  it("null → remet à null explicitement", () => {
    expect(resolveNextValue(null, "current")).toBe(null);
  });

  it("valeur fournie → prend la valeur fournie", () => {
    expect(resolveNextValue("new", "old")).toBe("new");
    expect(resolveNextValue("value", null)).toBe("value");
  });
});

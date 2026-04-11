/**
 * Tests unitaires des policies pures de modération.
 * Aucune dépendance Prisma.
 */
import { describe, it, expect } from "vitest";
import { Role, ReportStatus } from "@prisma/client";
import {
  assertCanBanUser,
  assertReportTransition,
} from "../../src/policies/moderation";
import { BadRequestError, ForbiddenError } from "../../src/core/errors";

// ============================================================
// assertCanBanUser — matrice de permissions
// ============================================================
describe("assertCanBanUser", () => {
  const admin = { id: "admin-1", role: Role.ADMIN };
  const admin2 = { id: "admin-2", role: Role.ADMIN };
  const mod = { id: "mod-1", role: Role.MODERATOR };
  const mod2 = { id: "mod-2", role: Role.MODERATOR };
  const user = { id: "user-1", role: Role.USER };
  const user2 = { id: "user-2", role: Role.USER };

  it("ADMIN bannit USER → OK", () => {
    expect(() => assertCanBanUser(admin, user)).not.toThrow();
  });

  it("ADMIN bannit MODERATOR → OK", () => {
    expect(() => assertCanBanUser(admin, mod)).not.toThrow();
  });

  it("ADMIN bannit ADMIN → ForbiddenError", () => {
    expect(() => assertCanBanUser(admin, admin2)).toThrow(ForbiddenError);
  });

  it("MODERATOR bannit USER → OK (utile à warn, mais ban est ADMIN-only au routing — la policy autorise)", () => {
    // La policy reste tolérante : c'est requireRole qui ferme la route ban
    // aux MODs. La policy ne bloque que sur les rôles cibles (ADMIN/MOD).
    expect(() => assertCanBanUser(mod, user)).not.toThrow();
  });

  it("MODERATOR bannit MODERATOR → ForbiddenError", () => {
    expect(() => assertCanBanUser(mod, mod2)).toThrow(ForbiddenError);
  });

  it("MODERATOR bannit ADMIN → ForbiddenError", () => {
    expect(() => assertCanBanUser(mod, admin)).toThrow(ForbiddenError);
  });

  it("USER bannit USER → OK côté policy (mais route fermée par requireRole)", () => {
    expect(() => assertCanBanUser(user, user2)).not.toThrow();
  });

  it("auto-ban → ForbiddenError", () => {
    expect(() => assertCanBanUser(admin, admin)).toThrow(ForbiddenError);
    expect(() => assertCanBanUser(mod, mod)).toThrow(ForbiddenError);
    expect(() => assertCanBanUser(user, user)).toThrow(ForbiddenError);
  });
});

// ============================================================
// assertReportTransition — machine d'états
// ============================================================
describe("assertReportTransition", () => {
  // --- transitions valides depuis OPEN ----------------------
  it("OPEN → REVIEWING", () => {
    expect(() =>
      assertReportTransition(ReportStatus.OPEN, ReportStatus.REVIEWING),
    ).not.toThrow();
  });

  it("OPEN → ACTIONED (raccourci)", () => {
    expect(() =>
      assertReportTransition(ReportStatus.OPEN, ReportStatus.ACTIONED),
    ).not.toThrow();
  });

  it("OPEN → DISMISSED (raccourci)", () => {
    expect(() =>
      assertReportTransition(ReportStatus.OPEN, ReportStatus.DISMISSED),
    ).not.toThrow();
  });

  // --- transitions valides depuis REVIEWING -----------------
  it("REVIEWING → ACTIONED", () => {
    expect(() =>
      assertReportTransition(ReportStatus.REVIEWING, ReportStatus.ACTIONED),
    ).not.toThrow();
  });

  it("REVIEWING → DISMISSED", () => {
    expect(() =>
      assertReportTransition(ReportStatus.REVIEWING, ReportStatus.DISMISSED),
    ).not.toThrow();
  });

  it("REVIEWING → OPEN → BadRequestError (pas de retour)", () => {
    expect(() =>
      assertReportTransition(ReportStatus.REVIEWING, ReportStatus.OPEN),
    ).toThrow(BadRequestError);
  });

  // --- transitions terminales (toutes interdites) -----------
  it("ACTIONED → quoi que ce soit → BadRequestError", () => {
    expect(() =>
      assertReportTransition(ReportStatus.ACTIONED, ReportStatus.OPEN),
    ).toThrow(BadRequestError);
    expect(() =>
      assertReportTransition(ReportStatus.ACTIONED, ReportStatus.REVIEWING),
    ).toThrow(BadRequestError);
    expect(() =>
      assertReportTransition(ReportStatus.ACTIONED, ReportStatus.DISMISSED),
    ).toThrow(BadRequestError);
  });

  it("DISMISSED → quoi que ce soit → BadRequestError", () => {
    expect(() =>
      assertReportTransition(ReportStatus.DISMISSED, ReportStatus.OPEN),
    ).toThrow(BadRequestError);
    expect(() =>
      assertReportTransition(ReportStatus.DISMISSED, ReportStatus.ACTIONED),
    ).toThrow(BadRequestError);
  });

  // --- no-op interdit ---------------------------------------
  it("no-op (current === next) → BadRequestError", () => {
    expect(() =>
      assertReportTransition(ReportStatus.OPEN, ReportStatus.OPEN),
    ).toThrow(BadRequestError);
    expect(() =>
      assertReportTransition(ReportStatus.REVIEWING, ReportStatus.REVIEWING),
    ).toThrow(BadRequestError);
    expect(() =>
      assertReportTransition(ReportStatus.ACTIONED, ReportStatus.ACTIONED),
    ).toThrow(BadRequestError);
  });
});

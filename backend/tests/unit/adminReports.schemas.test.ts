/**
 * Tests unitaires des schémas Zod admin/reports.
 */
import { describe, it, expect } from "vitest";
import { ReportStatus } from "@prisma/client";
import {
  ListReportsQuerySchema,
  UpdateReportSchema,
  ReportIdParamsSchema,
} from "../../src/modules/admin/reports/adminReports.schemas";

// ============================================================
// ListReportsQuerySchema
// ============================================================
describe("ListReportsQuerySchema", () => {
  it("vide → defaults", () => {
    const res = ListReportsQuerySchema.parse({});
    expect(res.page).toBe(1);
    expect(res.pageSize).toBe(20);
  });

  it("filtres status + targetId + reporterId", () => {
    const res = ListReportsQuerySchema.parse({
      status: ReportStatus.OPEN,
      targetId: "u1",
      reporterId: "u2",
    });
    expect(res.status).toBe(ReportStatus.OPEN);
    expect(res.targetId).toBe("u1");
    expect(res.reporterId).toBe("u2");
  });

  it("status invalide → rejeté", () => {
    expect(() =>
      ListReportsQuerySchema.parse({ status: "BANANA" }),
    ).toThrow();
  });

  it("champ inconnu → rejeté", () => {
    expect(() =>
      ListReportsQuerySchema.parse({ wat: 1 }),
    ).toThrow();
  });
});

// ============================================================
// UpdateReportSchema
// ============================================================
describe("UpdateReportSchema", () => {
  it("status seul → OK", () => {
    const res = UpdateReportSchema.parse({ status: ReportStatus.REVIEWING });
    expect(res.status).toBe(ReportStatus.REVIEWING);
    expect(res.resolution).toBeUndefined();
  });

  it("status + resolution → OK", () => {
    const res = UpdateReportSchema.parse({
      status: ReportStatus.ACTIONED,
      resolution: "User banni 7j",
    });
    expect(res.resolution).toBe("User banni 7j");
  });

  it("status manquant → rejeté", () => {
    expect(() => UpdateReportSchema.parse({})).toThrow();
  });

  it("status invalide → rejeté", () => {
    expect(() =>
      UpdateReportSchema.parse({ status: "WAT" }),
    ).toThrow();
  });

  it("resolution > 2000 → rejeté", () => {
    expect(() =>
      UpdateReportSchema.parse({
        status: ReportStatus.DISMISSED,
        resolution: "x".repeat(2001),
      }),
    ).toThrow();
  });

  it("champ inconnu → rejeté (strict)", () => {
    expect(() =>
      UpdateReportSchema.parse({
        status: ReportStatus.OPEN,
        secret: "x",
      }),
    ).toThrow();
  });
});

// ============================================================
// ReportIdParamsSchema
// ============================================================
describe("ReportIdParamsSchema", () => {
  it("id non vide → OK", () => {
    expect(ReportIdParamsSchema.parse({ id: "rep_1" })).toEqual({
      id: "rep_1",
    });
  });

  it("id vide → rejeté", () => {
    expect(() => ReportIdParamsSchema.parse({ id: "" })).toThrow();
  });

  it("id manquant → rejeté", () => {
    expect(() => ReportIdParamsSchema.parse({})).toThrow();
  });
});

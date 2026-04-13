/**
 * Tests unitaires des schémas Zod de Reports (côté user).
 * Pure : aucune dépendance runtime.
 */
import { describe, it, expect } from "vitest";
import { ReportReason, ReportStatus } from "@prisma/client";
import {
  CreateReportSchema,
  ListMyReportsQuerySchema,
} from "../../src/modules/reports/reports.schemas";

// ============================================================
// CreateReportSchema
// ============================================================
describe("CreateReportSchema", () => {
  const base = {
    targetId: "user-cuid-123",
    reason: ReportReason.HARASSMENT,
  };

  it("minimum valide → OK", () => {
    const res = CreateReportSchema.parse(base);
    expect(res.targetId).toBe("user-cuid-123");
    expect(res.reason).toBe(ReportReason.HARASSMENT);
  });

  it("avec details → OK", () => {
    const res = CreateReportSchema.parse({
      ...base,
      details: "Message agressif répété",
    });
    expect(res.details).toBe("Message agressif répété");
  });

  it("targetId vide → rejeté", () => {
    expect(() =>
      CreateReportSchema.parse({ ...base, targetId: "" }),
    ).toThrow();
  });

  it("reason invalide → rejeté", () => {
    expect(() =>
      CreateReportSchema.parse({ ...base, reason: "INVENTED" }),
    ).toThrow();
  });

  it("reason manquant → rejeté", () => {
    expect(() =>
      CreateReportSchema.parse({ targetId: "u1" }),
    ).toThrow();
  });

  it("details > 2000 caractères → rejeté", () => {
    expect(() =>
      CreateReportSchema.parse({ ...base, details: "x".repeat(2001) }),
    ).toThrow();
  });

  it("champ inconnu → rejeté (strict)", () => {
    expect(() =>
      CreateReportSchema.parse({ ...base, evidenceUrl: "http://x" }),
    ).toThrow();
  });

  it("toutes les raisons enum acceptées", () => {
    const reasons: ReportReason[] = [
      ReportReason.HARASSMENT,
      ReportReason.SPAM,
      ReportReason.FAKE,
      ReportReason.INAPPROPRIATE_CONTENT,
      ReportReason.MINOR,
      ReportReason.OTHER,
    ];
    for (const r of reasons) {
      expect(() =>
        CreateReportSchema.parse({ targetId: "u1", reason: r }),
      ).not.toThrow();
    }
  });
});

// ============================================================
// ListMyReportsQuerySchema
// ============================================================
describe("ListMyReportsQuerySchema", () => {
  it("vide → defaults page=1, pageSize=20", () => {
    const res = ListMyReportsQuerySchema.parse({});
    expect(res.page).toBe(1);
    expect(res.pageSize).toBe(20);
  });

  it("status valide", () => {
    const res = ListMyReportsQuerySchema.parse({
      status: ReportStatus.OPEN,
    });
    expect(res.status).toBe(ReportStatus.OPEN);
  });

  it("page/pageSize coercés depuis string (query)", () => {
    const res = ListMyReportsQuerySchema.parse({
      page: "2",
      pageSize: "50",
    });
    expect(res.page).toBe(2);
    expect(res.pageSize).toBe(50);
  });

  it("pageSize > 100 → rejeté", () => {
    expect(() =>
      ListMyReportsQuerySchema.parse({ pageSize: 101 }),
    ).toThrow();
  });

  it("page = 0 → rejeté", () => {
    expect(() =>
      ListMyReportsQuerySchema.parse({ page: 0 }),
    ).toThrow();
  });

  it("status invalide → rejeté", () => {
    expect(() =>
      ListMyReportsQuerySchema.parse({ status: "WAT" }),
    ).toThrow();
  });

  it("champ inconnu → rejeté (strict)", () => {
    expect(() =>
      ListMyReportsQuerySchema.parse({ foo: "bar" }),
    ).toThrow();
  });
});

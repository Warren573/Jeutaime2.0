/**
 * Tests unitaires du schéma Zod de la query audit-log.
 */
import { describe, it, expect } from "vitest";
import { ListAuditQuerySchema } from "../../src/modules/admin/audit/adminAudit.schemas";

describe("ListAuditQuerySchema", () => {
  it("vide → defaults page=1, pageSize=50", () => {
    const res = ListAuditQuerySchema.parse({});
    expect(res.page).toBe(1);
    expect(res.pageSize).toBe(50);
  });

  it("filtres simples", () => {
    const res = ListAuditQuerySchema.parse({
      actorId: "admin-1",
      action: "admin.user.ban",
      target: "user-42",
    });
    expect(res.actorId).toBe("admin-1");
    expect(res.action).toBe("admin.user.ban");
    expect(res.target).toBe("user-42");
  });

  it("dates coercées (string ISO → Date)", () => {
    const res = ListAuditQuerySchema.parse({
      since: "2026-01-01T00:00:00Z",
      until: "2026-01-31T23:59:59Z",
    });
    expect(res.since).toBeInstanceOf(Date);
    expect(res.until).toBeInstanceOf(Date);
  });

  it("since > until → rejeté", () => {
    expect(() =>
      ListAuditQuerySchema.parse({
        since: "2026-12-31",
        until: "2026-01-01",
      }),
    ).toThrow();
  });

  it("since == until → OK", () => {
    expect(() =>
      ListAuditQuerySchema.parse({
        since: "2026-01-01",
        until: "2026-01-01",
      }),
    ).not.toThrow();
  });

  it("pageSize > 100 → rejeté", () => {
    expect(() =>
      ListAuditQuerySchema.parse({ pageSize: 101 }),
    ).toThrow();
  });

  it("page = 0 → rejeté", () => {
    expect(() => ListAuditQuerySchema.parse({ page: 0 })).toThrow();
  });

  it("champ inconnu → rejeté (strict)", () => {
    expect(() =>
      ListAuditQuerySchema.parse({ wat: "x" }),
    ).toThrow();
  });
});

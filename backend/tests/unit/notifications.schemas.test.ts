/**
 * Tests unitaires des schémas Zod de Notifications.
 */
import { describe, it, expect } from "vitest";
import { NotificationType } from "@prisma/client";
import {
  ListNotificationsQuerySchema,
  NotificationIdParamsSchema,
} from "../../src/modules/notifications/notifications.schemas";

// ============================================================
// ListNotificationsQuerySchema
// ============================================================
describe("ListNotificationsQuerySchema", () => {
  it("vide → defaults page=1, pageSize=20, pas de filtres", () => {
    const res = ListNotificationsQuerySchema.parse({});
    expect(res.page).toBe(1);
    expect(res.pageSize).toBe(20);
    expect(res.unreadOnly).toBeUndefined();
    expect(res.type).toBeUndefined();
  });

  it("unreadOnly=true booléen → true", () => {
    const res = ListNotificationsQuerySchema.parse({ unreadOnly: true });
    expect(res.unreadOnly).toBe(true);
  });

  it("unreadOnly='true' string (query string) → true", () => {
    const res = ListNotificationsQuerySchema.parse({ unreadOnly: "true" });
    expect(res.unreadOnly).toBe(true);
  });

  it("unreadOnly='false' → false", () => {
    const res = ListNotificationsQuerySchema.parse({ unreadOnly: "false" });
    expect(res.unreadOnly).toBe(false);
  });

  it("unreadOnly valeur invalide → rejeté", () => {
    expect(() =>
      ListNotificationsQuerySchema.parse({ unreadOnly: "maybe" }),
    ).toThrow();
  });

  it("type valide → conservé", () => {
    const res = ListNotificationsQuerySchema.parse({
      type: NotificationType.LETTER_RECEIVED,
    });
    expect(res.type).toBe(NotificationType.LETTER_RECEIVED);
  });

  it("type invalide → rejeté", () => {
    expect(() =>
      ListNotificationsQuerySchema.parse({ type: "WAT" }),
    ).toThrow();
  });

  it("page/pageSize coercés depuis string", () => {
    const res = ListNotificationsQuerySchema.parse({
      page: "3",
      pageSize: "50",
    });
    expect(res.page).toBe(3);
    expect(res.pageSize).toBe(50);
  });

  it("pageSize > 100 → rejeté", () => {
    expect(() =>
      ListNotificationsQuerySchema.parse({ pageSize: 101 }),
    ).toThrow();
  });

  it("page = 0 → rejeté", () => {
    expect(() => ListNotificationsQuerySchema.parse({ page: 0 })).toThrow();
  });

  it("champ inconnu → rejeté (strict)", () => {
    expect(() =>
      ListNotificationsQuerySchema.parse({ foo: "bar" }),
    ).toThrow();
  });
});

// ============================================================
// NotificationIdParamsSchema
// ============================================================
describe("NotificationIdParamsSchema", () => {
  it("id valide → OK", () => {
    const res = NotificationIdParamsSchema.parse({ id: "ntf_abc123" });
    expect(res.id).toBe("ntf_abc123");
  });

  it("id vide → rejeté", () => {
    expect(() => NotificationIdParamsSchema.parse({ id: "" })).toThrow();
  });

  it("id trop long (> 64) → rejeté", () => {
    expect(() =>
      NotificationIdParamsSchema.parse({ id: "x".repeat(65) }),
    ).toThrow();
  });

  it("champ inconnu → rejeté (strict)", () => {
    expect(() =>
      NotificationIdParamsSchema.parse({ id: "ok", extra: 1 }),
    ).toThrow();
  });
});

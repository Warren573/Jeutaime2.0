/**
 * Tests unitaires des policies pures de Notifications.
 * Aucune dépendance Prisma.
 */
import { describe, it, expect } from "vitest";
import { NotificationType } from "@prisma/client";
import {
  assertNotificationOwnership,
  buildNotificationMessage,
  sanitizeNotificationMeta,
  ALLOWED_META_KEYS,
} from "../../src/policies/notifications";
import { ForbiddenError } from "../../src/core/errors";

// ============================================================
// assertNotificationOwnership
// ============================================================
describe("assertNotificationOwnership", () => {
  it("owner === requester → OK", () => {
    expect(() => assertNotificationOwnership("u1", "u1")).not.toThrow();
  });

  it("owner !== requester → ForbiddenError", () => {
    expect(() => assertNotificationOwnership("u1", "u2")).toThrow(
      ForbiddenError,
    );
  });

  it("message d'erreur explicite", () => {
    try {
      assertNotificationOwnership("u1", "u2");
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ForbiddenError);
      expect((e as Error).message).toMatch(/notification/i);
    }
  });
});

// ============================================================
// buildNotificationMessage
// ============================================================
describe("buildNotificationMessage", () => {
  it("couvre tous les NotificationType", () => {
    // Bouclage exhaustif : garantit qu'aucun type ne renvoie undefined
    // et force la maintenance si un nouveau type est ajouté.
    const types: NotificationType[] = [
      NotificationType.LETTER_RECEIVED,
      NotificationType.MATCH_CREATED,
      NotificationType.OFFERING_RECEIVED,
      NotificationType.MAGIE_RECEIVED,
      NotificationType.MAGIE_BROKEN,
      NotificationType.PREMIUM_SUBSCRIBED,
      NotificationType.PREMIUM_CANCELLED,
    ];
    for (const t of types) {
      const msg = buildNotificationMessage(t);
      expect(typeof msg).toBe("string");
      expect(msg.length).toBeGreaterThan(0);
    }
  });

  it("LETTER_RECEIVED → mention de lettre", () => {
    expect(
      buildNotificationMessage(NotificationType.LETTER_RECEIVED),
    ).toMatch(/lettre/i);
  });

  it("MATCH_CREATED → mention de match", () => {
    expect(
      buildNotificationMessage(NotificationType.MATCH_CREATED),
    ).toMatch(/match/i);
  });

  it("MAGIE_BROKEN → mention de sort brisé", () => {
    expect(
      buildNotificationMessage(NotificationType.MAGIE_BROKEN),
    ).toMatch(/sort/i);
  });

  it("PREMIUM_SUBSCRIBED → mention de Premium actif", () => {
    expect(
      buildNotificationMessage(NotificationType.PREMIUM_SUBSCRIBED),
    ).toMatch(/premium/i);
  });
});

// ============================================================
// sanitizeNotificationMeta
// ============================================================
describe("sanitizeNotificationMeta", () => {
  it("null / undefined → null", () => {
    expect(sanitizeNotificationMeta(null)).toBeNull();
    expect(sanitizeNotificationMeta(undefined)).toBeNull();
  });

  it("objet vide → null", () => {
    expect(sanitizeNotificationMeta({})).toBeNull();
  });

  it("clé whitelistée valide → conservée", () => {
    expect(
      sanitizeNotificationMeta({ matchId: "m1", fromUserId: "u1" }),
    ).toEqual({ matchId: "m1", fromUserId: "u1" });
  });

  it("clé non whitelistée → ignorée", () => {
    expect(
      sanitizeNotificationMeta({
        matchId: "m1",
        coinsSpent: 500,
        details: "private info",
      }),
    ).toEqual({ matchId: "m1" });
  });

  it("toutes les clés inconnues → null (objet sortant vide)", () => {
    expect(
      sanitizeNotificationMeta({
        coinsSpent: 500,
        foo: "bar",
        secret: "hack",
      }),
    ).toBeNull();
  });

  it("valeur non-string (nombre) → ignorée (protège contre les montants)", () => {
    expect(
      sanitizeNotificationMeta({
        matchId: "m1",
        fromUserId: 42 as unknown as string,
      }),
    ).toEqual({ matchId: "m1" });
  });

  it("string vide → ignorée", () => {
    expect(sanitizeNotificationMeta({ matchId: "" })).toBeNull();
  });

  it("accepte exactement toutes les clés ALLOWED_META_KEYS", () => {
    const full = Object.fromEntries(
      ALLOWED_META_KEYS.map((k) => [k, `${k}-val`]),
    );
    const cleaned = sanitizeNotificationMeta(full);
    expect(cleaned).not.toBeNull();
    for (const k of ALLOWED_META_KEYS) {
      expect(cleaned).toHaveProperty(k, `${k}-val`);
    }
  });

  it("ALLOWED_META_KEYS ne contient PAS de clés sensibles", () => {
    const forbidden = [
      "coinsSpent",
      "cost",
      "amount",
      "details",
      "reason",
      "email",
      "password",
    ];
    for (const key of forbidden) {
      expect(ALLOWED_META_KEYS as readonly string[]).not.toContain(key);
    }
  });
});

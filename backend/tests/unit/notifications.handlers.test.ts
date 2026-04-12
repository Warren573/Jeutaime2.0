/**
 * Tests d'intégration légère des event handlers → Notification.
 *
 * Stratégie : on mocke `notifications.service` ET les dépendances
 * d'initialisation (env, prisma, logger) pour pouvoir importer
 * `src/events/handlers` sans toucher à la DB. On vérifie ensuite que,
 * quand on émet un event, le bon appel à `createNotification` est fait.
 *
 * Le pattern fire-and-forget des handlers est également validé : une
 * erreur du service ne doit PAS propager vers l'émetteur.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ------------------------------------------------------------------
// Mocks — hoistés par Vitest (vi.mock s'exécute avant les imports)
// ------------------------------------------------------------------

// Env : on contourne le parsing strict (pas de .env en CI tests)
vi.mock("../../src/config/env", () => ({
  env: {
    NODE_ENV: "test",
    PORT: 3000,
    API_PREFIX: "/api",
    DATABASE_URL: "postgresql://test",
    JWT_ACCESS_SECRET: "x".repeat(32),
    JWT_REFRESH_SECRET: "x".repeat(32),
    JWT_ACCESS_EXPIRES_IN: "15m",
    JWT_REFRESH_EXPIRES_IN: "30d",
    BCRYPT_ROUNDS: 10,
    CORS_ORIGINS: "http://localhost",
    UPLOAD_DIR: "./storage",
    MAX_FILE_SIZE_MB: 5,
    RATE_LIMIT_WINDOW_MS: 60000,
    RATE_LIMIT_MAX: 100,
    RATE_LIMIT_AUTH_MAX: 5,
    RATE_LIMIT_LETTERS_MAX: 20,
    RATE_LIMIT_LETTERS_WINDOW_MS: 3600000,
    RATE_LIMIT_REPORTS_MAX: 5,
    RATE_LIMIT_REPORTS_WINDOW_MS: 3600000,
    RATE_LIMIT_PHOTO_UPLOAD_MAX: 10,
    RATE_LIMIT_PHOTO_UPLOAD_WINDOW_MS: 3600000,
    LOG_LEVEL: "silent",
    ENABLE_SCHEDULER: false,
    SCHEDULER_INTERVAL_MS: 300000,
    REFRESH_TOKEN_PURGE_GRACE_MS: 3600000,
  },
  corsOrigins: ["http://localhost"],
}));

// Prisma : stub complet, les handlers XP appellent profile.update
// qui renvoie une promesse rejetée pour vérifier le try/catch silencieux
vi.mock("../../src/config/prisma", () => ({
  prisma: {
    $transaction: vi.fn().mockResolvedValue([]),
    profile: {
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

// Logger : silencieux
vi.mock("../../src/config/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// createNotification : c'est ce qu'on veut observer
// Utiliser vi.hoisted pour que le mock existe AVANT les vi.mock hoistés
const { createNotificationMock } = vi.hoisted(() => ({
  createNotificationMock: vi.fn(),
}));
vi.mock("../../src/modules/notifications/notifications.service", () => ({
  createNotification: createNotificationMock,
}));

// Maintenant on peut importer handlers (side-effect : enregistre les listeners)
// ------------------------------------------------------------------
import "../../src/events/handlers";
import { emitter } from "../../src/events";
import { NotificationType } from "@prisma/client";

// Helper : attend que tous les handlers async du tick courant soient résolus
const flushAsync = () => new Promise((r) => setImmediate(r));

beforeEach(() => {
  createNotificationMock.mockReset();
  createNotificationMock.mockResolvedValue({});
});

// ============================================================
// letterSent → LETTER_RECEIVED pour toUserId
// ============================================================
describe("handlers: letterSent → Notification", () => {
  it("crée une notification LETTER_RECEIVED pour le destinataire", async () => {
    emitter.emit("letterSent", {
      matchId: "m1",
      fromUserId: "u1",
      toUserId: "u2",
      matchLetterCountA: 1,
      matchLetterCountB: 0,
      isGhostRelance: false,
    });
    await flushAsync();
    await flushAsync();

    // Au moins un appel doit cibler le destinataire avec LETTER_RECEIVED
    const call = createNotificationMock.mock.calls.find(
      (c) => c[0]?.type === NotificationType.LETTER_RECEIVED,
    );
    expect(call).toBeDefined();
    expect(call![0]).toMatchObject({
      userId: "u2",
      type: NotificationType.LETTER_RECEIVED,
      meta: { matchId: "m1", fromUserId: "u1" },
    });
  });
});

// ============================================================
// matchCreated → MATCH_CREATED × 2
// ============================================================
describe("handlers: matchCreated → 2 Notifications", () => {
  it("crée une notification pour chaque user", async () => {
    emitter.emit("matchCreated", {
      matchId: "m1",
      userAId: "u1",
      userBId: "u2",
      initiatorId: "u1",
    });
    await flushAsync();
    await flushAsync();

    const matchCalls = createNotificationMock.mock.calls.filter(
      (c) => c[0]?.type === NotificationType.MATCH_CREATED,
    );
    expect(matchCalls.length).toBe(2);

    const aCall = matchCalls.find((c) => c[0].userId === "u1");
    const bCall = matchCalls.find((c) => c[0].userId === "u2");
    expect(aCall).toBeDefined();
    expect(bCall).toBeDefined();
    expect(aCall![0].meta).toEqual({ matchId: "m1", otherUserId: "u2" });
    expect(bCall![0].meta).toEqual({ matchId: "m1", otherUserId: "u1" });
  });
});

// ============================================================
// offeringSent → OFFERING_RECEIVED pour la cible
// ============================================================
describe("handlers: offeringSent → Notification", () => {
  it("crée une notif OFFERING_RECEIVED pour toUserId", async () => {
    emitter.emit("offeringSent", {
      offeringSentId: "os1",
      offeringId: "off_rose",
      fromUserId: "u1",
      toUserId: "u2",
      salonId: null,
      cost: 50,
      expiresAt: null,
    });
    await flushAsync();

    const call = createNotificationMock.mock.calls.find(
      (c) => c[0]?.type === NotificationType.OFFERING_RECEIVED,
    );
    expect(call).toBeDefined();
    expect(call![0]).toMatchObject({
      userId: "u2",
      meta: { offeringSentId: "os1", offeringId: "off_rose", fromUserId: "u1" },
    });
  });

  it("meta ne contient JAMAIS le champ `cost`", async () => {
    emitter.emit("offeringSent", {
      offeringSentId: "os2",
      offeringId: "off_x",
      fromUserId: "u1",
      toUserId: "u2",
      salonId: null,
      cost: 999,
      expiresAt: null,
    });
    await flushAsync();

    const call = createNotificationMock.mock.calls.find(
      (c) => c[0]?.type === NotificationType.OFFERING_RECEIVED,
    );
    expect(call).toBeDefined();
    expect(call![0].meta).not.toHaveProperty("cost");
  });
});

// ============================================================
// magieCast → MAGIE_RECEIVED pour la cible
// ============================================================
describe("handlers: magieCast → Notification", () => {
  it("crée une notif MAGIE_RECEIVED pour toUserId", async () => {
    emitter.emit("magieCast", {
      magieCastId: "mc1",
      magieId: "mag_grenouille",
      fromUserId: "u1",
      toUserId: "u2",
      salonId: "s1",
      expiresAt: new Date("2026-04-12"),
      cost: 30,
    });
    await flushAsync();

    const call = createNotificationMock.mock.calls.find(
      (c) => c[0]?.type === NotificationType.MAGIE_RECEIVED,
    );
    expect(call).toBeDefined();
    expect(call![0]).toMatchObject({
      userId: "u2",
      meta: {
        magieCastId: "mc1",
        magieId: "mag_grenouille",
        fromUserId: "u1",
      },
    });
  });
});

// ============================================================
// magieBroken → MAGIE_BROKEN pour originalToUserId UNIQUEMENT
// ============================================================
describe("handlers: magieBroken → Notification", () => {
  it("notifie SEULEMENT originalToUserId, pas le caster", async () => {
    emitter.emit("magieBroken", {
      magieCastId: "mc1",
      magieId: "mag_grenouille",
      antiSpellId: "mag_bisou",
      brokenBy: "u3",
      originalToUserId: "u2",
    });
    await flushAsync();

    const brokenCalls = createNotificationMock.mock.calls.filter(
      (c) => c[0]?.type === NotificationType.MAGIE_BROKEN,
    );
    expect(brokenCalls.length).toBe(1);
    expect(brokenCalls[0]![0]).toMatchObject({
      userId: "u2",
      meta: { magieCastId: "mc1" },
    });

    // Pas de notif pour brokenBy ("u3")
    expect(
      brokenCalls.find((c) => c[0].userId === "u3"),
    ).toBeUndefined();
  });
});

// ============================================================
// premiumSubscribed → PREMIUM_SUBSCRIBED pour le user
// ============================================================
describe("handlers: premiumSubscribed → Notification", () => {
  it("crée une notif PREMIUM_SUBSCRIBED sans meta", async () => {
    emitter.emit("premiumSubscribed", {
      userId: "u1",
      planId: "premium_monthly",
      paymentMethod: "coins",
      coinsSpent: 500,
      newUntil: new Date("2026-05-11"),
      durationDays: 30,
    });
    await flushAsync();

    const call = createNotificationMock.mock.calls.find(
      (c) => c[0]?.type === NotificationType.PREMIUM_SUBSCRIBED,
    );
    expect(call).toBeDefined();
    expect(call![0].userId).toBe("u1");
    // meta vide ou null (pas de coinsSpent !)
    expect(call![0].meta).toBeNull();
  });
});

// ============================================================
// premiumCancelled → PREMIUM_CANCELLED pour le user
// ============================================================
describe("handlers: premiumCancelled → Notification", () => {
  it("crée une notif PREMIUM_CANCELLED sans meta", async () => {
    emitter.emit("premiumCancelled", {
      userId: "u1",
      previousUntil: null,
    });
    await flushAsync();

    const call = createNotificationMock.mock.calls.find(
      (c) => c[0]?.type === NotificationType.PREMIUM_CANCELLED,
    );
    expect(call).toBeDefined();
    expect(call![0].userId).toBe("u1");
    expect(call![0].meta).toBeNull();
  });
});

// ============================================================
// reportCreated → AUCUNE notification (pas dans cette phase)
// ============================================================
describe("handlers: reportCreated → AUCUNE Notification", () => {
  it("ne crée pas de notification", async () => {
    emitter.emit("reportCreated", {
      reportId: "r1",
      reporterId: "u1",
      targetId: "u2",
      reason: "HARASSMENT",
    });
    await flushAsync();

    expect(createNotificationMock).not.toHaveBeenCalled();
  });
});

// ============================================================
// Fire-and-forget : une erreur du service ne casse pas l'emit
// ============================================================
describe("handlers: resilience (fire-and-forget)", () => {
  it("une erreur dans createNotification ne propage pas", async () => {
    createNotificationMock.mockRejectedValueOnce(new Error("db down"));

    expect(() => {
      emitter.emit("offeringSent", {
        offeringSentId: "os_err",
        offeringId: "off_x",
        fromUserId: "u1",
        toUserId: "u2",
        salonId: null,
        cost: 10,
        expiresAt: null,
      });
    }).not.toThrow();

    await flushAsync();
    // Le mock a bien été appelé — l'erreur a été capturée silencieusement
    expect(createNotificationMock).toHaveBeenCalled();
  });
});

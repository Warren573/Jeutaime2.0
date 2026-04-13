/**
 * Tests du service Notifications avec prisma mocké.
 * On se concentre sur les invariants métier :
 *   - createNotification utilise le message builder pur (pas celui de l'appelant)
 *   - createNotification sanitize meta (pas de fuite de montants)
 *   - markAsRead est idempotent (pas d'update si déjà lue)
 *   - markAsRead 404 si introuvable
 *   - markAsRead ForbiddenError si cross-user
 *   - markAllAsRead filtre strictement sur userId + isRead:false
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotificationType } from "@prisma/client";

// ------------------------------------------------------------------
// Mocks hoistés
// ------------------------------------------------------------------
vi.mock("../../src/config/env", () => ({
  env: {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://test",
    JWT_ACCESS_SECRET: "x".repeat(32),
    JWT_REFRESH_SECRET: "x".repeat(32),
    BCRYPT_ROUNDS: 10,
    LOG_LEVEL: "silent",
  },
  corsOrigins: [],
}));

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    notification: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("../../src/config/prisma", () => ({
  prisma: prismaMock,
}));

import {
  createNotification,
  markAsRead,
  markAllAsRead,
  unreadCount,
  listMine,
} from "../../src/modules/notifications/notifications.service";
import {
  NotFoundError,
  ForbiddenError,
} from "../../src/core/errors";

beforeEach(() => {
  Object.values(prismaMock.notification).forEach((fn) => fn.mockReset());
});

// ============================================================
// createNotification
// ============================================================
describe("createNotification", () => {
  it("génère le message via la policy pure (jamais depuis l'appelant)", async () => {
    prismaMock.notification.create.mockResolvedValue({
      id: "n1",
      userId: "u1",
      type: NotificationType.LETTER_RECEIVED,
      message: "Tu as reçu une nouvelle lettre",
      meta: { matchId: "m1" },
      isRead: false,
      readAt: null,
      createdAt: new Date(),
    });

    await createNotification({
      userId: "u1",
      type: NotificationType.LETTER_RECEIVED,
      meta: { matchId: "m1" },
    });

    const args = prismaMock.notification.create.mock.calls[0]![0];
    expect(args.data.userId).toBe("u1");
    expect(args.data.type).toBe(NotificationType.LETTER_RECEIVED);
    expect(args.data.message).toMatch(/lettre/i);
  });

  it("sanitize meta : drop des clés non whitelistées (ex: coinsSpent)", async () => {
    prismaMock.notification.create.mockResolvedValue({
      id: "n1",
      userId: "u1",
      type: NotificationType.OFFERING_RECEIVED,
      message: "x",
      meta: { offeringSentId: "os1" },
      isRead: false,
      readAt: null,
      createdAt: new Date(),
    });

    await createNotification({
      userId: "u1",
      type: NotificationType.OFFERING_RECEIVED,
      meta: {
        offeringSentId: "os1",
        offeringId: "off_rose",
        // Champs qui DOIVENT être droppés
        coinsSpent: 500,
        cost: 50,
        secretHash: "abc",
      },
    });

    const dataMeta = prismaMock.notification.create.mock.calls[0]![0].data
      .meta as Record<string, unknown>;
    expect(dataMeta).toEqual({
      offeringSentId: "os1",
      offeringId: "off_rose",
    });
    expect(dataMeta).not.toHaveProperty("coinsSpent");
    expect(dataMeta).not.toHaveProperty("cost");
    expect(dataMeta).not.toHaveProperty("secretHash");
  });

  it("meta null accepté → ne persiste pas de clés utiles", async () => {
    prismaMock.notification.create.mockResolvedValue({
      id: "n1",
      userId: "u1",
      type: NotificationType.PREMIUM_SUBSCRIBED,
      message: "x",
      meta: null,
      isRead: false,
      readAt: null,
      createdAt: new Date(),
    });

    await createNotification({
      userId: "u1",
      type: NotificationType.PREMIUM_SUBSCRIBED,
      meta: null,
    });

    const data = prismaMock.notification.create.mock.calls[0]![0].data;
    // null ou undefined : dans tous les cas, pas de contenu persistable
    expect(data.meta == null).toBe(true);
  });
});

// ============================================================
// listMine
// ============================================================
describe("listMine", () => {
  it("filtre par userId + pagination + tri DESC", async () => {
    prismaMock.notification.findMany.mockResolvedValue([]);
    prismaMock.notification.count.mockResolvedValue(0);

    await listMine("u1", { page: 2, pageSize: 10 });

    const findArgs = prismaMock.notification.findMany.mock.calls[0]![0];
    expect(findArgs.where).toEqual({ userId: "u1" });
    expect(findArgs.orderBy).toEqual({ createdAt: "desc" });
    expect(findArgs.skip).toBe(10);
    expect(findArgs.take).toBe(10);
  });

  it("unreadOnly=true → ajoute isRead:false au where", async () => {
    prismaMock.notification.findMany.mockResolvedValue([]);
    prismaMock.notification.count.mockResolvedValue(0);

    await listMine("u1", { page: 1, pageSize: 20, unreadOnly: true });

    const where = prismaMock.notification.findMany.mock.calls[0]![0].where;
    expect(where).toEqual({ userId: "u1", isRead: false });
  });

  it("type filter → ajoute type au where", async () => {
    prismaMock.notification.findMany.mockResolvedValue([]);
    prismaMock.notification.count.mockResolvedValue(0);

    await listMine("u1", {
      page: 1,
      pageSize: 20,
      type: NotificationType.MATCH_CREATED,
    });

    const where = prismaMock.notification.findMany.mock.calls[0]![0].where;
    expect(where).toEqual({
      userId: "u1",
      type: NotificationType.MATCH_CREATED,
    });
  });
});

// ============================================================
// unreadCount
// ============================================================
describe("unreadCount", () => {
  it("count sur {userId, isRead:false}", async () => {
    prismaMock.notification.count.mockResolvedValue(7);
    const n = await unreadCount("u1");
    expect(n).toBe(7);
    expect(prismaMock.notification.count).toHaveBeenCalledWith({
      where: { userId: "u1", isRead: false },
    });
  });
});

// ============================================================
// markAsRead
// ============================================================
describe("markAsRead", () => {
  it("404 si introuvable", async () => {
    prismaMock.notification.findUnique.mockResolvedValue(null);
    await expect(markAsRead("u1", "ntf_x")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("403 si la notif appartient à un autre user", async () => {
    prismaMock.notification.findUnique.mockResolvedValue({
      id: "ntf_x",
      userId: "u_other",
      type: NotificationType.LETTER_RECEIVED,
      message: "x",
      meta: null,
      isRead: false,
      readAt: null,
      createdAt: new Date(),
    });
    await expect(markAsRead("u1", "ntf_x")).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    expect(prismaMock.notification.update).not.toHaveBeenCalled();
  });

  it("idempotent : si déjà lue, pas d'update DB", async () => {
    const readAt = new Date("2026-04-10");
    prismaMock.notification.findUnique.mockResolvedValue({
      id: "ntf_x",
      userId: "u1",
      type: NotificationType.LETTER_RECEIVED,
      message: "x",
      meta: null,
      isRead: true,
      readAt,
      createdAt: new Date(),
    });

    const res = await markAsRead("u1", "ntf_x");
    expect(res.isRead).toBe(true);
    expect(res.readAt).toEqual(readAt);
    expect(prismaMock.notification.update).not.toHaveBeenCalled();
  });

  it("non lue → update + retourne la notif mise à jour", async () => {
    prismaMock.notification.findUnique.mockResolvedValue({
      id: "ntf_x",
      userId: "u1",
      type: NotificationType.LETTER_RECEIVED,
      message: "x",
      meta: null,
      isRead: false,
      readAt: null,
      createdAt: new Date(),
    });
    prismaMock.notification.update.mockResolvedValue({
      id: "ntf_x",
      userId: "u1",
      type: NotificationType.LETTER_RECEIVED,
      message: "x",
      meta: null,
      isRead: true,
      readAt: new Date(),
      createdAt: new Date(),
    });

    const res = await markAsRead("u1", "ntf_x");
    expect(res.isRead).toBe(true);
    expect(prismaMock.notification.update).toHaveBeenCalledOnce();
    const args = prismaMock.notification.update.mock.calls[0]![0];
    expect(args.where).toEqual({ id: "ntf_x" });
    expect(args.data.isRead).toBe(true);
    expect(args.data.readAt).toBeInstanceOf(Date);
  });
});

// ============================================================
// markAllAsRead
// ============================================================
describe("markAllAsRead", () => {
  it("updateMany filtré strictement sur {userId, isRead:false}", async () => {
    prismaMock.notification.updateMany.mockResolvedValue({ count: 5 });

    const res = await markAllAsRead("u1");
    expect(res.updated).toBe(5);

    const args = prismaMock.notification.updateMany.mock.calls[0]![0];
    expect(args.where).toEqual({ userId: "u1", isRead: false });
    expect(args.data.isRead).toBe(true);
    expect(args.data.readAt).toBeInstanceOf(Date);
  });

  it("aucune notif non lue → count=0, pas d'erreur", async () => {
    prismaMock.notification.updateMany.mockResolvedValue({ count: 0 });
    const res = await markAllAsRead("u1");
    expect(res.updated).toBe(0);
  });
});

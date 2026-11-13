import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { NotificationType } from "@prisma/client";
import { prisma } from "../../src/config/prisma";
import { hashPassword } from "../../src/core/utils/hash";
import { notifyEvent } from "../../src/modules/notifications/notify.service";
import { resetPushIdempotency } from "../../src/modules/notifications/push.service";
import { listMine, unreadCount as countUnread } from "../../src/modules/notifications/notifications.service";
import { deactivateAccount } from "../../src/modules/auth/accountLifecycle.service";

/**
 * Notifications d'événements (phase 2) sur PostgreSQL : destinataires, blocages, comptes indisponibles,
 * anti-doublon en base, coalescence, compteur de non-lues, contenu du push. Expo est simulé.
 * Nécessite TEST_DATABASE_URL.
 */
const test = process.env.TEST_DATABASE_URL ? it : it.skip;
const run = Date.now() + "-" + Math.random().toString(36).slice(2, 7);
const clean = run.replace(/[^A-Za-z0-9]/g, "");
const PASSWORD = "Depart-" + run + "-Aa1";
const mk = (tag: string) => ({ id: `ne2-${tag}-${run}`, token: `ExponentPushToken[ne2${tag}${clean}]` });
const actor = mk("actor"), dest = mk("dest"), banned = mk("banned"), gone = mk("gone"), blocker = mk("blocker"), blocked = mk("blocked"), inactive = mk("inactive");
const all = [actor, dest, banned, gone, blocker, blocked, inactive];
let expo: ReturnType<typeof vi.fn>;

const pushed = () =>
  expo.mock.calls.flatMap((c) => JSON.parse((c[1] as { body: string }).body) as Array<{ to: string; title: string; body: string; data: Record<string, unknown> }>);
const flush = () => new Promise((r) => setTimeout(r, 150));
const stubExpo = () => {
  expo = vi.fn(async (_u: unknown, init: { body: string }) =>
    new Response(JSON.stringify({ data: (JSON.parse(init.body) as unknown[]).map((_, i) => ({ status: "ok", id: `tk-${run}-${i}` })) }), { status: 200 }));
  vi.stubGlobal("fetch", expo);
};
const countOf = (userId: string, type?: NotificationType) => prisma.notification.count({ where: { userId, ...(type ? { type } : {}) } });

beforeAll(async () => {
  if (!process.env.TEST_DATABASE_URL) return;
  for (const u of all) {
    await prisma.user.create({
      data: {
        id: u.id,
        email: `${u.id}@test.local`,
        passwordHash: await hashPassword(PASSWORD),
        wallet: { create: {} },
        settings: { create: {} },
        pushTokens: { create: { token: u.token, platform: "ios" } },
      },
    });
  }
  await prisma.user.update({ where: { id: banned.id }, data: { isBanned: true } });
  await prisma.block.create({ data: { fromId: blocker.id, toId: blocked.id } });
});
afterAll(async () => {
  if (!process.env.TEST_DATABASE_URL) return;
  const ids = all.map((u) => u.id);
  await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
  await prisma.pushToken.deleteMany({ where: { userId: { in: ids } } });
  await prisma.block.deleteMany({ where: { OR: [{ fromId: { in: ids } }, { toId: { in: ids } }] } });
  await prisma.loginEvent.deleteMany({ where: { email: { contains: `ne2-` } } }).catch(() => undefined);
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
});
afterEach(() => { vi.unstubAllGlobals(); resetPushIdempotency(); });

describe("création et destinataire", () => {
  test("crée une notification interne + un push générique, pour le destinataire seulement", async () => {
    stubExpo();
    const out = await notifyEvent({
      recipientId: dest.id, actorId: actor.id, type: NotificationType.DUEL_RECEIVED,
      meta: { duelId: "duel-A", texte: "contenu privé interdit" }, dedupeKey: `duel-received:A:${run}`,
    });
    expect(out.created).toBe(true);
    await flush();
    const row = await prisma.notification.findFirstOrThrow({ where: { userId: dest.id, type: "DUEL_RECEIVED" } });
    expect(row.meta).toEqual({ duelId: "duel-A" }); // clé hors liste blanche supprimée
    expect(await countOf(actor.id)).toBe(0); // l'auteur n'a rien reçu
    const p = pushed();
    expect(p).toHaveLength(1);
    expect(p[0]!.to).toBe(dest.token);
    expect(JSON.stringify(p[0])).not.toContain("contenu privé");
    expect(p[0]!.data).toMatchObject({ type: "DUEL_RECEIVED", duelId: "duel-A" });
  });

  test("jamais de notification pour sa propre action (aucune ligne, aucun push)", async () => {
    stubExpo();
    const out = await notifyEvent({ recipientId: actor.id, actorId: actor.id, type: NotificationType.BOTTLE_REPLY, meta: { bottleId: "b1" }, dedupeKey: `self:${run}` });
    expect(out).toEqual({ created: false, reason: "self" });
    await flush();
    expect(await countOf(actor.id)).toBe(0);
    expect(expo).not.toHaveBeenCalled();
  });
});

describe("comptes indisponibles et blocages", () => {
  test("destinataire banni, inexistant ou désactivé : rien (ni ligne, ni push)", async () => {
    stubExpo();
    const r1 = await notifyEvent({ recipientId: banned.id, actorId: actor.id, type: NotificationType.DUEL_RECEIVED, meta: { duelId: "d" }, dedupeKey: `ban:${run}` });
    const r2 = await notifyEvent({ recipientId: gone.id + "-inexistant", actorId: actor.id, type: NotificationType.DUEL_RECEIVED, meta: { duelId: "d" }, dedupeKey: `gone:${run}` });
    await deactivateAccount(inactive.id, PASSWORD);
    const r3 = await notifyEvent({ recipientId: inactive.id, actorId: actor.id, type: NotificationType.DUEL_RECEIVED, meta: { duelId: "d" }, dedupeKey: `inact:${run}` });
    expect([r1, r2, r3].map((r) => (r.created ? "ok" : r.reason))).toEqual(["recipient_unavailable", "recipient_unavailable", "recipient_unavailable"]);
    await flush();
    expect(await countOf(banned.id)).toBe(0);
    expect(await countOf(inactive.id)).toBe(0);
    expect(expo).not.toHaveBeenCalled();
  });

  test("blocage dans l'un OU l'autre sens : rien", async () => {
    stubExpo();
    const a = await notifyEvent({ recipientId: blocked.id, actorId: blocker.id, type: NotificationType.BOTTLE_REPLY, meta: { bottleId: "b" }, dedupeKey: `blk1:${run}` });
    const b = await notifyEvent({ recipientId: blocker.id, actorId: blocked.id, type: NotificationType.BOTTLE_REPLY, meta: { bottleId: "b" }, dedupeKey: `blk2:${run}` });
    expect(a).toEqual({ created: false, reason: "blocked" });
    expect(b).toEqual({ created: false, reason: "blocked" });
    // Événement système sans auteur : le contrôle utilise `counterpartId`.
    const c = await notifyEvent({ recipientId: blocked.id, counterpartId: blocker.id, type: NotificationType.DUEL_EXPIRED, meta: { duelId: "d" }, dedupeKey: `blk3:${run}` });
    expect(c).toEqual({ created: false, reason: "blocked" });
    await flush();
    expect(await countOf(blocker.id)).toBe(0);
    expect(await countOf(blocked.id)).toBe(0);
    expect(expo).not.toHaveBeenCalled();
  });
});

describe("anti-doublon et compteur de non-lues", () => {
  test("même événement notifié 5 fois en parallèle : 1 ligne, 1 push, compteur +1", async () => {
    stubExpo();
    const before = await countUnread(dest.id);
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        notifyEvent({ recipientId: dest.id, actorId: actor.id, type: NotificationType.DUEL_RESULT, meta: { duelId: "duel-B" }, dedupeKey: `duel-result:B:${run}` }),
      ),
    );
    expect(results.filter((r) => r.created)).toHaveLength(1);
    expect(results.filter((r) => !r.created).every((r) => !r.created && r.reason === "duplicate")).toBe(true);
    await flush();
    expect(await countOf(dest.id, "DUEL_RESULT")).toBe(1);
    expect(pushed().filter((p) => p.data.type === "DUEL_RESULT")).toHaveLength(1);
    expect(await countUnread(dest.id)).toBe(before + 1);
  });

  test("un événement distinct (autre duel) est bien notifié", async () => {
    stubExpo();
    const out = await notifyEvent({ recipientId: dest.id, actorId: actor.id, type: NotificationType.DUEL_RESULT, meta: { duelId: "duel-C" }, dedupeKey: `duel-result:C:${run}` });
    expect(out.created).toBe(true);
  });

  test("coalescence : une seule notification NON LUE par bouteille, nouvelle notif possible après lecture", async () => {
    stubExpo();
    const base = { recipientId: dest.id, actorId: actor.id, type: NotificationType.BOTTLE_REPLY, meta: { bottleId: "bt-1" }, coalesceUnread: { metaKey: "bottleId" as const, value: "bt-1" } };
    const r1 = await notifyEvent({ ...base, dedupeKey: `bottle-reply:bt-1:1:${run}` });
    const r2 = await notifyEvent({ ...base, dedupeKey: `bottle-reply:bt-1:2:${run}` });
    const other = await notifyEvent({ ...base, meta: { bottleId: "bt-2" }, coalesceUnread: { metaKey: "bottleId", value: "bt-2" }, dedupeKey: `bottle-reply:bt-2:1:${run}` });
    expect(r1.created).toBe(true);
    expect(r2).toEqual({ created: false, reason: "coalesced" });
    expect(other.created).toBe(true); // autre bouteille : indépendante
    await prisma.notification.updateMany({ where: { userId: dest.id, type: "BOTTLE_REPLY" }, data: { isRead: true } });
    const r3 = await notifyEvent({ ...base, dedupeKey: `bottle-reply:bt-1:3:${run}` });
    expect(r3.created).toBe(true);
  });

  test("les anciennes notifications (sans dedupeKey) coexistent : plusieurs lignes NULL autorisées", async () => {
    await prisma.notification.createMany({ data: [
      { userId: dest.id, type: "LETTER_RECEIVED", message: "a" },
      { userId: dest.id, type: "LETTER_RECEIVED", message: "b" },
    ] });
    expect(await countOf(dest.id, "LETTER_RECEIVED")).toBeGreaterThanOrEqual(2);
  });
});

describe("compatibilité avec l'écran « Mes notifications »", () => {
  test("la liste renvoie les nouveaux types avec leurs identifiants de routage, sans contenu privé", async () => {
    const { items } = await listMine(dest.id, { page: 1, pageSize: 50 } as never);
    const duel = items.find((n) => n.type === "DUEL_RECEIVED");
    expect(duel).toBeDefined();
    expect(duel!.meta).toEqual({ duelId: "duel-A" });
    expect(duel!.message.length).toBeGreaterThan(0);
  });
});

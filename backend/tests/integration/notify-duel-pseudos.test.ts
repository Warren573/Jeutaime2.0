import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "../../src/config/prisma";
import { hashPassword } from "../../src/core/utils/hash";
import * as duels from "../../src/modules/private-duels/private-duels.service";
import { resetPushIdempotency } from "../../src/modules/notifications/push.service";

/**
 * Notifications de duel avec le pseudo de l'ADVERSAIRE : historique ET push, les deux participants,
 * toutes les issues, blocages, repli sans pseudo. Vrais services sur PostgreSQL ; Expo simulé.
 * Nécessite TEST_DATABASE_URL.
 */
const test = process.env.TEST_DATABASE_URL ? it : it.skip;
const run = Date.now() + "-" + Math.random().toString(36).slice(2, 7);
const clean = run.replace(/[^A-Za-z0-9]/g, "");
const PASSWORD = "Depart-" + run + "-Aa1";
const id = (tag: string) => `dp-${tag}-${run}`;
const [A, B, C, D, E, F, H] = ["a", "b", "c", "d", "e", "f", "h"].map(id) as [string, string, string, string, string, string, string];
const ALL = [A, B, C, D, E, F, H];
const pseudo: Record<string, string> = {
  [A]: `Alice_${clean.slice(-8)}`, [B]: `Bastien_${clean.slice(-8)}`, [C]: `Chloe_${clean.slice(-8)}`,
  [D]: `Dora_${clean.slice(-8)}`, [E]: `Enzo_${clean.slice(-8)}`, [F]: `Fanny_${clean.slice(-8)}`,
};
const tokenOf = (u: string) => `ExponentPushToken[dp${u.replace(/[^A-Za-z0-9]/g, "").slice(0, 16)}${clean}]`;
let expo: ReturnType<typeof vi.fn>;

const sent = () =>
  expo.mock.calls.flatMap((c) => JSON.parse((c[1] as { body: string }).body) as Array<{ to: string; body: string; data: Record<string, unknown> }>);
const settle = async (n = 0) => {
  const t0 = Date.now();
  while (n > 0 && sent().length < n && Date.now() - t0 < 5000) await new Promise((r) => setTimeout(r, 50));
  await new Promise((r) => setTimeout(r, 400));
};
const notif = async (userId: string, type: string, duelId: string) =>
  (await prisma.notification.findMany({ where: { userId, type: type as never } })).filter((n) => (n.meta as { duelId?: string } | null)?.duelId === duelId);
const pushTo = (userId: string) => sent().filter((m) => m.to === tokenOf(userId));
const order = (x: string, y: string) => (x < y ? [x, y] : [y, x]) as [string, string];
const makeMatch = (x: string, y: string) => {
  const [userAId, userBId] = order(x, y);
  return prisma.match.create({ data: { userAId, userBId, initiatorId: x, status: "ACTIVE", questionsValidated: true } });
};
/** Repart d'un état sans défi en attente entre A et B (sinon `create` renvoie le défi existant sans rien notifier). */
const clearPendingAB = () =>
  prisma.privateDuel.updateMany({ where: { status: "PENDING", challengerId: A, opponentId: B }, data: { status: "CANCELLED" } });
function stubExpo() {
  expo = vi.fn(async (_u: unknown, init: { body: string }) =>
    new Response(JSON.stringify({ data: (JSON.parse(init.body) as unknown[]).map((_, i) => ({ status: "ok", id: `t-${run}-${i}` })) }), { status: 200 }));
  vi.stubGlobal("fetch", expo);
}

beforeAll(async () => {
  if (!process.env.TEST_DATABASE_URL) return;
  for (const u of ALL) {
    await prisma.user.create({
      data: {
        id: u, email: `${u}@test.local`, passwordHash: await hashPassword(PASSWORD),
        wallet: { create: {} }, settings: { create: {} },
        pushTokens: { create: { token: tokenOf(u), platform: "ios" } },
        ...(pseudo[u] ? { profile: { create: { pseudo: pseudo[u]!, birthDate: new Date("1990-01-01"), gender: "FEMME", city: "Lyon" } } } : {}),
      },
    });
  }
  await makeMatch(A, C); await makeMatch(C, B); await makeMatch(D, F); await makeMatch(F, E);
  await prisma.block.create({ data: { fromId: E, toId: D } });
});
afterAll(async () => {
  if (!process.env.TEST_DATABASE_URL) return;
  await prisma.notification.deleteMany({ where: { userId: { in: ALL } } });
  await prisma.journalEvent.deleteMany({ where: { userId: { in: ALL } } });
  await prisma.privateDuel.deleteMany({ where: { OR: [{ challengerId: { in: ALL } }, { opponentId: { in: ALL } }] } });
  await prisma.match.deleteMany({ where: { OR: [{ userAId: { in: ALL } }, { userBId: { in: ALL } }] } });
  await prisma.pushToken.deleteMany({ where: { userId: { in: ALL } } });
  await prisma.block.deleteMany({ where: { OR: [{ fromId: { in: ALL } }, { toId: { in: ALL } }] } });
  await prisma.user.deleteMany({ where: { id: { in: ALL } } });
});
afterEach(async () => {
  await new Promise((r) => setTimeout(r, 600));
  vi.unstubAllGlobals();
  resetPushIdempotency();
});

describe("défi reçu", () => {
  test("« {challenger} t'a défié(e) en duel ! » — historique et push identiques, jamais le pseudo du destinataire", async () => {
    stubExpo();
    const duel = await duels.create(A, B, C);
    await settle(1);
    const [row] = await notif(B, "DUEL_RECEIVED", duel.id);
    expect(row!.message).toBe(`${pseudo[A]} t'a défié(e) en duel !`);
    expect(row!.message).not.toContain(pseudo[B]!);
    const p = pushTo(B);
    expect(p).toHaveLength(1);
    expect(p[0]!.body).toBe(row!.message);
    expect(p[0]!.data).toEqual({ type: "DUEL_RECEIVED", duelId: duel.id }); // navigation préservée, aucun pseudo
    expect(await notif(A, "DUEL_RECEIVED", duel.id)).toHaveLength(0); // jamais l'auteur
    expect(row!.meta).toEqual({ duelId: duel.id }); // meta inchangé : pas de pseudo
  });
});

describe("résultat — les deux rôles, toutes les issues", () => {
  // [qui joue en premier (donc attend), choix du premier, choix du dernier, issue pour celui qui attend]
  const CASES: Array<[string, "A" | "B", string, string, "WIN" | "LOSE" | "DRAW"]> = [
    ["challenger attend, il gagne", "A", "ROCK", "SCISSORS", "WIN"],
    ["challenger attend, il perd", "A", "ROCK", "PAPER", "LOSE"],
    ["challenger attend, égalité", "A", "ROCK", "ROCK", "DRAW"],
    ["adversaire attend, il gagne", "B", "ROCK", "SCISSORS", "WIN"],
    ["adversaire attend, il perd", "B", "ROCK", "PAPER", "LOSE"],
    ["adversaire attend, égalité", "B", "PAPER", "PAPER", "DRAW"],
  ];
  for (const [label, firstKey, c1, c2, outcome] of CASES) {
    test(label, async () => {
      stubExpo();
      const first = firstKey === "A" ? A : B; // attend
      const last = firstKey === "A" ? B : A; // joue en dernier
      const duel = await duels.create(A, B, C);
      await duels.submitChoice(first, duel.id, c1 as never);
      await duels.submitChoice(last, duel.id, c2 as never);
      await settle(1);
      const expected =
        outcome === "WIN" ? `Tu as remporté ton duel contre ${pseudo[last]} !`
        : outcome === "LOSE" ? `${pseudo[last]} a remporté votre duel !`
        : `Match nul contre ${pseudo[last]} !`;
      const [row] = await notif(first, "DUEL_RESULT", duel.id);
      expect(row!.message).toBe(expected);
      expect(row!.message).not.toContain(pseudo[first]!); // jamais le pseudo du destinataire
      expect(pushTo(first).filter((m) => m.data["type"] === "DUEL_RESULT").map((m) => m.body)).toEqual([expected]);
      expect(pushTo(first).find((m) => m.data["type"] === "DUEL_RESULT")!.data).toEqual({ type: "DUEL_RESULT", duelId: duel.id });
      expect(await notif(last, "DUEL_RESULT", duel.id)).toHaveLength(0); // celui qui joue en dernier voit le résultat à l'écran
    });
  }
});

describe("défi décliné", () => {
  test("« {adversaire} a décliné ton défi. » → le challenger seulement", async () => {
    stubExpo();
    const duel = await duels.create(A, B, C);
    await duels.decline(B, duel.id);
    await settle(1);
    const [row] = await notif(A, "DUEL_DECLINED", duel.id);
    expect(row!.message).toBe(`${pseudo[B]} a décliné ton défi.`);
    expect(row!.message).not.toContain(pseudo[A]!);
    expect(pushTo(A).filter((m) => m.data["type"] === "DUEL_DECLINED")[0]!.body).toBe(row!.message);
    expect(await notif(B, "DUEL_DECLINED", duel.id)).toHaveLength(0);
  });
});

describe("défi expiré", () => {
  test("« Ton défi contre {l'autre} a expiré. » — chaque participant reçoit le pseudo de l'AUTRE", async () => {
    stubExpo();
    const duel = await prisma.privateDuel.create({ data: { challengerId: A, opponentId: B, commonUserId: C, expiresAt: new Date(Date.now() - 1000) } });
    await duels.expirePending(new Date());
    await settle(2);
    const [toA] = await notif(A, "DUEL_EXPIRED", duel.id);
    const [toB] = await notif(B, "DUEL_EXPIRED", duel.id);
    expect(toA!.message).toBe(`Ton défi contre ${pseudo[B]} a expiré.`);
    expect(toB!.message).toBe(`Ton défi contre ${pseudo[A]} a expiré.`);
    expect(toA!.message).not.toContain(pseudo[A]!);
    expect(toB!.message).not.toContain(pseudo[B]!);
    expect(pushTo(A).find((m) => m.data["type"] === "DUEL_EXPIRED")!.body).toBe(toA!.message);
    expect(pushTo(B).find((m) => m.data["type"] === "DUEL_EXPIRED")!.body).toBe(toB!.message);
    expect(await notif(C, "DUEL_EXPIRED", duel.id)).toHaveLength(0);
  });

  test("participant sans profil : texte générique pour son adversaire, jamais « undefined »", async () => {
    stubExpo();
    const duel = await prisma.privateDuel.create({ data: { challengerId: A, opponentId: H, expiresAt: new Date(Date.now() - 1000) } });
    await duels.expirePending(new Date());
    await settle(2);
    const [toA] = await notif(A, "DUEL_EXPIRED", duel.id);
    const [toH] = await notif(H, "DUEL_EXPIRED", duel.id);
    expect(toA!.message).toBe("Ton duel a expiré"); // l'adversaire (H) n'a pas de pseudo → texte d'avant
    expect(toH!.message).toBe(`Ton défi contre ${pseudo[A]} a expiré.`);
    for (const m of [toA!.message, toH!.message]) expect(m).not.toMatch(/undefined|null|Utilisateur/);
  });
});

describe("blocages et confidentialité", () => {
  test("blocage entre deux joueurs : aucune notification, donc aucun pseudo envoyé", async () => {
    stubExpo();
    const duel = await prisma.privateDuel.create({ data: { challengerId: D, opponentId: E, commonUserId: F, expiresAt: new Date(Date.now() - 1000) } });
    await duels.expirePending(new Date());
    await settle();
    expect(await notif(D, "DUEL_EXPIRED", duel.id)).toHaveLength(0);
    expect(await notif(E, "DUEL_EXPIRED", duel.id)).toHaveLength(0);
    expect(sent().filter((m) => m.to === tokenOf(D) || m.to === tokenOf(E))).toHaveLength(0);
  });

  test("le pseudo n'apparaît ni dans meta ni dans data du push, seulement dans le texte", async () => {
    stubExpo();
    await clearPendingAB();
    const duel = await duels.create(A, B, C);
    await settle(1);
    const [row] = await notif(B, "DUEL_RECEIVED", duel.id);
    expect(pushTo(B).length).toBeGreaterThan(0); // un push a bien été envoyé (sinon la vérification ci-dessous serait vide)
    expect(pushTo(B)[0]!.body).toContain(pseudo[A]!); // le pseudo n'est que dans le texte
    expect(JSON.stringify(row!.meta)).not.toContain(pseudo[A]!);
    expect(JSON.stringify(pushTo(B).map((m) => m.data))).not.toContain(pseudo[A]!);
    expect(row!.dedupeKey).toBe(`duel-received:${duel.id}`);
  });

  test("anti-doublon conservé : rejouer l'événement ne crée ni seconde ligne ni second push", async () => {
    stubExpo();
    await clearPendingAB();
    const duel = await duels.create(A, B, C);
    await duels.create(A, B, C); // renvoie le défi en attente
    await settle(1);
    expect(await notif(B, "DUEL_RECEIVED", duel.id)).toHaveLength(1);
    expect(pushTo(B).filter((m) => m.data["type"] === "DUEL_RECEIVED")).toHaveLength(1);
  });
});

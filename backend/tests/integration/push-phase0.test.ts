import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/config/prisma";
import { hashPassword } from "../../src/core/utils/hash";
import { sendPushToUser, resetPushDedupe } from "../../src/modules/notifications/push.service";

/**
 * Notifications push, phase 0, sur PostgreSQL : comptes bannis, formats de jetons,
 * jetons anciens conservés. Expo est simulé (aucun message réel). Nécessite TEST_DATABASE_URL.
 */
const test = process.env.TEST_DATABASE_URL ? it : it.skip;
const run = Date.now() + "-" + Math.random().toString(36).slice(2, 7);
const PASSWORD = "Depart-" + run + "-Aa1";
const mk = (tag: string) => ({ id: `pp0-${tag}-${run}`, email: `pp0-${tag}-${run}@test.local` });
const active = mk("active"), banned = mk("banned"), legacy = mk("legacy");
const TOKEN_A = `ExponentPushToken[pp0a${run.replace(/[^A-Za-z0-9]/g, "")}]`;
const TOKEN_B = `ExponentPushToken[pp0b${run.replace(/[^A-Za-z0-9]/g, "")}]`;
const TOKEN_LEGACY = `ancien-format-${run}`;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
let expo: ReturnType<typeof vi.fn>;

beforeAll(async () => {
  if (!process.env.TEST_DATABASE_URL) return;
  for (const u of [active, banned, legacy]) {
    await prisma.user.create({
      data: { id: u.id, email: u.email, passwordHash: await hashPassword(PASSWORD), wallet: { create: {} }, settings: { create: {} } },
    });
  }
  await prisma.user.update({ where: { id: banned.id }, data: { isBanned: true } });
});
afterAll(async () => {
  if (!process.env.TEST_DATABASE_URL) return;
  await prisma.pushToken.deleteMany({ where: { userId: { in: [active.id, banned.id, legacy.id] } } });
  await prisma.loginEvent.deleteMany({ where: { email: { in: [active.email, banned.email, legacy.email] } } });
  await prisma.user.deleteMany({ where: { id: { in: [active.id, banned.id, legacy.id] } } });
});
afterEach(() => { vi.unstubAllGlobals(); resetPushDedupe(); });

function stubExpo() {
  expo = vi.fn(async (_url: unknown, init: { body: string }) =>
    json({ data: (JSON.parse(init.body) as unknown[]).map((_, i) => ({ status: "ok", id: `tk-${run}-${i}` })) }));
  vi.stubGlobal("fetch", expo);
}
const payload = { title: "JeuTaime", body: "Tu as reçu une nouvelle lettre", data: { type: "LETTER_RECEIVED", matchId: "m1" } };

describe("enregistrement des appareils (HTTP)", () => {
  test("jeton au format invalide refusé (400), format Expo accepté, ancien jeton déjà en base intact", async () => {
    await prisma.pushToken.create({ data: { userId: legacy.id, token: TOKEN_LEGACY, platform: "ios" } });
    const login = await request(app).post("/api/auth/login").send({ email: active.email, password: PASSWORD });
    const auth = { Authorization: `Bearer ${login.body.data.accessToken}` };

    for (const token of ["pas-un-jeton", "", "ExponentPushToken[]", "ExponentPushToken[abc", "x".repeat(600)]) {
      const res = await request(app).post("/api/notifications/register-device").set(auth).send({ token, platform: "ios" });
      expect(res.status, token.slice(0, 20)).toBe(400);
    }
    expect(await prisma.pushToken.count({ where: { userId: active.id } })).toBe(0);

    const ok = await request(app).post("/api/notifications/register-device").set(auth).send({ token: TOKEN_A, platform: "ios" });
    expect(ok.status).toBe(201); // code historique de la route
    expect(await prisma.pushToken.count({ where: { userId: active.id, token: TOKEN_A } })).toBe(1);
    // Ré-enregistrement du même jeton : toujours une seule ligne.
    await request(app).post("/api/notifications/register-device").set(auth).send({ token: TOKEN_A, platform: "ios" });
    expect(await prisma.pushToken.count({ where: { token: TOKEN_A } })).toBe(1);

    // L'ancien jeton n'a pas été touché ; son propriétaire peut toujours le retirer.
    expect(await prisma.pushToken.count({ where: { token: TOKEN_LEGACY } })).toBe(1);
    const loginLegacy = await request(app).post("/api/auth/login").send({ email: legacy.email, password: PASSWORD });
    const out = await request(app).post("/api/notifications/unregister-device").set({ Authorization: `Bearer ${loginLegacy.body.data.accessToken}` }).send({ token: TOKEN_LEGACY });
    expect(out.status).toBe(200);
    expect(await prisma.pushToken.count({ where: { token: TOKEN_LEGACY } })).toBe(0);
  });
});

describe("envoi selon l'état du compte (base réelle)", () => {
  test("compte actif : envoyé à son jeton valide uniquement", async () => {
    stubExpo();
    await prisma.pushToken.create({ data: { userId: active.id, token: TOKEN_LEGACY + "-x", platform: "ios" } }).catch(() => undefined);
    await sendPushToUser({ userId: active.id, ...payload });
    expect(expo).toHaveBeenCalledTimes(1);
    const sent = JSON.parse(expo.mock.calls[0]![1].body as string) as Array<{ to: string }>;
    expect(sent.map((m) => m.to)).toEqual([TOKEN_A]); // le jeton au format inattendu n'est pas envoyé
    expect(await prisma.pushToken.count({ where: { userId: active.id, token: TOKEN_LEGACY + "-x" } })).toBe(1); // ni supprimé
  });

  test("compte banni : aucun appel à Expo et jetons retirés", async () => {
    stubExpo();
    await prisma.pushToken.create({ data: { userId: banned.id, token: TOKEN_B, platform: "ios" } });
    await sendPushToUser({ userId: banned.id, ...payload });
    expect(expo).not.toHaveBeenCalled();
    expect(await prisma.pushToken.count({ where: { userId: banned.id } })).toBe(0);
  });

  test("compte supprimé : aucun appel à Expo, aucune erreur", async () => {
    stubExpo();
    await expect(sendPushToUser({ userId: `inexistant-${run}`, ...payload })).resolves.toBeUndefined();
    expect(expo).not.toHaveBeenCalled();
  });

  test("DeviceNotRegistered : le jeton concerné est supprimé, l'autre appareil reste", async () => {
    const T2 = `ExponentPushToken[pp0c${run.replace(/[^A-Za-z0-9]/g, "")}]`;
    await prisma.pushToken.create({ data: { userId: active.id, token: T2, platform: "ios" } });
    expo = vi.fn(async () => json({ data: [{ status: "error", details: { error: "DeviceNotRegistered" } }, { status: "ok", id: "z" }, { status: "ok", id: "y" }] }));
    vi.stubGlobal("fetch", expo);
    const before = await prisma.pushToken.findMany({ where: { userId: active.id }, select: { token: true } });
    await sendPushToUser({ userId: active.id, ...payload });
    const sentTokens = (JSON.parse(expo.mock.calls[0]![1].body as string) as Array<{ to: string }>).map((m) => m.to);
    const invalidated = sentTokens[0]!;
    const after = await prisma.pushToken.findMany({ where: { userId: active.id }, select: { token: true } });
    expect(after.map((t) => t.token)).not.toContain(invalidated);
    expect(after.length).toBe(before.length - 1);
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../src/app";
import { prisma } from "../../src/config/prisma";
import { hashPassword } from "../../src/core/utils/hash";
import { signAccessToken, verifyAccessToken } from "../../src/core/utils/jwt";

/**
 * Identification de la session actuelle : elle est déduite du jeton d'accès SIGNÉ par le
 * serveur (champ `sid`), jamais d'une valeur choisie par le client. Nécessite TEST_DATABASE_URL.
 */
const test = process.env.TEST_DATABASE_URL ? it : it.skip;
const run = Date.now() + "-" + Math.random().toString(36).slice(2, 7);
const PASSWORD = "Depart-" + run + "-Aa1";
const a = { id: `sid-a-${run}`, email: `sid-a-${run}@test.local` };
const b = { id: `sid-b-${run}`, email: `sid-b-${run}@test.local` };

async function login(email: string, userAgent: string) {
  const res = await request(app).post("/api/auth/login").set("User-Agent", userAgent).send({ email, password: PASSWORD });
  expect(res.status).toBe(200);
  return res.body.data as { accessToken: string; refreshToken: string };
}
const sessions = (token: string, headers: Record<string, string> = {}) =>
  request(app).get("/api/auth/sessions").set("Authorization", `Bearer ${token}`).set(headers);
const activeCount = (userId: string) => prisma.refreshToken.count({ where: { userId, revokedAt: null } });

beforeAll(async () => {
  if (!process.env.TEST_DATABASE_URL) return;
  for (const u of [a, b]) {
    await prisma.user.create({
      data: { id: u.id, email: u.email, passwordHash: await hashPassword(PASSWORD), wallet: { create: {} }, settings: { create: {} } },
    });
  }
});
afterAll(async () => {
  if (!process.env.TEST_DATABASE_URL) return;
  await prisma.loginEvent.deleteMany({ where: { email: { in: [a.email, b.email] } } });
  await prisma.user.deleteMany({ where: { id: { in: [a.id, b.id] } } });
});

describe("jeton d'accès : le champ sid", () => {
  it("est signé : toute modification ou fabrication est refusée", () => {
    const token = signAccessToken({ userId: "u", role: "USER", isPremium: false, sid: "session-1" });
    expect(verifyAccessToken(token).sid).toBe("session-1");

    // Charge utile réécrite avec un autre sid, signature d'origine conservée.
    const [h, , sig] = token.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ userId: "u", role: "USER", isPremium: false, sid: "session-2" })).toString("base64url");
    expect(() => verifyAccessToken(`${h}.${forgedPayload}.${sig}`)).toThrow();

    // Jeton fabriqué avec un autre secret.
    const foreign = jwt.sign({ userId: "u", role: "USER", isPremium: false, sid: "session-2" }, "autre-secret-de-test-0123456789abcdef", { algorithm: "HS256" });
    expect(() => verifyAccessToken(foreign)).toThrow();
  });

  it("jeton sans algorithme ('none') refusé", () => {
    const none = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString("base64url")}.${Buffer.from('{"userId":"u","role":"OWNER","isPremium":true,"sid":"x"}').toString("base64url")}.`;
    expect(() => verifyAccessToken(none)).toThrow();
  });
});

describe("GET /api/auth/sessions : session actuelle déduite du serveur", () => {
  test("le sid du jeton émis à la connexion est l'identifiant de la session créée", async () => {
    const s = await login(a.email, "JeuTaime/2.0 CFNetwork/1568 Darwin/24.0");
    const sid = verifyAccessToken(s.accessToken).sid;
    expect(sid).toBeTruthy();
    const row = await prisma.refreshToken.findUnique({ where: { id: sid! } });
    expect(row).toMatchObject({ userId: a.id, userAgent: "JeuTaime/2.0 CFNetwork/1568 Darwin/24.0" });
  });

  test("exactement une session est actuelle, en tête, et c'est celle du jeton présenté", async () => {
    const phone = await login(a.email, "JeuTaime/2.0 CFNetwork/1568 Darwin/24.0");
    await login(a.email, "okhttp/4.12 Android");
    const res = await sessions(phone.accessToken);
    expect(res.status).toBe(200);
    const current = res.body.data.filter((x: { current: boolean }) => x.current);
    expect(current).toHaveLength(1);
    expect(res.body.data[0].id).toBe(current[0].id);
    expect(current[0].id).toBe(verifyAccessToken(phone.accessToken).sid);
    expect(current[0].device).toBe("iPhone ou iPad");
  });

  test("un en-tête X-Session-Id envoyé par le client est ignoré", async () => {
    const phone = await login(a.email, "JeuTaime/2.0 CFNetwork/1568 Darwin/24.0");
    const other = await prisma.refreshToken.findFirst({ where: { userId: a.id, userAgent: "okhttp/4.12 Android" } });
    const res = await sessions(phone.accessToken, { "X-Session-Id": other!.id });
    const current = res.body.data.filter((x: { current: boolean }) => x.current);
    expect(current).toHaveLength(1);
    expect(current[0].id).toBe(verifyAccessToken(phone.accessToken).sid); // pas celle de l'en-tête
    expect(current[0].id).not.toBe(other!.id);
  });

  test("la rotation du jeton de renouvellement émet un nouveau sid qui désigne la nouvelle session", async () => {
    const s = await login(a.email, "JeuTaime/2.0 CFNetwork/1568 Darwin/24.0");
    const before = verifyAccessToken(s.accessToken).sid;
    const refreshed = await request(app).post("/api/auth/refresh").set("User-Agent", "JeuTaime/2.0 CFNetwork/1568 Darwin/24.0").send({ refreshToken: s.refreshToken });
    expect(refreshed.status).toBe(200);
    const after = verifyAccessToken(refreshed.body.data.accessToken).sid;
    expect(after).toBeTruthy();
    expect(after).not.toBe(before);
    const list = await sessions(refreshed.body.data.accessToken);
    expect(list.body.data.find((x: { current: boolean }) => x.current).id).toBe(after);
    // L'ancienne session (jeton consommé) n'est plus listée.
    expect(list.body.data.some((x: { id: string }) => x.id === before)).toBe(false);
  });

  test("jeton émis avant cette évolution (sans sid) : accepté, aucune session présentée comme actuelle", async () => {
    const legacy = signAccessToken({ userId: a.id, role: "USER", isPremium: false });
    const res = await sessions(legacy);
    expect(res.status).toBe(200);
    expect(res.body.data.some((x: { current: boolean }) => x.current)).toBe(false);
  });

  test("un sid désignant la session d'un AUTRE compte ne marque rien comme actuel et n'expose rien de l'autre compte", async () => {
    await login(b.email, "okhttp/4.12 Android");
    const foreignSid = (await prisma.refreshToken.findFirst({ where: { userId: b.id } }))!.id;
    const token = signAccessToken({ userId: a.id, role: "USER", isPremium: false, sid: foreignSid });
    const res = await sessions(token);
    expect(res.status).toBe(200);
    expect(res.body.data.some((x: { current: boolean }) => x.current)).toBe(false);
    expect(res.body.data.some((x: { id: string }) => x.id === foreignSid)).toBe(false);
  });
});

describe("DELETE /api/auth/sessions/:id : garde-fou de l'appareil actuel", () => {
  test("refus de la session actuelle (rien n'est révoqué), acceptation d'une autre, jamais d'un autre compte", async () => {
    const phone = await login(a.email, "JeuTaime/2.0 CFNetwork/1568 Darwin/24.0");
    const current = verifyAccessToken(phone.accessToken).sid!;
    const auth = { Authorization: `Bearer ${phone.accessToken}` };

    const before = await activeCount(a.id);
    const refused = await request(app).delete(`/api/auth/sessions/${current}`).set(auth);
    expect(refused.status).toBe(400);
    expect(refused.body.error.message).toMatch(/appareil que tu utilises/);
    expect(await activeCount(a.id)).toBe(before);
    // Un en-tête X-Session-Id ne peut pas faire passer la session actuelle pour une autre ni l'inverse.
    const spoof = await request(app).delete(`/api/auth/sessions/${current}`).set(auth).set("X-Session-Id", "autre");
    expect(spoof.status).toBe(400);

    const other = (await prisma.refreshToken.findFirst({ where: { userId: a.id, revokedAt: null, id: { not: current } } }))!;
    const ok = await request(app).delete(`/api/auth/sessions/${other.id}`).set(auth);
    expect(ok.status).toBe(200);
    expect(await activeCount(a.id)).toBe(before - 1);

    const foreign = (await prisma.refreshToken.findFirst({ where: { userId: b.id, revokedAt: null } }))!;
    const denied = await request(app).delete(`/api/auth/sessions/${foreign.id}`).set(auth);
    expect(denied.status).toBe(404);
    expect((await prisma.refreshToken.findUnique({ where: { id: foreign.id } }))!.revokedAt).toBeNull();
  });
});

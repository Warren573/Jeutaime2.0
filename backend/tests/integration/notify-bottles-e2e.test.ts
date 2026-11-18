import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/config/prisma";
import { hashPassword } from "../../src/core/utils/hash";
import { resetPushIdempotency } from "../../src/modules/notifications/push.service";
import { getNotificationTarget } from "../../../frontend/src/utils/notifications";
import { resolvePushDestination } from "../../../frontend/src/utils/pushNavigation";

/**
 * Bouteilles à la mer, de bout en bout (vraies routes HTTP, PostgreSQL, Expo simulé) : les deux comptes
 * participants, notifications lues / non lues, conversation exacte (cloche ET push), anonymat avant dévoilement.
 * Nécessite TEST_DATABASE_URL.
 */
const test = process.env.TEST_DATABASE_URL ? it : it.skip;
const run = Date.now() + "-" + Math.random().toString(36).slice(2, 7);
const clean = run.replace(/[^A-Za-z0-9]/g, "");
const PASSWORD = "Depart-" + run + "-Aa1";
const id = (tag: string) => `bt-${tag}-${run}`;
const [S, R, T] = [id("s"), id("r"), id("t")]; // S : expéditeur, R : répondant, T : tiers
const ALL = [S, R, T];
const pseudoOf: Record<string, string> = { [S]: `Sylvie_${clean.slice(-7)}`, [R]: `Romain_${clean.slice(-7)}`, [T]: `Tiphaine_${clean.slice(-7)}` };
const tokenOf = (u: string) => `ExponentPushToken[bt${u.replace(/[^A-Za-z0-9]/g, "").slice(0, 16)}${clean}]`;
const SECRET = `confidentiel-${clean}`; // contenu des messages : ne doit jamais sortir dans une notification
const jwt: Record<string, string> = {};
let expo: ReturnType<typeof vi.fn>;

const sent = () => expo.mock.calls.flatMap((c) => JSON.parse((c[1] as { body: string }).body) as Array<{ to: string; title: string; body: string; data: Record<string, string> }>);
const to = (u: string) => sent().filter((m) => m.to === tokenOf(u));
const settle = async (n = 0) => {
  const t0 = Date.now();
  while (n > 0 && sent().length < n && Date.now() - t0 < 5000) await new Promise((r) => setTimeout(r, 50));
  await new Promise((r) => setTimeout(r, 450));
};
function stubExpo() {
  expo = vi.fn(async (_u: unknown, init: { body: string }) =>
    new Response(JSON.stringify({ data: (JSON.parse(init.body) as unknown[]).map((_, i) => ({ status: "ok", id: `t-${run}-${i}` })) }), { status: 200 }));
  // Seul Expo est simulé ; les appels HTTP de supertest vers l'application ne passent pas par `fetch`.
  vi.stubGlobal("fetch", expo);
}
const auth = (u: string) => ({ authorization: `Bearer ${jwt[u]}` });
const api = (u: string) => ({
  post: (path: string, body: object = {}) => request(app).post(`/api${path}`).set(auth(u)).send(body),
  patch: (path: string) => request(app).patch(`/api${path}`).set(auth(u)),
  get: (path: string) => request(app).get(`/api${path}`).set(auth(u)),
});
const say = (u: string, bottleId: string, content = SECRET) =>
  api(u).post(`/bottles/${bottleId}/messages`, { content, idempotencyKey: randomUUID() });
const list = async (u: string) => ((await api(u).get("/notifications?page=1&pageSize=50")).body.data as Array<{ id: string; type: string; isRead: boolean; meta: Record<string, string> | null; message: string }>);
const unread = async (u: string) => (await api(u).get("/notifications/unread-count")).body.data.count as number;
const ofType = async (u: string, type: string, bottleId: string) => (await list(u)).filter((n) => n.type === type && n.meta?.["bottleId"] === bottleId);
const newBottle = async (accepted: boolean) =>
  prisma.messageInABottle.create({
    data: {
      id: `b-${randomUUID()}`, senderId: S, message: "Message initial confidentiel", senderCity: "Lyon", targetGender: "FEMME", ageMin: 18, ageMax: 99,
      status: accepted ? "ACCEPTED" : "FLOATING", ...(accepted ? { acceptedById: R, acceptedAt: new Date() } : {}),
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    },
  });

beforeAll(async () => {
  if (!process.env.TEST_DATABASE_URL) return;
  for (const u of ALL) {
    await prisma.user.create({
      data: {
        id: u, email: `${u}@test.local`, passwordHash: await hashPassword(PASSWORD), isVerified: true,
        wallet: { create: {} }, settings: { create: {} },
        pushTokens: { create: { token: tokenOf(u), platform: "ios" } },
        profile: { create: { pseudo: pseudoOf[u]!, birthDate: new Date("1990-01-01"), gender: u === S ? "HOMME" : "FEMME", city: "Lyon" } },
      },
    });
    const res = await request(app).post("/api/auth/login").send({ email: `${u}@test.local`, password: PASSWORD });
    jwt[u] = res.body.data.accessToken;
  }
});
afterAll(async () => {
  if (!process.env.TEST_DATABASE_URL) return;
  await prisma.notification.deleteMany({ where: { userId: { in: ALL } } });
  const bottles = await prisma.messageInABottle.findMany({ where: { senderId: { in: ALL } }, select: { id: true } });
  const ids = bottles.map((b) => b.id);
  await prisma.anonymousMessage.deleteMany({ where: { bottleId: { in: ids } } });
  await prisma.bottleRevealRequest.deleteMany({ where: { bottleId: { in: ids } } });
  await prisma.bottleReceipt.deleteMany({ where: { bottleId: { in: ids } } });
  await prisma.messageInABottle.deleteMany({ where: { id: { in: ids } } });
  await prisma.match.deleteMany({ where: { OR: [{ userAId: { in: ALL } }, { userBId: { in: ALL } }] } });
  await prisma.pushToken.deleteMany({ where: { userId: { in: ALL } } });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: ALL } } }).catch(() => undefined);
  await prisma.loginEvent.deleteMany({ where: { email: { contains: `bt-` } } }).catch(() => undefined);
  await prisma.user.deleteMany({ where: { id: { in: ALL } } });
});
afterEach(async () => {
  await new Promise((r) => setTimeout(r, 600));
  vi.unstubAllGlobals();
  resetPushIdempotency();
});

describe("conversation de bouteille : les deux participants, lu / non lu", () => {
  let bottleId = "";

  test("première réponse (claim-reply) : l'expéditeur seulement ; push = type + bottleId ; ouvre SA bouteille en lecture", async () => {
    stubExpo();
    const b = await newBottle(false);
    bottleId = b.id;
    await prisma.bottleReceipt.create({ data: { bottleId, recipientId: R } });
    const res = await api(R).post(`/bottles/${bottleId}/claim-reply`, { content: SECRET, idempotencyKey: randomUUID() });
    expect(res.status).toBe(201);
    await settle(1);
    const [n] = await ofType(S, "BOTTLE_REPLY", bottleId);
    expect(n).toBeDefined();
    expect(n!.meta).toEqual({ bottleId });
    expect(n!.isRead).toBe(false);
    expect(await ofType(R, "BOTTLE_REPLY", bottleId)).toHaveLength(0); // jamais l'auteur
    // push : généralités + identifiant opaque de la conversation, rien d'autre
    const p = to(S);
    expect(p).toHaveLength(1);
    expect(p[0]!.data).toEqual({ type: "BOTTLE_REPLY", bottleId });
    // la cloche et le push mènent à la MÊME conversation, qui existe et appartient à S (R aussi, un tiers non)
    const route = `/bottles-main?bottleId=${bottleId}`;
    expect(getNotificationTarget(n as never)).toBe(route);
    expect(resolvePushDestination(p[0]!.data).route).toBe(route);
    expect((await api(S).get(`/bottles/${bottleId}`)).status).toBe(200);
    expect((await api(R).get(`/bottles/${bottleId}`)).status).toBe(200);
    expect((await api(T).get(`/bottles/${bottleId}`)).status).toBe(404);
  });

  test("message de l'autre côté : le répondant est notifié à son tour (chacun la sienne)", async () => {
    stubExpo();
    expect((await say(S, bottleId)).status).toBe(201);
    await settle(1);
    expect(await ofType(R, "BOTTLE_REPLY", bottleId)).toHaveLength(1);
    expect(to(R)[0]!.data).toEqual({ type: "BOTTLE_REPLY", bottleId });
    expect(await ofType(S, "BOTTLE_REPLY", bottleId)).toHaveLength(1); // celle de S n'a pas bougé
  });

  test("tant qu'une notification est NON LUE, les messages suivants ne la dupliquent pas", async () => {
    stubExpo();
    expect(await unread(S)).toBe(1);
    expect((await say(R, bottleId)).status).toBe(201); // S a déjà 1 non lue pour cette bouteille
    await settle();
    expect(await ofType(S, "BOTTLE_REPLY", bottleId)).toHaveLength(1);
    expect(await unread(S)).toBe(1);
    expect(to(S)).toHaveLength(0); // pas de second push
  });

  test("lue : elle reste listée, le compteur baisse, le suivant crée une nouvelle non lue", async () => {
    stubExpo();
    const [first] = await ofType(S, "BOTTLE_REPLY", bottleId);
    expect((await api(S).patch(`/notifications/${first!.id}/read`)).status).toBe(200);
    expect(await unread(S)).toBe(0);
    const afterRead = await ofType(S, "BOTTLE_REPLY", bottleId);
    expect(afterRead).toHaveLength(1);
    expect(afterRead[0]!.isRead).toBe(true);
    expect((await api(S).patch(`/notifications/${first!.id}/read`)).status).toBe(200); // idempotent
    expect(await unread(S)).toBe(0);
    expect((await say(S, bottleId)).status).toBe(201); // R écrit après S → R a déjà 1 non lue : rien de nouveau pour R
    expect((await say(R, bottleId)).status).toBe(201); // S reçoit : l'ancienne est lue → nouvelle non lue
    await settle(1);
    const all = await ofType(S, "BOTTLE_REPLY", bottleId);
    expect(all).toHaveLength(2);
    expect(all.filter((n) => !n.isRead)).toHaveLength(1);
    expect(await unread(S)).toBe(1);
    // « tout marquer comme lu »
    expect((await api(S).post("/notifications/read-all")).status).toBe(200);
    expect(await unread(S)).toBe(0);
    expect((await list(S)).every((n) => n.isRead)).toBe(true);
  });

  test("ANONYMAT : aucune notification ni aucun push ne contient d'identité, de pseudo ni de contenu", async () => {
    const forbidden = [S, R, T, pseudoOf[S]!, pseudoOf[R]!, `${S}@test.local`, `${R}@test.local`, SECRET, "Message initial confidentiel"];
    for (const u of [S, R]) {
      const rows = JSON.stringify((await api(u).get("/notifications?page=1&pageSize=50")).body);
      const other = u === S ? R : S;
      for (const leak of [other, pseudoOf[other]!, `${other}@test.local`, SECRET, "Message initial confidentiel"]) expect(rows, `liste de ${u} ⊅ ${leak}`).not.toContain(leak);
    }
    // push : seul le destinataire est nommé dans le champ « to » (jeton), jamais l'autre personne
    const alreadySent = sent(); // dernier mock seulement ; les précédents sont vérifiés test par test ci-dessus
    for (const m of alreadySent) for (const leak of [pseudoOf[S]!, pseudoOf[R]!, SECRET, "Message initial confidentiel"]) expect(JSON.stringify([m.title, m.body, m.data])).not.toContain(leak);
    // la conversation masque l'autre participant pour chacun
    for (const u of [S, R]) {
      const other = u === S ? R : S;
      const body = JSON.stringify((await api(u).get(`/bottles/${bottleId}`)).body);
      expect(body, `conversation vue par ${u}`).not.toContain(other);
      expect(body).not.toContain(pseudoOf[other]!);
    }
    expect(forbidden.length).toBeGreaterThan(0);
  });
});

describe("dévoilement : demande, refus, acceptation mutuelle", () => {
  let bottleId = "";

  test("demande → l'autre participant (conversation exacte) ; refus → le demandeur", async () => {
    stubExpo();
    const b = await newBottle(true);
    bottleId = b.id;
    await prisma.anonymousMessage.create({ data: { bottleId, senderId: R, content: SECRET, idempotencyKey: randomUUID() } });
    expect((await api(R).post(`/bottles/${bottleId}/reveal/request`)).status).toBe(200);
    await settle(1);
    const [req] = await ofType(S, "BOTTLE_REVEAL_REQUEST", bottleId);
    expect(req!.meta).toEqual({ bottleId });
    expect(await ofType(R, "BOTTLE_REVEAL_REQUEST", bottleId)).toHaveLength(0); // jamais le demandeur
    expect(to(S)[0]!.data).toEqual({ type: "BOTTLE_REVEAL_REQUEST", bottleId });
    const route = `/bottles-main?bottleId=${bottleId}`;
    expect(getNotificationTarget(req as never)).toBe(route);
    expect(resolvePushDestination(to(S)[0]!.data).route).toBe(route);

    stubExpo();
    expect((await api(S).post(`/bottles/${bottleId}/reveal/refuse`)).status).toBe(200);
    await settle(1);
    const [ref] = await ofType(R, "BOTTLE_REVEAL_REFUSED", bottleId);
    expect(ref!.meta).toEqual({ bottleId });
    expect(to(R)[0]!.data).toEqual({ type: "BOTTLE_REVEAL_REFUSED", bottleId });
    expect(getNotificationTarget(ref as never)).toBe(route);
    expect(await ofType(S, "BOTTLE_REVEAL_REFUSED", bottleId)).toHaveLength(0);
    // avant tout dévoilement mutuel : aucune correspondance, aucun matchId nulle part
    for (const u of [S, R]) expect(JSON.stringify(await list(u))).not.toContain("matchId");
  });

  test("acceptation mutuelle : seule la correspondance créée est exposée, et seulement à ce moment", async () => {
    stubExpo();
    const b = await newBottle(true);
    await prisma.anonymousMessage.create({ data: { bottleId: b.id, senderId: R, content: SECRET, idempotencyKey: randomUUID() } });
    expect((await api(R).post(`/bottles/${b.id}/reveal/request`)).status).toBe(200);
    await settle(1);
    expect(JSON.stringify(await ofType(S, "BOTTLE_REVEAL_REQUEST", b.id))).not.toContain("matchId"); // pas encore mutuel
    stubExpo();
    const acc = await api(S).post(`/bottles/${b.id}/reveal/accept`);
    expect(acc.status).toBe(200);
    await settle(1);
    const [n] = await ofType(R, "BOTTLE_REVEAL_ACCEPTED", b.id);
    expect(n).toBeDefined();
    const matchId = n!.meta!["matchId"];
    expect(matchId).toBeTruthy();
    const p = to(R).find((m) => m.data["type"] === "BOTTLE_REVEAL_ACCEPTED")!;
    expect(p.data).toEqual({ type: "BOTTLE_REVEAL_ACCEPTED", matchId }); // pas de bottleId, pas de personne
    expect(getNotificationTarget(n as never)).toBe(`/(tabs)/letters?matchId=${matchId}`);
    expect(resolvePushDestination(p.data).route).toBe(`/(tabs)/letters?matchId=${matchId}`);
    expect(await ofType(S, "BOTTLE_REVEAL_ACCEPTED", b.id)).toHaveLength(0); // jamais l'auteur
    for (const m of [p.title, p.body]) for (const leak of [pseudoOf[S]!, pseudoOf[R]!, S, R]) expect(m).not.toContain(leak);
  });
});

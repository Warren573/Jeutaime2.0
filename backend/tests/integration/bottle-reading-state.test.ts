import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/config/prisma";
import { hashPassword } from "../../src/core/utils/hash";
import { deriveReadingState } from "../../../frontend/src/utils/bottleReading";

/**
 * L'état de lecture recomposé côté application pour une bouteille précise (notification) est IDENTIQUE à celui que le
 * serveur calcule pour la bouteille courante, pour les deux participants ; avec deux correspondances en parallèle,
 * la notification ouvre la bonne et non la plus récente. Nécessite TEST_DATABASE_URL.
 */
const test = process.env.TEST_DATABASE_URL ? it : it.skip;
const run = Date.now() + "-" + Math.random().toString(36).slice(2, 7);
const clean = run.replace(/[^A-Za-z0-9]/g, "");
const PASSWORD = "Depart-" + run + "-Aa1";
const [S, R] = [`rs-s-${run}`, `rs-r-${run}`];
const ALL = [S, R];
const jwt: Record<string, string> = {};
const get = (u: string, path: string) => request(app).get(`/api${path}`).set({ authorization: `Bearer ${jwt[u]}` });
let t = Date.now() - 3_600_000;
const at = () => new Date((t += 60_000));

const bottle = (acceptedAt: Date) =>
  prisma.messageInABottle.create({
    data: { id: `rb-${randomUUID()}`, senderId: S, message: "Message initial de l'expéditeur", senderCity: "Lyon", targetGender: "FEMME", ageMin: 18, ageMax: 99,
      status: "ACCEPTED", acceptedById: R, acceptedAt, createdAt: new Date(acceptedAt.getTime() - 30_000), expiresAt: new Date(Date.now() + 30 * 86_400_000) },
  });
const say = (bottleId: string, from: string, content: string) =>
  prisma.anonymousMessage.create({ data: { bottleId, senderId: from, content, idempotencyKey: randomUUID(), createdAt: at() } });

async function derivedFor(user: string, bottleId: string) {
  const info = (await get(user, `/bottles/${bottleId}`)).body.data;
  const messages = (await get(user, `/bottles/${bottleId}/messages`)).body.data.messages;
  const current = (await get(user, "/bottles/current")).body.data;
  return { info, derived: deriveReadingState({ bottleId, status: info.status, messages, canCreateBottle: current.canCreateBottle }), current };
}

beforeAll(async () => {
  if (!process.env.TEST_DATABASE_URL) return;
  for (const u of ALL) {
    await prisma.user.create({
      data: { id: u, email: `${u}@test.local`, passwordHash: await hashPassword(PASSWORD), isVerified: true, wallet: { create: {} }, settings: { create: {} },
        profile: { create: { pseudo: `${u === S ? "Sam" : "Rita"}_${clean.slice(-8)}`, birthDate: new Date("1990-01-01"), gender: u === S ? "HOMME" : "FEMME", city: "Lyon" } } },
    });
    jwt[u] = (await request(app).post("/api/auth/login").send({ email: `${u}@test.local`, password: PASSWORD })).body.data.accessToken;
  }
});
afterAll(async () => {
  if (!process.env.TEST_DATABASE_URL) return;
  const ids = (await prisma.messageInABottle.findMany({ where: { senderId: S }, select: { id: true } })).map((b) => b.id);
  await prisma.anonymousMessage.deleteMany({ where: { bottleId: { in: ids } } });
  await prisma.messageInABottle.deleteMany({ where: { id: { in: ids } } });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: ALL } } }).catch(() => undefined);
  await prisma.loginEvent.deleteMany({ where: { email: { contains: "rs-" } } }).catch(() => undefined);
  await prisma.user.deleteMany({ where: { id: { in: ALL } } });
});

describe("état de lecture : identique au calcul du serveur (/bottles/current)", () => {
  test("à chaque tour de la conversation, pour l'expéditeur ET le répondant", async () => {
    const b = await bottle(at());
    const steps: Array<[string, () => Promise<unknown>]> = [
      ["lettre de l'expéditeur seule (rien à rompre)", async () => undefined],
      ["réponse du répondant (lettre reçue par l'expéditeur)", () => say(b.id, R, "Bonjour, ravi de te lire.")],
      ["nouveau message de l'expéditeur (lettre reçue par le répondant)", () => say(b.id, S, "Moi de même, raconte-moi.")],
      ["encore le répondant", () => say(b.id, R, "Avec plaisir, voici la suite.")],
    ];
    for (const [label, act] of steps) {
      await act();
      for (const user of [S, R]) {
        const { derived, current } = await derivedFor(user, b.id);
        expect(derived, `${label} / ${user === S ? "expéditeur" : "répondant"}`).not.toBeNull();
        expect(current.bottle.id).toBe(b.id);
        // égalité stricte avec le serveur, champ par champ
        expect(derived!.bottle).toEqual(current.bottle);
        expect(derived!.latestLetter).toEqual(current.latestLetter);
        expect({ canReply: derived!.canReply, waitingForReply: derived!.waitingForReply, canBreak: derived!.canBreak, messageCount: derived!.messageCount })
          .toEqual({ canReply: current.canReply, waitingForReply: current.waitingForReply, canBreak: current.canBreak, messageCount: current.messageCount });
      }
    }
  });
});

describe("deux correspondances en parallèle : la notification ouvre la BONNE bouteille", () => {
  test("la plus ancienne se lit avec SA lettre reçue, pas celle de la plus récente", async () => {
    const older = await bottle(at());
    await say(older.id, R, "Lettre reçue dans la bouteille ANCIENNE");
    const newer = await bottle(at());
    await say(newer.id, R, "Lettre reçue dans la bouteille RÉCENTE");

    // le serveur ne connaît que la plus récente comme « courante » : c'est la limite que l'écran de lecture corrige
    const current = (await get(S, "/bottles/current")).body.data;
    expect(current.bottle.id).toBe(newer.id);
    expect(current.latestLetter.content).toBe("Lettre reçue dans la bouteille RÉCENTE");

    const { derived } = await derivedFor(S, older.id);
    expect(derived!.bottle.id).toBe(older.id);
    expect(derived!.latestLetter!.content).toBe("Lettre reçue dans la bouteille ANCIENNE");
    expect(derived!.latestLetter!.isMine).toBe(false);
    expect(derived).toMatchObject({ canReply: true, waitingForReply: false });
  });

  test("ANONYMAT : l'état dérivé et les réponses de l'API ne contiennent aucune identité de l'autre participant", async () => {
    const b = await bottle(at());
    await say(b.id, R, "Lettre confidentielle");
    for (const [user, other] of [[S, R], [R, S]] as const) {
      const { info, derived } = await derivedFor(user, b.id);
      const messages = (await get(user, `/bottles/${b.id}/messages`)).body;
      const blob = JSON.stringify([derived, info, messages]);
      for (const leak of [other, `${other}@test.local`, `${other === S ? "Sam" : "Rita"}_${clean.slice(-8)}`]) expect(blob, `vue de ${user} ⊅ ${leak}`).not.toContain(leak);
    }
  });

  test("bouteille inaccessible à un tiers : aucune lecture possible (le repli sur la courante s'applique)", async () => {
    const b = await bottle(at());
    const stranger = `rs-t-${run}`;
    await prisma.user.create({ data: { id: stranger, email: `${stranger}@test.local`, passwordHash: await hashPassword(PASSWORD), isVerified: true, wallet: { create: {} }, settings: { create: {} } } });
    jwt[stranger] = (await request(app).post("/api/auth/login").send({ email: `${stranger}@test.local`, password: PASSWORD })).body.data.accessToken;
    expect((await get(stranger, `/bottles/${b.id}`)).status).toBe(404);
    expect((await get(stranger, `/bottles/${b.id}/messages`)).status).toBe(403);
    await prisma.refreshToken.deleteMany({ where: { userId: stranger } }).catch(() => undefined);
    await prisma.loginEvent.deleteMany({ where: { email: `${stranger}@test.local` } }).catch(() => undefined);
    await prisma.user.delete({ where: { id: stranger } });
  });
});

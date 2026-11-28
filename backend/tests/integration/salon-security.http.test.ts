import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { Role } from "@prisma/client";
import app from "../../src/app";
import { prisma } from "../../src/config/prisma";
import { signAccessToken } from "../../src/core/utils/jwt";
import { consumeOffering } from "../../src/modules/offerings/offerings.service";

/**
 * Sécurité et confidentialité des salons — parcours HTTP complets sur PostgreSQL de TEST (jamais Neon : voir
 * tests/setup/dbGuard.ts). Chaque faille identifiée par l'audit des salons a son test :
 *   1. routes d'administration ouvertes à tous (clean-test-messages, debug/*) ;
 *   2. lecture / écriture de messages sans appartenance, groupes non étanches, sessions expirées ;
 *   3. détail de session et liste des participants accessibles à tous, salons privés ;
 *   4. offrandes / tournées / consommations hors session ou entre groupes ;
 *   5. sorts et anti-sorts hors session, anti-sort par un tiers ;
 *   6. interactions entre utilisateurs bloqués ;
 *   7. aucun débit de pièces lors d'une action refusée ; prix inchangés.
 * Nécessite TEST_DATABASE_URL.
 */
const test = process.env.TEST_DATABASE_URL ? it : it.skip;
const run = Date.now() + "-" + Math.random().toString(36).slice(2, 7);
const mk = (tag: string) => `ssec-${tag}-${run}`;

const userIds: string[] = [];
const sessionIds: string[] = [];
const roles = new Map<string, Role>();
let salonId = "";
let originalSalonName = "";

async function makeUser(tag: string, opts: { role?: Role; coins?: number } = {}) {
  const id = mk(tag);
  userIds.push(id);
  roles.set(id, opts.role ?? Role.USER);
  await prisma.user.create({
    data: {
      id,
      email: `${id}@test.local`,
      passwordHash: "x",
      role: opts.role ?? Role.USER,
      isVerified: true,
      wallet: { create: { coins: opts.coins ?? 100 } },
    },
  });
  return id;
}

async function makeSession(opts: {
  members: string[];
  left?: string[];
  expired?: boolean;
  isPrivate?: boolean;
}) {
  const session = await prisma.salonSession.create({
    data: {
      salonKind: "PISCINE",
      expiresAt: new Date(Date.now() + (opts.expired ? -3_600_000 : 7 * 24 * 3_600_000)),
      isPrivate: opts.isPrivate ?? false,
      participants: {
        create: [
          ...opts.members.map((userId) => ({ userId, status: "ACTIVE" as const })),
          ...(opts.left ?? []).map((userId) => ({ userId, status: "LEFT" as const, leftAt: new Date() })),
        ],
      },
    },
  });
  sessionIds.push(session.id);
  return session.id;
}

const as = (userId: string) => ({
  Authorization: `Bearer ${signAccessToken({ userId, role: roles.get(userId) ?? Role.USER, isPremium: false })}`,
});
const coins = async (userId: string) => (await prisma.wallet.findUniqueOrThrow({ where: { userId } })).coins;
const messagesOf = (sessionId: string) => prisma.salonMessage.findMany({ where: { sessionId } });

// Acteurs
let A = "", B = "", C = "", D = "", X = "", O = "", M = "", N = "";
let P1 = "", P2 = "", PL = "", BL1 = "", BL2 = "", BL3 = "";
let ADMIN = "", OWNER = "", MOD = "";
// Sessions
let S1 = "", S2 = "", SX = "", SP = "", S3 = "";

beforeAll(async () => {
  if (!process.env.TEST_DATABASE_URL) return;
  const salon = await prisma.salon.upsert({
    where: { kind: "PISCINE" },
    update: {},
    create: { kind: "PISCINE", name: "La Piscine", isActive: true },
  });
  salonId = salon.id;
  originalSalonName = salon.name;

  // Catalogues minimaux (créés s'ils n'existent pas ; jamais modifiés ni supprimés).
  const offering = (id: string, category: "BOISSON" | "NOURRITURE", cost: number) =>
    prisma.offeringCatalog.upsert({
      where: { id },
      update: {},
      create: { id, name: id, emoji: "🍹", cost, category, durationMs: null, stackPriority: 1, enabled: true, consumptionMode: "SHARED" },
    });
  await offering("off_cafe", "BOISSON", 20);
  await offering("off_pizza", "NOURRITURE", 45);
  await offering("off_the", "BOISSON", 20);
  await prisma.magieCatalog.upsert({
    where: { id: "mag_ane" },
    update: {},
    create: { id: "mag_ane", name: "Âne", emoji: "🫏", cost: 80, durationSec: 90, type: "TRANSFORMATION", breakConditionId: "compliment", enabled: true },
  });
  await prisma.magieCatalog.upsert({
    where: { id: "mag_compliment" },
    update: {},
    create: { id: "mag_compliment", name: "Compliment", emoji: "💬", cost: 30, durationSec: 0, type: "TRANSFORMATION", enabled: true },
  });

  [A, B, C, D, X, O, M, N, P1, P2, PL, BL1, BL2, BL3] = await Promise.all(
    ["a", "b", "c", "d", "x", "o", "m", "n", "p1", "p2", "pl", "bl1", "bl2", "bl3"].map((t) => makeUser(t)),
  );
  ADMIN = await makeUser("admin", { role: Role.ADMIN });
  OWNER = await makeUser("owner", { role: Role.OWNER });
  MOD = await makeUser("mod", { role: Role.MODERATOR });

  S1 = await makeSession({ members: [A, B], left: [X] }); // groupe 1
  S2 = await makeSession({ members: [C, D] }); // groupe 2 du MÊME salon
  SX = await makeSession({ members: [M, N], expired: true }); // session expirée
  SP = await makeSession({ members: [P1, P2], left: [PL], isPrivate: true }); // salon privé
  S3 = await makeSession({ members: [BL1, BL2, BL3] }); // groupe avec deux utilisateurs bloqués
  await prisma.block.create({ data: { fromId: BL1, toId: BL2 } });
  for (const [userId, accepted] of [[P1, true], [P2, true], [PL, true]] as const) {
    await prisma.privateSalonInvitation.create({ data: { sessionId: SP, userId, invitedBy: ADMIN, accepted } });
  }
});

afterAll(async () => {
  if (!process.env.TEST_DATABASE_URL) return;
  await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
  await prisma.privateSalonInvitation.deleteMany({ where: { sessionId: { in: sessionIds } } });
  await prisma.offeringSent.deleteMany({ where: { OR: [{ fromUserId: { in: userIds } }, { toUserId: { in: userIds } }] } });
  await prisma.magieCast.deleteMany({ where: { OR: [{ fromUserId: { in: userIds } }, { toUserId: { in: userIds } }] } });
  await prisma.coinTransaction.deleteMany({ where: { walletId: { in: userIds } } });
  await prisma.salonMessage.deleteMany({ where: { sessionId: { in: sessionIds } } });
  await prisma.salonSession.deleteMany({ where: { id: { in: sessionIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

// ============================================================
// 1. Routes d'administration et de debug
// ============================================================
describe("routes d'administration des salons : rôles", () => {
  test("clean-test-messages : refusée aux utilisateurs ordinaires et aux modérateurs, autorisée à ADMIN et OWNER", async () => {
    const bait = await prisma.salonMessage.create({
      data: { salonId, sessionId: S1, userId: A, kind: "message", content: `Glouglou-${run}` },
    });
    const url = "/api/salons/admin/clean-test-messages";

    expect((await request(app).post(url)).status).toBe(401);
    for (const who of [A, MOD]) {
      expect((await request(app).post(url).set(as(who))).status).toBe(403);
    }
    // Rien n'a été supprimé par les refus.
    expect(await prisma.salonMessage.findUnique({ where: { id: bait.id } })).not.toBeNull();

    const ok = await request(app).post(url).set(as(ADMIN));
    expect(ok.status).toBe(200);
    expect(ok.body.deletedCount).toBeGreaterThanOrEqual(1);
    expect(await prisma.salonMessage.findUnique({ where: { id: bait.id } })).toBeNull();
    expect(await prisma.auditLog.count({ where: { actorId: ADMIN, action: "admin.salon.clean_test_messages" } })).toBe(1);

    expect((await request(app).post(url).set(as(OWNER))).status).toBe(200);
  });

  test("debug/salons et debug/reseed : refusées aux ordinaires et modérateurs, le salon n'est pas modifié", async () => {
    for (const [method, path] of [["get", "/api/salon-sessions/debug/salons"], ["post", "/api/salon-sessions/debug/reseed"]] as const) {
      expect((await request(app)[method](path)).status).toBe(401);
      for (const who of [A, MOD]) {
        expect((await request(app)[method](path).set(as(who))).status).toBe(403);
      }
    }
    expect((await prisma.salon.findUniqueOrThrow({ where: { id: salonId } })).name).toBe(originalSalonName);

    expect((await request(app).get("/api/salon-sessions/debug/salons").set(as(ADMIN))).status).toBe(200);
    expect((await request(app).post("/api/salon-sessions/debug/reseed").set(as(OWNER))).status).toBe(200);
  });

  test("rôles OWNER / ADMIN / MODERATOR : la gestion des salons est réservée à ADMIN (OWNER hérite), la modération des messages à ADMIN et MODERATOR", async () => {
    for (const who of [A, MOD]) {
      expect((await request(app).get("/api/admin/salons").set(as(who))).status).toBe(403);
    }
    for (const who of [ADMIN, OWNER]) {
      expect((await request(app).get("/api/admin/salons").set(as(who))).status).toBe(200);
    }
    expect((await request(app).get("/api/admin/moderation/salon-messages").set(as(A))).status).toBe(403);
    for (const who of [MOD, ADMIN, OWNER]) {
      expect((await request(app).get("/api/admin/moderation/salon-messages").set(as(who))).status).toBe(200);
    }
    // Les routes d'engagement (salons privés) restent réservées à ADMIN / OWNER.
    for (const who of [A, MOD]) {
      expect((await request(app).get("/api/admin/engagement/private-salons").set(as(who))).status).toBe(403);
    }
    expect((await request(app).get("/api/admin/engagement/private-salons").set(as(ADMIN))).status).toBe(200);
  });
});

// ============================================================
// 2. Messages : appartenance, étanchéité des groupes, sessions expirées
// ============================================================
describe("messages de salon", () => {
  test("un membre actif écrit dans SA session ; le message est rattaché à cette session", async () => {
    const res = await request(app).post(`/api/salons/${salonId}/messages`).set(as(A)).send({ content: "Bonjour groupe 1" });
    expect(res.status).toBe(200);
    expect((await messagesOf(S1)).map((m) => m.content)).toContain("Bonjour groupe 1");
  });

  test("un utilisateur sans session ne peut ni écrire (aucune ligne créée) ni lire", async () => {
    const before = await prisma.salonMessage.count({ where: { salonId } });
    const post = await request(app).post(`/api/salons/${salonId}/messages`).set(as(O)).send({ content: "intrus" });
    expect(post.status).toBe(403);
    expect(await prisma.salonMessage.count({ where: { salonId } })).toBe(before);

    expect((await request(app).get(`/api/salons/${salonId}/messages`).set(as(O))).status).toBe(403);
    expect((await request(app).get(`/api/salons/${salonId}/messages?sessionId=${S1}`).set(as(O))).status).toBe(403);
  });

  test("étanchéité : le groupe 2 ne lit pas le groupe 1 et n'écrit pas dedans", async () => {
    await request(app).post(`/api/salons/${salonId}/messages`).set(as(C)).send({ content: "secret du groupe 2" }).expect(200);

    const readOther = await request(app).get(`/api/salons/${salonId}/messages?sessionId=${S1}`).set(as(C));
    expect(readOther.status).toBe(403);
    const writeOther = await request(app).post(`/api/salons/${salonId}/messages`).set(as(C)).send({ content: "infiltration", sessionId: S1 });
    expect(writeOther.status).toBe(403);
    expect((await messagesOf(S1)).map((m) => m.content)).not.toContain("infiltration");

    // Sans sessionId, chacun ne voit que SA session (jamais « tout le salon »).
    const mineC = await request(app).get(`/api/salons/${salonId}/messages`).set(as(C));
    expect(mineC.status).toBe(200);
    const textsC = mineC.body.data.map((m: { content: string }) => m.content);
    expect(textsC).toContain("secret du groupe 2");
    expect(textsC).not.toContain("Bonjour groupe 1");
    const mineA = await request(app).get(`/api/salons/${salonId}/messages?sessionId=${S1}`).set(as(A));
    expect(mineA.body.data.map((m: { content: string }) => m.content)).not.toContain("secret du groupe 2");
  });

  test("un participant parti (LEFT) ne lit plus et n'écrit plus", async () => {
    expect((await request(app).get(`/api/salons/${salonId}/messages?sessionId=${S1}`).set(as(X))).status).toBe(403);
    expect((await request(app).post(`/api/salons/${salonId}/messages`).set(as(X)).send({ content: "revenant" })).status).toBe(403);
  });

  test("session expirée : écriture refusée (aucun message orphelin) ; non-membre toujours refusé en lecture", async () => {
    const before = await prisma.salonMessage.count({ where: { salonId } });
    expect((await request(app).post(`/api/salons/${salonId}/messages`).set(as(M)).send({ content: "après la fin" })).status).toBe(403);
    expect(await prisma.salonMessage.count({ where: { salonId } })).toBe(before);
    expect((await request(app).get(`/api/salons/${salonId}/messages?sessionId=${SX}`).set(as(O))).status).toBe(403);
    // Comportement conservé en attendant la décision produit : un membre relit sa propre session terminée.
    expect((await request(app).get(`/api/salons/${salonId}/messages?sessionId=${SX}`).set(as(M))).status).toBe(200);
  });

  test("salon privé : seuls les membres actifs lisent et écrivent ; invité parti ou étranger refusés", async () => {
    await request(app).post(`/api/salons/${salonId}/messages`).set(as(P1)).send({ content: "message privé", sessionId: SP }).expect(200);
    expect((await messagesOf(SP)).map((m) => m.content)).toContain("message privé");

    expect((await request(app).get(`/api/salons/${salonId}/messages?sessionId=${SP}`).set(as(P2))).status).toBe(200);
    for (const who of [PL, O, A]) {
      expect((await request(app).get(`/api/salons/${salonId}/messages?sessionId=${SP}`).set(as(who))).status).toBe(403);
      expect((await request(app).post(`/api/salons/${salonId}/messages`).set(as(who)).send({ content: "x", sessionId: SP })).status).toBe(403);
    }
  });

  test("blocage : les messages d'un utilisateur bloqué restent masqués (comportement conservé)", async () => {
    await request(app).post(`/api/salons/${salonId}/messages`).set(as(BL2)).send({ content: "du bloqué" }).expect(200);
    await request(app).post(`/api/salons/${salonId}/messages`).set(as(BL3)).send({ content: "du voisin" }).expect(200);
    const seen = await request(app).get(`/api/salons/${salonId}/messages?sessionId=${S3}`).set(as(BL1));
    const texts = seen.body.data.map((m: { content: string }) => m.content);
    expect(texts).toContain("du voisin");
    expect(texts).not.toContain("du bloqué");
  });
});

// ============================================================
// 3. Détail de session, participants, salons privés
// ============================================================
describe("confidentialité des sessions et des participants", () => {
  test("détail d'une session : membres seulement (publique ou privée)", async () => {
    expect((await request(app).get(`/api/salon-sessions/${S1}`).set(as(A))).status).toBe(200);
    for (const [who, session] of [[O, S1], [C, S1], [X, S1], [A, SP], [PL, SP]] as const) {
      expect((await request(app).get(`/api/salon-sessions/${session}`).set(as(who))).status).toBe(403);
    }
    expect((await request(app).get(`/api/salon-sessions/${SP}`).set(as(P1))).status).toBe(200);
  });

  test("liste des sessions actives : l'identité des participants n'est révélée qu'aux membres du groupe", async () => {
    const outsider = await request(app).get("/api/salon-sessions/active/PISCINE").set(as(O));
    expect(outsider.status).toBe(200);
    for (const s of outsider.body.data.sessions) expect(s.participants).toEqual([]);
    expect(JSON.stringify(outsider.body)).not.toContain(A);

    const memberA = await request(app).get("/api/salon-sessions/active/PISCINE").set(as(A));
    const s1 = memberA.body.data.sessions.find((s: { id: string }) => s.id === S1);
    const s2 = memberA.body.data.sessions.find((s: { id: string }) => s.id === S2);
    expect(s1.participants.map((p: { userId: string }) => p.userId).sort()).toEqual([A, B].sort());
    expect(s2.participants).toEqual([]);
    expect(s2.participantCount).toBe(2); // le nombre de places reste public (compteurs)
    // Les sessions privées n'apparaissent jamais dans la liste publique.
    expect(memberA.body.data.sessions.find((s: { id: string }) => s.id === SP)).toBeUndefined();
  });

  test("API des salons privés : participants visibles des seuls membres actifs, jamais d'e-mail", async () => {
    const ok = await request(app).get(`/api/private-salons/session/${SP}`).set(as(P1));
    expect(ok.status).toBe(200);
    expect(ok.body.data.participants).toHaveLength(2);
    expect(JSON.stringify(ok.body)).not.toContain("@test.local");

    // Invitation acceptée mais participant parti : plus d'accès. Non invité : refusé.
    expect((await request(app).get(`/api/private-salons/session/${SP}`).set(as(PL))).status).toBe(403);
    expect((await request(app).get(`/api/private-salons/session/${SP}`).set(as(O))).status).toBe(403);
  });
});

// ============================================================
// 4. Offrandes
// ============================================================
describe("offrandes de salon", () => {
  test("même session : accepté, prix conservé (boisson 5 pièces)", async () => {
    const before = await coins(A);
    const res = await request(app).post("/api/offerings/send").set(as(A)).send({ offeringId: "off_cafe", toUserId: B, salonId, sessionId: S1 });
    expect(res.status).toBe(201);
    expect(await coins(A)).toBe(before - 5);
  });

  test("autre groupe, hors session, expéditeur étranger, session expirée : refusés SANS débit", async () => {
    const cases: Array<[string, string, Record<string, unknown>, number]> = [
      [A, C, { sessionId: S1 }, 400], // cible d'un autre groupe
      [A, C, {}, 403], // sans sessionId : aucune session commune
      [A, B, { sessionId: S2 }, 403], // session d'un autre groupe
      [O, B, { sessionId: S1 }, 403], // expéditeur sans session
      [O, B, {}, 403],
      [M, N, { sessionId: SX }, 400], // session expirée
      [M, N, {}, 403],
    ];
    for (const [from, to, extra, status] of cases) {
      const before = await coins(from);
      const res = await request(app).post("/api/offerings/send").set(as(from)).send({ offeringId: "off_pizza", toUserId: to, salonId, ...extra });
      expect(res.status, JSON.stringify({ from, to, extra })).toBe(status);
      expect(await coins(from)).toBe(before);
    }
    expect(await prisma.offeringSent.count({ where: { offeringId: "off_pizza", fromUserId: { in: [A, O, M] } } })).toBe(0);
  });

  test("une offrande de salon sans salon est refusée (pas de contournement par omission du salonId)", async () => {
    const before = await coins(A);
    const res = await request(app).post("/api/offerings/send").set(as(A)).send({ offeringId: "off_pizza", toUserId: O });
    expect(res.status).toBe(403);
    expect(await coins(A)).toBe(before);
  });

  test("utilisateurs bloqués : offrande refusée dans les deux sens, sans débit", async () => {
    for (const [from, to] of [[BL1, BL2], [BL2, BL1]]) {
      const before = await coins(from);
      const res = await request(app).post("/api/offerings/send").set(as(from)).send({ offeringId: "off_cafe", toUserId: to, salonId, sessionId: S3 });
      expect(res.status).toBe(403);
      expect(await coins(from)).toBe(before);
    }
  });

  test("liste des offrandes du salon : réservée aux membres, limitée à leur session", async () => {
    const own = await request(app).get(`/api/offerings/salon/${salonId}?sessionId=${S1}`).set(as(A));
    expect(own.status).toBe(200);
    expect(own.body.data.length).toBeGreaterThanOrEqual(1);
    // Une offrande du groupe 2 n'apparaît pas dans la liste du groupe 1.
    await request(app).post("/api/offerings/send").set(as(C)).send({ offeringId: "off_pizza", toUserId: D, salonId, sessionId: S2 }).expect(201);
    const ofA = await request(app).get(`/api/offerings/salon/${salonId}?sessionId=${S1}`).set(as(A));
    expect(ofA.body.data.map((o: { fromUserId: string }) => o.fromUserId)).not.toContain(C);

    expect((await request(app).get(`/api/offerings/salon/${salonId}?sessionId=${S1}`).set(as(C))).status).toBe(403);
    expect((await request(app).get(`/api/offerings/salon/${salonId}`).set(as(O))).status).toBe(403);
  });
});

describe("tournée générale", () => {
  test("seuls les membres de la session sont servis et facturés (5 pièces chacun)", async () => {
    const before = await coins(A);
    const res = await request(app).post("/api/offerings/send-to-session").set(as(A)).send({ offeringId: "off_the", sessionId: S1 });
    expect(res.status).toBe(201);
    expect(res.body.data.count).toBeGreaterThanOrEqual(1);
    expect(res.body.data.count).toBeLessThanOrEqual(2); // A et B au maximum (B a déjà une boisson à terminer)
    expect(await coins(A)).toBe(before - 5 * res.body.data.count);
    expect(await prisma.offeringSent.count({ where: { offeringId: "off_the", toUserId: { in: [C, D] } } })).toBe(0);
  });

  test("hors session, autre groupe ou session expirée : refusée sans débit", async () => {
    for (const [who, session, status] of [[O, S1, 400], [A, S2, 400], [M, SX, 403]] as const) {
      const before = await coins(who);
      const res = await request(app).post("/api/offerings/send-to-session").set(as(who)).send({ offeringId: "off_pizza", sessionId: session });
      expect(res.status, `${who}/${session}`).toBe(status);
      expect(await coins(who)).toBe(before);
    }
  });

  test("utilisateurs bloqués : ignorés et non facturés", async () => {
    const before = await coins(BL1);
    const res = await request(app).post("/api/offerings/send-to-session").set(as(BL1)).send({ offeringId: "off_pizza", sessionId: S3 });
    expect(res.status).toBe(201);
    expect(res.body.data.count).toBe(2); // BL1 et BL3 ; BL2 (bloqué) est ignoré
    expect(await coins(BL1)).toBe(before - 2 * 10);
    expect(await prisma.offeringSent.count({ where: { toUserId: BL2, fromUserId: BL1 } })).toBe(0);
  });
});

describe("consommation (boire / manger / API consume)", () => {
  test("API consume : un autre groupe, un étranger ou un bloqué sont refusés ; le destinataire et un membre du groupe passent", async () => {
    const sent = await prisma.offeringSent.findFirstOrThrow({ where: { fromUserId: A, toUserId: B, offeringId: "off_cafe" } });
    const consume = (who: string) => request(app).post(`/api/offerings/${sent.id}/consume`).set(as(who)).send({ action: "drink" });
    expect((await consume(D)).status).toBe(403); // autre groupe du même salon
    expect((await consume(O)).status).toBe(403); // sans session
    expect((await consume(M)).status).toBe(403); // autre session (expirée)
    expect((await prisma.offeringSent.findUniqueOrThrow({ where: { id: sent.id } })).consumptionCount).toBe(0);
    expect((await consume(B)).status).toBe(200);
    expect((await consume(A)).status).toBe(200); // offrande SHARED : un membre du groupe peut la partager
    expect((await prisma.offeringSent.findUniqueOrThrow({ where: { id: sent.id } })).consumptionCount).toBe(2);
  });

  test("API consume sur une offrande de salon d'un utilisateur bloqué : refusée", async () => {
    const bl = await prisma.offeringSent.create({ data: { offeringId: "off_cafe", fromUserId: BL2, toUserId: BL3, salonId } });
    const res = await request(app).post(`/api/offerings/${bl.id}/consume`).set(as(BL1)).send({ action: "drink" });
    // BL1 est bloqué avec BL2 (expéditeur) : refusé même si BL3 (destinataire) est dans la session.
    expect(res.status).toBe(403);
  });

  test("jamais plus de 3 consommations, même en parallèle", async () => {
    const sent = await prisma.offeringSent.create({ data: { offeringId: "off_cafe", fromUserId: A, toUserId: B, salonId } });
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => consumeOffering(sent.id, B)));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(3);
    expect((await prisma.offeringSent.findUniqueOrThrow({ where: { id: sent.id } })).consumptionCount).toBe(3);
  });

  test("boire / manger : réservé aux membres actifs d'une session OUVERTE", async () => {
    expect((await request(app).post(`/api/salon-sessions/${S1}/drink`).set(as(O))).status).toBe(400);
    expect((await request(app).post(`/api/salon-sessions/${S1}/drink`).set(as(C))).status).toBe(400);
    expect((await request(app).post(`/api/salon-sessions/${SX}/drink`).set(as(M))).status).toBe(403);
    expect((await request(app).post(`/api/salon-sessions/${SX}/eat`).set(as(M))).status).toBe(403);
    expect((await request(app).post(`/api/salon-sessions/${S1}/drink`).set(as(A))).status).toBe(200);
  });

  test("boire : l'offrande d'un utilisateur bloqué n'est pas consommée", async () => {
    const blocked = await prisma.offeringSent.create({
      data: { offeringId: "off_cafe", fromUserId: BL2, toUserId: BL1, salonId, createdAt: new Date() },
    });
    const res = await request(app).post(`/api/salon-sessions/${S3}/drink`).set(as(BL1));
    expect(res.status).toBe(200);
    expect(res.body.data.offeringConsumed).toBe(false);
    expect((await prisma.offeringSent.findUniqueOrThrow({ where: { id: blocked.id } })).consumptionCount).toBe(0);
  });
});

// ============================================================
// 5. Magies
// ============================================================
describe("sorts et anti-sorts", () => {
  const cast = (who: string, body: Record<string, unknown>) =>
    request(app).post("/api/magies/cast").set(as(who)).send({ magieId: "mag_ane", ...body });

  test("même session : accepté, prix conservé (20 pièces)", async () => {
    const before = await coins(A);
    const res = await cast(A, { toUserId: B, salonId });
    expect(res.status).toBe(201);
    expect(await coins(A)).toBe(before - 20);
  });

  test("autre groupe, hors session, sans salon, session expirée : refusés SANS débit", async () => {
    const cases: Array<[string, string, Record<string, unknown>]> = [
      [A, C, { salonId }], // cible d'un autre groupe
      [O, B, { salonId }], // lanceur sans session
      [O, O, { salonId }], // auto-sort sans session
      [A, B, {}], // omission du salon
      [M, N, { salonId }], // session expirée
    ];
    for (const [from, to, extra] of cases) {
      const before = await coins(from);
      const res = await cast(from, { toUserId: to, ...extra });
      expect(res.status, JSON.stringify({ from, to, extra })).toBe(403);
      expect(await coins(from)).toBe(before);
    }
    expect(await prisma.magieCast.count({ where: { fromUserId: { in: [O, M] } } })).toBe(0);
  });

  test("utilisateurs bloqués : sort refusé dans les deux sens, sans débit", async () => {
    for (const [from, to] of [[BL1, BL2], [BL2, BL1]]) {
      const before = await coins(from);
      expect((await cast(from, { toUserId: to, salonId })).status).toBe(403);
      expect(await coins(from)).toBe(before);
    }
  });

  test("anti-sort : un autre groupe, un étranger ou un bloqué ne peuvent pas briser le sort, sans débit", async () => {
    const target = await cast(C, { toUserId: D, salonId });
    expect(target.status).toBe(201);
    const castId = target.body.data.id as string;
    const breakIt = (who: string) => request(app).post(`/api/magies/${castId}/break`).set(as(who)).send({ antiSpellId: "mag_compliment" });

    for (const who of [A, O, M]) {
      const before = await coins(who);
      expect((await breakIt(who)).status, who).toBe(403);
      expect(await coins(who)).toBe(before);
    }
    expect((await prisma.magieCast.findUniqueOrThrow({ where: { id: castId } })).brokenAt).toBeNull();

    // Le groupe concerné peut briser (prix de l'anti-sort inchangé : 30).
    const before = await coins(D);
    expect((await breakIt(D)).status).toBe(200);
    expect(await coins(D)).toBe(before - 30);
  });

  test("anti-sort entre utilisateurs bloqués : refusé sans débit", async () => {
    const sorcery = await prisma.magieCast.create({
      data: { magieId: "mag_ane", fromUserId: BL3, toUserId: BL2, salonId, expiresAt: new Date(Date.now() + 60_000) },
    });
    const before = await coins(BL1);
    const res = await request(app).post(`/api/magies/${sorcery.id}/break`).set(as(BL1)).send({ antiSpellId: "mag_compliment" });
    expect(res.status).toBe(403);
    expect(await coins(BL1)).toBe(before);
  });

  test("liste des sorts du salon : membres seulement, limitée à leur groupe", async () => {
    await cast(A, { toUserId: A, salonId }); // sort visible du groupe 1
    const forA = await request(app).get(`/api/magies/salon/${salonId}`).set(as(A));
    expect(forA.status).toBe(200);
    const targets = forA.body.data.map((m: { toUserId: string }) => m.toUserId);
    expect(targets).toContain(B);
    expect(targets).not.toContain(C);
    expect(targets).not.toContain(D);
    expect((await request(app).get(`/api/magies/salon/${salonId}`).set(as(O))).status).toBe(403);
  });

  test("sorts actifs d'un utilisateur : soi-même ou un membre de sa session, jamais un inconnu ou un autre groupe", async () => {
    expect((await request(app).get(`/api/magies/active/${A}`).set(as(A))).status).toBe(200);
    expect((await request(app).get(`/api/magies/active/${B}`).set(as(A))).status).toBe(200);
    expect((await request(app).get(`/api/magies/active/${C}`).set(as(A))).status).toBe(403);
    expect((await request(app).get(`/api/magies/active/${B}`).set(as(O))).status).toBe(403);
  });
});

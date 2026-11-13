import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "../../src/config/prisma";
import { hashPassword } from "../../src/core/utils/hash";
import * as duels from "../../src/modules/private-duels/private-duels.service";
import * as questions from "../../src/modules/matches/questions.service";
import { updateReport } from "../../src/modules/admin/reports/adminReports.service";
import { unbanUser } from "../../src/modules/admin/users/adminUsers.service";
import { resetPushIdempotency } from "../../src/modules/notifications/push.service";

/**
 * Événements réellement produits par les fonctionnalités existantes (duels, 3 questions, modération),
 * exécutés avec les VRAIS services sur PostgreSQL : qui reçoit quoi, jamais l'auteur, pas de doublon,
 * blocage respecté. Expo est simulé. Nécessite TEST_DATABASE_URL.
 */
const test = process.env.TEST_DATABASE_URL ? it : it.skip;
const run = Date.now() + "-" + Math.random().toString(36).slice(2, 7);
const clean = run.replace(/[^A-Za-z0-9]/g, "");
const PASSWORD = "Depart-" + run + "-Aa1";
const mkId = (tag: string) => `nh2-${tag}-${run}`;
const A = mkId("a"), B = mkId("b"), C = mkId("c"), D = mkId("d"), E = mkId("e"), F = mkId("f"), ADMIN = mkId("admin"), REPORTER = mkId("rep"), TARGET = mkId("tgt");
const ALL = [A, B, C, D, E, F, ADMIN, REPORTER, TARGET];
const tokenOf = (id: string) => `ExponentPushToken[nh2${id.replace(/[^A-Za-z0-9]/g, "").slice(0, 18)}${clean}]`;
let expo: ReturnType<typeof vi.fn>;
const flush = () => new Promise((r) => setTimeout(r, 250));
const mine = (userId: string, type?: string) => prisma.notification.findMany({ where: { userId, ...(type ? { type: type as never } : {}) }, orderBy: { createdAt: "asc" } });
const pushedTo = () => expo.mock.calls.flatMap((c) => JSON.parse((c[1] as { body: string }).body) as Array<{ to: string; data: Record<string, unknown> }>).map((m) => m.to);
const order = (x: string, y: string) => (x < y ? [x, y] : [y, x]) as [string, string];

async function makeMatch(x: string, y: string, validated = true) {
  const [userAId, userBId] = order(x, y);
  return prisma.match.create({ data: { userAId, userBId, initiatorId: x, status: "ACTIVE", questionsValidated: validated } });
}

beforeAll(async () => {
  if (!process.env.TEST_DATABASE_URL) return;
  for (const id of ALL) {
    await prisma.user.create({
      data: {
        id, email: `${id}@test.local`, passwordHash: await hashPassword(PASSWORD),
        role: id === ADMIN ? "ADMIN" : "USER",
        wallet: { create: {} }, settings: { create: {} },
        pushTokens: { create: { token: tokenOf(id), platform: "ios" } },
        profile: { create: { pseudo: `p_${id.replace(/-/g, "_")}`.slice(0, 40), birthDate: new Date("1990-01-01"), gender: "FEMME", city: "Lyon" } },
      },
    });
  }
  // Chaîne de duel : A — C — B (A et B ne se connaissent pas) ; D — F — E avec blocage D↔E.
  await makeMatch(A, C); await makeMatch(C, B);
  await makeMatch(D, F); await makeMatch(F, E);
  await prisma.block.create({ data: { fromId: E, toId: D } });
});
afterAll(async () => {
  if (!process.env.TEST_DATABASE_URL) return;
  await prisma.notification.deleteMany({ where: { userId: { in: ALL } } });
  await prisma.journalEvent.deleteMany({ where: { userId: { in: ALL } } });
  await prisma.privateDuel.deleteMany({ where: { OR: [{ challengerId: { in: ALL } }, { opponentId: { in: ALL } }] } });
  await prisma.matchQuestionAttempt.deleteMany({ where: { responderId: { in: ALL } } });
  await prisma.match.deleteMany({ where: { OR: [{ userAId: { in: ALL } }, { userBId: { in: ALL } }] } });
  await prisma.report.deleteMany({ where: { reporterId: { in: ALL } } });
  await prisma.auditLog?.deleteMany?.({ where: { actorId: ADMIN } }).catch(() => undefined);
  await prisma.pushToken.deleteMany({ where: { userId: { in: ALL } } });
  await prisma.block.deleteMany({ where: { OR: [{ fromId: { in: ALL } }, { toId: { in: ALL } }] } });
  await prisma.user.deleteMany({ where: { id: { in: ALL } } });
});
afterEach(() => { vi.unstubAllGlobals(); resetPushIdempotency(); });
function stubExpo() {
  expo = vi.fn(async (_u: unknown, init: { body: string }) =>
    new Response(JSON.stringify({ data: (JSON.parse(init.body) as unknown[]).map((_, i) => ({ status: "ok", id: `t-${run}-${i}` })) }), { status: 200 }));
  vi.stubGlobal("fetch", expo);
}

describe("duels", () => {
  test("défi reçu → l'adversaire seulement ; un défi déjà en attente ne renotifie pas ; push générique", async () => {
    stubExpo();
    const duel = await duels.create(A, B, C);
    await flush();
    const got = await mine(B, "DUEL_RECEIVED");
    expect(got).toHaveLength(1);
    expect(got[0]!.meta).toEqual({ duelId: duel.id });
    expect(await mine(A)).toHaveLength(0); // l'auteur
    expect(await mine(C)).toHaveLength(0); // la personne en commun n'est pas concernée
    expect(pushedTo()).toEqual([tokenOf(B)]);
    await duels.create(A, B, C); // rejeu : renvoie le défi en attente
    await flush();
    expect(await mine(B, "DUEL_RECEIVED")).toHaveLength(1);
  });

  test("résultat → seule la personne qui attendait est prévenue (jamais l'auteur du dernier choix), une fois", async () => {
    const pending = await prisma.privateDuel.findFirstOrThrow({ where: { challengerId: A, opponentId: B, status: "PENDING" } });
    await duels.submitChoice(A, pending.id, "ROCK" as never);
    await flush();
    expect(await mine(A, "DUEL_RESULT")).toHaveLength(0); // premier choix : rien
    expect(await mine(B, "DUEL_RESULT")).toHaveLength(0);
    await duels.submitChoice(B, pending.id, "SCISSORS" as never); // B joue en dernier → A attendait
    await flush();
    const a = await mine(A, "DUEL_RESULT");
    expect(a).toHaveLength(1);
    expect(a[0]!.meta).toEqual({ duelId: pending.id });
    expect(await mine(B, "DUEL_RESULT")).toHaveLength(0);
    await expect(duels.submitChoice(B, pending.id, "ROCK" as never)).rejects.toBeTruthy(); // rejeu refusé
    await flush();
    expect(await mine(A, "DUEL_RESULT")).toHaveLength(1);
  });

  test("défi décliné → le challenger seulement", async () => {
    const duel = await duels.create(A, B, C);
    await duels.decline(B, duel.id);
    await flush();
    const a = await mine(A, "DUEL_DECLINED");
    expect(a).toHaveLength(1);
    expect(a[0]!.meta).toEqual({ duelId: duel.id });
    expect(await mine(B, "DUEL_DECLINED")).toHaveLength(0);
  });

  test("expiration → les deux participants, une fois ; relance du job sans doublon", async () => {
    const [x, y] = [A, B];
    const duel = await prisma.privateDuel.create({ data: { challengerId: x, opponentId: y, commonUserId: C, expiresAt: new Date(Date.now() - 1000) } });
    expect(await duels.expirePending(new Date())).toBeGreaterThanOrEqual(1);
    await flush();
    for (const u of [x, y]) {
      const n = (await mine(u, "DUEL_EXPIRED")).filter((r) => (r.meta as { duelId?: string } | null)?.duelId === duel.id);
      expect(n, u).toHaveLength(1);
    }
    await duels.expirePending(new Date());
    await flush();
    for (const u of [x, y]) {
      expect((await mine(u, "DUEL_EXPIRED")).filter((r) => (r.meta as { duelId?: string } | null)?.duelId === duel.id), u).toHaveLength(1);
    }
    expect(await mine(C, "DUEL_EXPIRED")).toHaveLength(0);
  });

  test("blocage : ni défi reçu ni expiration entre deux personnes bloquées", async () => {
    // D défie E : chemin valide en base, mais E a bloqué D.
    const duel = await prisma.privateDuel.create({ data: { challengerId: D, opponentId: E, commonUserId: F, expiresAt: new Date(Date.now() - 1000) } });
    await duels.expirePending(new Date());
    await flush();
    expect((await mine(D, "DUEL_EXPIRED")).filter((r) => (r.meta as { duelId?: string } | null)?.duelId === duel.id)).toHaveLength(0);
    expect((await mine(E, "DUEL_EXPIRED")).filter((r) => (r.meta as { duelId?: string } | null)?.duelId === duel.id)).toHaveLength(0);
  });
});

describe("jeu des 3 questions", () => {
  test("le premier joueur qui répond → l'AUTRE doit répondre (action requise), jamais lui-même, une seule fois", async () => {
    const m = await makeMatch(A, E, false);
    const profiles = await prisma.profile.findMany({ where: { userId: { in: [A, E] } }, select: { id: true, userId: true } });
    const qs: Record<string, string[]> = {};
    for (const p of profiles) {
      qs[p.userId] = [];
      for (let i = 1; i <= 3; i++) {
        const q = await prisma.profileQuestion.create({ data: { profileId: p.id, questionId: `q${i}-${run}`, questionText: `Question ${i}`, answer: `rep${i}`, wrongAnswers: ["x", "y"] } });
        qs[p.userId]!.push(q.id);
      }
    }
    const answersFor = (ids: string[]) => ({ answers: ids.map((id, i) => ({ profileQuestionId: id, answer: `rep${i + 1}` })) });
    stubExpo();
    await questions.submitMatchAnswers(m.id, A, answersFor(qs[E]!));
    await flush();
    const turn = await mine(E, "QUESTIONS_TURN");
    expect(turn).toHaveLength(1);
    expect(turn[0]!.meta).toEqual({ matchId: m.id });
    expect(await mine(A, "QUESTIONS_TURN")).toHaveLength(0);
    expect(pushedTo().filter((t) => t === tokenOf(E))).toHaveLength(1);
    await expect(questions.submitMatchAnswers(m.id, A, answersFor(qs[E]!))).rejects.toBeTruthy(); // rejeu refusé
    await flush();
    expect(await mine(E, "QUESTIONS_TURN")).toHaveLength(1);
    // Le second joueur finalise : résultat (existant) pour les deux, pas de nouveau « à toi de répondre ».
    await questions.submitMatchAnswers(m.id, E, answersFor(qs[A]!));
    await flush();
    expect(await mine(A, "QUESTIONS_TURN")).toHaveLength(0);
    expect(await mine(E, "QUESTIONS_TURN")).toHaveLength(1);
    expect(await mine(A, "QUESTIONS_PASSED")).toHaveLength(1);
    expect(await mine(E, "QUESTIONS_PASSED")).toHaveLength(1);
  });
});

describe("modération", () => {
  test("décision sur un signalement → la personne qui a signalé, sans détail ; statut intermédiaire = rien ; une fois", async () => {
    const report = await prisma.report.create({ data: { reporterId: REPORTER, targetId: TARGET, reason: "SPAM", details: "détail confidentiel" } });
    await updateReport(ADMIN, report.id, { status: "REVIEWING" } as never);
    await flush();
    expect(await mine(REPORTER, "REPORT_PROCESSED")).toHaveLength(0);
    await updateReport(ADMIN, report.id, { status: "ACTIONED", resolution: "sanction confidentielle" } as never);
    await flush();
    const n = await mine(REPORTER, "REPORT_PROCESSED");
    expect(n).toHaveLength(1);
    expect(n[0]!.meta).toEqual({ reportId: report.id });
    expect(JSON.stringify(n[0])).not.toMatch(/confidentiel|SPAM/);
    expect(await mine(TARGET)).toHaveLength(0); // la personne signalée n'est jamais informée
    expect(await mine(ADMIN)).toHaveLength(0);
  });

  test("compte rétabli → notification interne seulement pour le compte concerné ; idempotent si déjà actif", async () => {
    await prisma.user.update({ where: { id: TARGET }, data: { isBanned: true, banReason: "test" } });
    await unbanUser({ id: ADMIN, role: "ADMIN" }, TARGET);
    await flush();
    expect(await mine(TARGET, "ACCOUNT_RESTORED")).toHaveLength(1);
    await unbanUser({ id: ADMIN, role: "ADMIN" }, TARGET); // déjà actif : aucun effet
    await flush();
    expect(await mine(TARGET, "ACCOUNT_RESTORED")).toHaveLength(1);
    expect(await mine(ADMIN)).toHaveLength(0);
  });
});

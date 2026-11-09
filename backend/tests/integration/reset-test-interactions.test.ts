/**
 * INTEGRATION — scripts/reset-test-interactions.js
 *
 * À lancer UNIQUEMENT sur une base PostgreSQL locale et jetable :
 *   RESET_SCRIPT_TEST_DATABASE_URL=postgresql://...@127.0.0.1:5432/db \
 *     npx vitest run tests/integration/reset-test-interactions.test.ts
 *
 * Sans cette variable, ou si l'hôte n'est pas local, les tests sont ignorés.
 * Interactions mixtes entre comptes de test et comptes réels : rien qui
 * concerne un compte réel ne doit être supprimé ni modifié.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const reset = require("../../scripts/reset-test-interactions.js");

const DB_URL = process.env.RESET_SCRIPT_TEST_DATABASE_URL || "";
const isLocal = (() => {
  try {
    const h = new URL(DB_URL).hostname;
    return h === "127.0.0.1" || h === "localhost";
  } catch {
    return false;
  }
})();
const ENABLED = !!DB_URL && isLocal;

describe.skipIf(!ENABLED)("reset-test-interactions (base locale jetable)", () => {
  const prisma = new PrismaClient({ datasources: { db: { url: DB_URL } } });
  const run = Math.random().toString(36).slice(2, 8);
  const id = (k: string) => `rti-${run}-${k}`;
  // Comptes de test
  const T1 = id("T1"), T2 = id("T2"), T3 = id("T3"), T4 = id("T4");
  // Utilisateurs réels (R2 ressemble à un compte de test mais n'en est pas un)
  const R1 = id("R1"), R2 = id("R2");
  const future = new Date(Date.now() + 30 * 24 * 3600 * 1000);

  const user = (uid: string, email: string) =>
    prisma.user.create({ data: { id: uid, email, passwordHash: "x" } as any });
  const bottle = (bid: string, senderId: string, extra: Record<string, unknown> = {}) =>
    prisma.messageInABottle.create({
      data: { id: bid, senderId, message: "m", senderCity: "Lyon", targetGender: "FEMME", ageMin: 18, ageMax: 99, expiresAt: future, ...extra } as any,
    });
  const match = (mid: string, a: string, b: string) => {
    const [x, y] = a < b ? [a, b] : [b, a];
    return prisma.match.create({ data: { id: mid, userAId: x, userBId: y, initiatorId: a } });
  };
  const refuge = (sid: string, adopteId: string, adoptantId: string | null) =>
    prisma.refugeSession.create({
      data: { id: sid, adopteId, adoptantId, animalType: "CHAT", animalCategory: "SIMPLE", animalSexe: "MALE", animalAgeMonths: 12, acceptedSexe: "HOMME_FEMME" } as any,
    });

  // Éléments qui doivent disparaître / rester, par table
  const expectDeleted = {
    reaction: [id("rx1")],
    match: [id("m1"), id("m4")],
    letter: [id("l1a"), id("l1b")],
    matchQuestionAttempt: [id("q1a"), id("q1b")],
    messageInABottle: [id("b1"), id("b3"), id("b6")],
    bottleReceipt: [id("rc1"), id("rc3")],
    anonymousMessage: [id("am3a"), id("am3b")],
    bottleRevealRequest: [id("rv3")],
    refugeSession: [id("s1"), id("s4")],
    refugeDailyChoice: [id("dc1")],
    refugeGuess: [id("g1")],
    refugeDayResult: [id("dr1")],
  } as const;
  const expectKept = {
    reaction: [id("rx2"), id("rx3"), id("rx4")],
    match: [id("m2"), id("m3"), id("m5")],
    letter: [id("l2")],
    matchQuestionAttempt: [id("q3")],
    messageInABottle: [id("b2"), id("b4"), id("b5"), id("b7")],
    bottleReceipt: [id("rc2"), id("rc4"), id("rc5"), id("rc7")],
    anonymousMessage: [id("am4")],
    bottleRevealRequest: [] as string[],
    refugeSession: [id("s2"), id("s3")],
    refugeDailyChoice: [id("dc2")],
    refugeGuess: [] as string[],
    refugeDayResult: [] as string[],
    user: [T1, T2, T3, T4, R1, R2],
  };

  async function existing(model: string, ids: readonly string[]) {
    if (ids.length === 0) return [];
    const rows = await (prisma as any)[model].findMany({ where: { id: { in: [...ids] } }, select: { id: true } });
    return rows.map((r: { id: string }) => r.id).sort();
  }

  beforeAll(async () => {
    await user(T1, `${id("t1")}@jeutaime.test`);
    await user(T2, `${id("t2")}@jeutaime.test`);
    await user(T3, `${id("t3")}@JEUTAIME.TEST`);
    await user(T4, `${id("t4")}@jeutaime.test`);
    await user(R1, `${id("r1")}@example.com`);
    await user(R2, `${id("r2")}@jeutaime.test.example.com`);

    // ── Sourires
    await prisma.reaction.createMany({ data: [
      { id: id("rx1"), fromId: T1, toId: T2, type: "SMILE" },
      { id: id("rx2"), fromId: T1, toId: R1, type: "SMILE" },
      { id: id("rx3"), fromId: R1, toId: T2, type: "GRIMACE" },
      { id: id("rx4"), fromId: R2, toId: T3, type: "SMILE" },
    ] as any });

    // ── Matchs
    await match(id("m1"), T1, T2); // test ↔ test, lettres + questions
    await prisma.letter.createMany({ data: [
      { id: id("l1a"), matchId: id("m1"), fromUserId: T1, toUserId: T2, content: "a" },
      { id: id("l1b"), matchId: id("m1"), fromUserId: T2, toUserId: T1, content: "b" },
    ] as any });
    await prisma.matchQuestionAttempt.createMany({ data: [
      { id: id("q1a"), matchId: id("m1"), responderId: T1, questionId: "q", submittedAnswer: "x", isCorrect: true },
      { id: id("q1b"), matchId: id("m1"), responderId: T2, questionId: "q", submittedAnswer: "x", isCorrect: true },
    ] as any });
    await match(id("m2"), T1, R1); // avec un réel
    await prisma.letter.create({ data: { id: id("l2"), matchId: id("m2"), fromUserId: T1, toUserId: R1, content: "c" } as any });
    await match(id("m3"), T1, T3); // test ↔ test mais une réponse d'un réel est rattachée
    await prisma.matchQuestionAttempt.create({ data: { id: id("q3"), matchId: id("m3"), responderId: R1, questionId: "q", submittedAnswer: "x", isCorrect: false } as any });
    await match(id("m4"), T2, T3); // test ↔ test + bouteille de test rattachée (b6, supprimable)
    await match(id("m5"), T1, T4); // test ↔ test + bouteille rattachée NON supprimable (b7)

    // ── Bouteilles
    await bottle(id("b1"), T1); // de test, sans réponse, distribuée à un compte de test
    await prisma.bottleReceipt.create({ data: { id: id("rc1"), bottleId: id("b1"), recipientId: T2, status: "PENDING" } as any });
    await bottle(id("b2"), T1); // de test, SANS RÉPONSE, distribuée à un UTILISATEUR RÉEL
    await prisma.bottleReceipt.create({ data: { id: id("rc2"), bottleId: id("b2"), recipientId: R1, status: "PENDING" } as any });
    await bottle(id("b3"), T1, { acceptedById: T2, status: "ACCEPTED" }); // test ↔ test complète
    await prisma.bottleReceipt.create({ data: { id: id("rc3"), bottleId: id("b3"), recipientId: T2, status: "TAKEN" } as any });
    await prisma.anonymousMessage.createMany({ data: [
      { id: id("am3a"), bottleId: id("b3"), senderId: T1, content: "x" },
      { id: id("am3b"), bottleId: id("b3"), senderId: T2, content: "y" },
    ] as any });
    await prisma.bottleRevealRequest.create({ data: { id: id("rv3"), bottleId: id("b3"), requestedById: T1, respondentId: T2 } as any });
    await bottle(id("b4"), T1, { acceptedById: T2, status: "ACCEPTED" }); // de test, mais refusée par un réel (R2)
    await prisma.bottleReceipt.create({ data: { id: id("rc4"), bottleId: id("b4"), recipientId: R2, status: "REFUSED" } as any });
    await prisma.anonymousMessage.create({ data: { id: id("am4"), bottleId: id("b4"), senderId: T1, content: "z" } as any });
    await bottle(id("b5"), R1); // d'un réel, reçue par un compte de test
    await prisma.bottleReceipt.create({ data: { id: id("rc5"), bottleId: id("b5"), recipientId: T1, status: "PENDING" } as any });
    await bottle(id("b6"), T2, { acceptedById: T3, status: "ACCEPTED", matchId: id("m4") });
    await bottle(id("b7"), T1, { acceptedById: T4, status: "ACCEPTED", matchId: id("m5") });
    await prisma.bottleReceipt.create({ data: { id: id("rc7"), bottleId: id("b7"), recipientId: R1, status: "PENDING" } as any });

    // ── Refuge
    await refuge(id("s1"), T1, T2);
    await prisma.refugeDailyChoice.create({ data: { id: id("dc1"), refugeSessionId: id("s1"), dayNumber: 1, action1: "NOURRIR", action2: "JOUER" } as any });
    await prisma.refugeGuess.create({ data: { id: id("g1"), refugeSessionId: id("s1"), dayNumber: 1, guessedAction1: "NOURRIR", guessedAction2: "JOUER" } as any });
    await prisma.refugeDayResult.create({ data: { id: id("dr1"), refugeSessionId: id("s1"), dayNumber: 1, status: "PERFECT", adopteCoinsDelta: 0, adoptantCoinsDelta: 0 } as any });
    await refuge(id("s2"), T2, R1); // adoptant réel
    await prisma.refugeDailyChoice.create({ data: { id: id("dc2"), refugeSessionId: id("s2"), dayNumber: 1, action1: "LAVER", action2: "JOUER" } as any });
    await refuge(id("s3"), R1, T3); // adopté réel
    await refuge(id("s4"), T4, null); // test, sans adoptant
  }, 60000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("reconnaît uniquement les e-mails de test", () => {
    expect(reset.isTestEmail("a@jeutaime.test")).toBe(true);
    expect(reset.isTestEmail("A@JEUTAIME.TEST")).toBe(true);
    expect(reset.isTestEmail("test@jeutaime.com")).toBe(true);
    expect(reset.isTestEmail("x@jeutaime.test.example.com")).toBe(false);
    expect(reset.isTestEmail("other@jeutaime.com")).toBe(false);
  });

  it("aperçu : prévoit exactement les bonnes suppressions et compte les exclusions, sans rien supprimer", async () => {
    const plan = await reset.buildPlan(prisma);
    const has = (arr: string[], ids: readonly string[]) => ids.every((x) => arr.includes(x));
    const none = (arr: string[], ids: readonly string[]) => ids.every((x) => !arr.includes(x));
    expect(has(plan.delete.reactions, expectDeleted.reaction)).toBe(true);
    expect(none(plan.delete.reactions, expectKept.reaction)).toBe(true);
    expect(has(plan.delete.matches, expectDeleted.match)).toBe(true);
    expect(none(plan.delete.matches, expectKept.match)).toBe(true);
    expect(has(plan.delete.bottles, expectDeleted.messageInABottle)).toBe(true);
    expect(none(plan.delete.bottles, expectKept.messageInABottle)).toBe(true);
    expect(none(plan.delete.receipts, expectKept.bottleReceipt)).toBe(true);
    expect(has(plan.delete.refugeSessions, expectDeleted.refugeSession)).toBe(true);
    expect(none(plan.delete.refugeSessions, expectKept.refugeSession)).toBe(true);
    // Exclusions visibles dans l'aperçu
    expect(plan.excluded.reactions).toBeGreaterThanOrEqual(3);
    expect(plan.excluded.matches).toBeGreaterThanOrEqual(3);
    expect(plan.excluded.bottles).toBeGreaterThanOrEqual(3); // b2 (sans réponse, réel), b4, b7
    expect(plan.excluded.bottleReceiptsOfTestUsersOnRealBottles).toBeGreaterThanOrEqual(1); // rc5
    expect(plan.excluded.refugeSessions).toBeGreaterThanOrEqual(2);
    // L'aperçu n'a rien supprimé
    for (const [model, ids] of Object.entries(expectDeleted)) {
      expect(await existing(model, ids)).toEqual([...ids].sort());
    }
  });

  it("--confirm avec un code faux ou absent : refuse et ne supprime rien", async () => {
    await expect(reset.executeReset(prisma, "MAUVAISCODE")).rejects.toThrow(/plan a changé/);
    await expect(reset.executeReset(prisma, "")).rejects.toThrow();
    for (const [model, ids] of Object.entries(expectDeleted)) {
      expect(await existing(model, ids)).toEqual([...ids].sort());
    }
  });

  it("--confirm : si un utilisateur réel reçoit une bouteille après l'aperçu, refuse sans suppression partielle", async () => {
    const code = reset.planCode(await reset.buildPlan(prisma));
    // Entre l'aperçu et la confirmation, b1 (de test) est distribuée à un réel.
    await prisma.bottleReceipt.create({ data: { id: id("rcLate"), bottleId: id("b1"), recipientId: R1, status: "PENDING" } as any });
    await expect(reset.executeReset(prisma, code)).rejects.toThrow(/plan a changé/);
    for (const [model, ids] of Object.entries(expectDeleted)) {
      expect(await existing(model, ids)).toEqual([...ids].sort());
    }
    await prisma.bottleReceipt.delete({ where: { id: id("rcLate") } });
  });

  it("--confirm avec le bon code : supprime exactement le plan, ne touche à rien d'un utilisateur réel", async () => {
    const plan = await reset.buildPlan(prisma);
    const code = reset.planCode(plan);
    const before = await reset.realUsersFingerprint(prisma, [T1, T2, T3, T4]);
    const usersBefore = await prisma.user.count();
    const bottle5Before = await prisma.messageInABottle.findUnique({ where: { id: id("b5") } });
    const bottle7Before = await prisma.messageInABottle.findUnique({ where: { id: id("b7") } });

    const res = await reset.executeReset(prisma, code);
    expect(res.code).toBe(code);

    for (const [model, ids] of Object.entries(expectDeleted)) {
      expect(await existing(model, ids)).toEqual([]);
    }
    for (const [model, ids] of Object.entries(expectKept)) {
      expect(await existing(model, ids)).toEqual([...ids].sort());
    }
    // Aucune ligne orpheline vers ce qui a été supprimé
    expect(await prisma.letter.count({ where: { matchId: { in: [...expectDeleted.match] } } })).toBe(0);
    expect(await prisma.matchQuestionAttempt.count({ where: { matchId: { in: [...expectDeleted.match] } } })).toBe(0);
    expect(await prisma.bottleReceipt.count({ where: { bottleId: { in: [...expectDeleted.messageInABottle] } } })).toBe(0);
    expect(await prisma.refugeDailyChoice.count({ where: { refugeSessionId: { in: [...expectDeleted.refugeSession] } } })).toBe(0);
    // Bouteilles conservées strictement inchangées (b7 garde son matchId)
    expect(await prisma.messageInABottle.findUnique({ where: { id: id("b5") } })).toEqual(bottle5Before);
    expect(await prisma.messageInABottle.findUnique({ where: { id: id("b7") } })).toEqual(bottle7Before);
    // Données des réels inchangées, comptes inchangés
    const realIds = [R1, R2];
    expect(await prisma.bottleReceipt.count({ where: { recipientId: { in: realIds } } })).toBe(3); // rc2, rc4, rc7
    expect(await reset.realUsersFingerprint(prisma, [T1, T2, T3, T4])).toEqual(before);
    expect(await prisma.user.count()).toBe(usersBefore);
  });
});

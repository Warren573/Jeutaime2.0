import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/config/prisma";
import { blockMatch, breakMatch, declineMatch } from "../../src/modules/matches/matches.service";
import { submitMatchAnswers } from "../../src/modules/matches/questions.service";
import { breakBottle } from "../../src/modules/bottles/bottles.service";
import { updateUserSettings } from "../../src/modules/profiles/userSettings.service";

/**
 * Collecte des données nécessaires au futur système de confiance (auteur / date / nature d'une rupture, date de
 * validation des trois questions, périodes de vacances) SANS changer le comportement existant : le −40 de rupture
 * immédiate reste en vigueur, les anciens scores ne sont pas touchés, et aucun événement de réputation n'est créé.
 * PostgreSQL local de TEST uniquement (TEST_DATABASE_URL requis).
 */
const test = process.env.TEST_DATABASE_URL ? it : it.skip;
const run = Date.now() + "-" + Math.random().toString(36).slice(2, 7);
const ids: string[] = [];
const matchIds: string[] = [];
const bottleIds: string[] = [];

async function makeUser(tag: string) {
  const id = `rdc-${tag}-${run}`;
  ids.push(id);
  await prisma.user.create({
    data: {
      id,
      email: `${id}@test.local`,
      passwordHash: "x",
      wallet: { create: { coins: 50 } },
      profile: { create: { pseudo: `P_${id}`, birthDate: new Date("1990-01-01"), gender: "FEMME", city: "Paris" } },
    },
  });
  return id;
}

async function makeMatch(initiator: string, other: string, over: Record<string, unknown> = {}) {
  const [a, b] = [initiator, other].sort();
  const m = await prisma.match.create({
    data: { userAId: a!, userBId: b!, initiatorId: initiator, status: "ACTIVE", activatedAt: new Date(), ...over },
  });
  matchIds.push(m.id);
  return m.id;
}

const score = async (u: string) => (await prisma.profile.findUniqueOrThrow({ where: { userId: u } })).discoveryActivityScore;

afterAll(async () => {
  if (!process.env.TEST_DATABASE_URL) return;
  await prisma.block.deleteMany({ where: { OR: [{ fromId: { in: ids } }, { toId: { in: ids } }] } });
  await prisma.messageInABottle.deleteMany({ where: { id: { in: bottleIds } } });
  await prisma.match.deleteMany({ where: { id: { in: matchIds } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
});

describe("rupture de match : qui, quand, quelle nature", () => {
  test("rupture immédiate : données collectées ET pénalité actuelle (−40) conservée, pour l'auteur seulement", async () => {
    const a = await makeUser("brk-a");
    const b = await makeUser("brk-b");
    const m = await makeMatch(a, b);
    await breakMatch(m, a);
    const row = await prisma.match.findUniqueOrThrow({ where: { id: m } });
    expect(row.status).toBe("BROKEN");
    expect(row.brokenById).toBe(a);
    expect(row.brokenAt).toBeInstanceOf(Date);
    expect(row.breakKind).toBe("USER_BREAK");
    // comportement existant inchangé (non-régression)
    expect(await score(a)).toBe(-40);
    expect((await prisma.profile.findUniqueOrThrow({ where: { userId: a } })).discoveryBreakPenalty).toBe(1);
    expect(await score(b)).toBe(0);
  });

  test("rupture tardive : données collectées, aucune pénalité existante (inchangé)", async () => {
    const a = await makeUser("late-a");
    const b = await makeUser("late-b");
    const m = await makeMatch(a, b, { activatedAt: new Date(Date.now() - 3_600_000), letterCountA: 1, letterCountB: 1 });
    await breakMatch(m, b);
    const row = await prisma.match.findUniqueOrThrow({ where: { id: m } });
    expect([row.brokenById, row.breakKind]).toEqual([b, "USER_BREAK"]);
    expect(await score(b)).toBe(0);
  });

  test("refus d'une demande : tracé comme refus (jamais comme manquement)", async () => {
    const asker = await makeUser("dec-asker");
    const target = await makeUser("dec-target");
    const m = await makeMatch(asker, target, { status: "PENDING", activatedAt: null });
    await declineMatch(m, target);
    const row = await prisma.match.findUniqueOrThrow({ where: { id: m } });
    expect([row.status, row.brokenById, row.breakKind]).toEqual(["BROKEN", target, "DECLINED"]);
    expect(await score(target)).toBe(0);
  });

  test("blocage depuis la correspondance : tracé comme sécurité", async () => {
    const a = await makeUser("blk-a");
    const b = await makeUser("blk-b");
    const m = await makeMatch(a, b);
    await blockMatch(m, a);
    const row = await prisma.match.findUniqueOrThrow({ where: { id: m } });
    expect([row.status, row.brokenById, row.breakKind]).toEqual(["BLOCKED", a, "SAFETY_BLOCK"]);
    expect(await score(a)).toBe(0);
  });

  test("anciennes données : aucune donnée de rupture inventée", async () => {
    const a = await makeUser("old-a");
    const b = await makeUser("old-b");
    const m = await makeMatch(a, b, { status: "BROKEN" });
    const row = await prisma.match.findUniqueOrThrow({ where: { id: m } });
    expect([row.brokenById, row.brokenAt, row.breakKind, row.questionsValidatedAt]).toEqual([null, null, null, null]);
  });
});

describe("jeu des trois questions", () => {
  async function withQuestions(tag: string) {
    const a = await makeUser(`${tag}-a`);
    const b = await makeUser(`${tag}-b`);
    const questions: Record<string, { id: string; answer: string }[]> = {};
    for (const u of [a, b]) {
      const profile = await prisma.profile.findUniqueOrThrow({ where: { userId: u } });
      questions[u] = [];
      for (let i = 1; i <= 3; i++) {
        const q = await prisma.profileQuestion.create({ data: { profileId: profile.id, questionId: `q${i}`, questionText: `Question ${i}`, answer: `reponse${i}`, wrongAnswers: ["x", "y"] } });
        questions[u]!.push({ id: q.id, answer: q.answer });
      }
    }
    const m = await makeMatch(a, b);
    return { a, b, m, questions };
  }
  const answersFor = (qs: { id: string; answer: string }[], right: boolean) =>
    ({ answers: qs.map((q) => ({ profileQuestionId: q.id, answer: right ? q.answer : "faux" })) });

  test("questions réussies : date de validation enregistrée (une seule fois, après les deux réponses)", async () => {
    const { a, b, m, questions } = await withQuestions("qok");
    await submitMatchAnswers(m, a, answersFor(questions[b]!, true));
    expect((await prisma.match.findUniqueOrThrow({ where: { id: m } })).questionsValidatedAt).toBeNull();
    await submitMatchAnswers(m, b, answersFor(questions[a]!, true));
    const row = await prisma.match.findUniqueOrThrow({ where: { id: m } });
    expect(row.questionsValidated).toBe(true);
    expect(row.questionsValidatedAt).toBeInstanceOf(Date);
    expect(row.status).toBe("ACTIVE");
    expect(row.breakKind).toBeNull();
  });

  test("échec aux questions : rupture AUTOMATIQUE, sans auteur, sans pénalité", async () => {
    const { a, b, m, questions } = await withQuestions("qko");
    await submitMatchAnswers(m, a, answersFor(questions[b]!, false));
    await submitMatchAnswers(m, b, answersFor(questions[a]!, true));
    const row = await prisma.match.findUniqueOrThrow({ where: { id: m } });
    expect(row.status).toBe("BROKEN");
    expect(row.breakKind).toBe("QUESTIONS_FAILED");
    expect(row.brokenById).toBeNull();
    expect(row.brokenAt).toBeInstanceOf(Date);
    expect(row.questionsValidatedAt).toBeNull();
    expect(await score(a)).toBe(0);
    expect(await score(b)).toBe(0);
  });
});

describe("rupture de bouteille", () => {
  test("auteur et date enregistrés ; historique inchangé", async () => {
    const s = await makeUser("btl-s");
    const r = await makeUser("btl-r");
    const bottle = await prisma.messageInABottle.create({
      data: { senderId: s, message: "ohé", senderCity: "Paris", targetGender: "FEMME", ageMin: 18, ageMax: 99, status: "ACCEPTED", acceptedById: r, acceptedAt: new Date(), expiresAt: new Date(Date.now() + 86_400_000) },
    });
    bottleIds.push(bottle.id);
    const before = await prisma.messageInABottle.findUniqueOrThrow({ where: { id: bottle.id } });
    expect([before.brokenById, before.brokenAt]).toEqual([null, null]);
    await breakBottle(bottle.id, r);
    const row = await prisma.messageInABottle.findUniqueOrThrow({ where: { id: bottle.id } });
    expect([row.status, row.brokenById]).toEqual(["BROKEN", r]);
    expect(row.brokenAt).toBeInstanceOf(Date);
  });
});

describe("périodes du mode vacances", () => {
  test("ouverture, fermeture, réactivation : une période par séjour ; comportement du mode inchangé", async () => {
    const u = await makeUser("vac");
    const periods = () => prisma.vacationPeriod.findMany({ where: { userId: u }, orderBy: { startedAt: "asc" } });

    const on = await updateUserSettings(u, { vacationMode: true });
    expect(on.vacationMode).toBe(true);
    expect(on.vacationStartedAt).toBeInstanceOf(Date);
    expect(await periods()).toHaveLength(1);
    expect((await periods())[0]!.endedAt).toBeNull();

    // confirmation répétée : pas de nouvelle période
    await updateUserSettings(u, { vacationMode: true });
    expect(await periods()).toHaveLength(1);

    // autre réglage sans rapport : aucune période
    await updateUserSettings(u, { soundEnabled: false });
    expect(await periods()).toHaveLength(1);

    const off = await updateUserSettings(u, { vacationMode: false });
    expect(off.vacationMode).toBe(false);
    expect(off.vacationStartedAt).toBeNull();
    const closed = await periods();
    expect(closed).toHaveLength(1);
    expect(closed[0]!.endedAt).toBeInstanceOf(Date);

    // désactivation répétée : rien de plus
    await updateUserSettings(u, { vacationMode: false });
    expect((await periods())).toHaveLength(1);

    await updateUserSettings(u, { vacationMode: true });
    const all = await periods();
    expect(all).toHaveLength(2);
    expect(all[1]!.endedAt).toBeNull();
  });

  test("activations simultanées : une seule période ouverte", async () => {
    const u = await makeUser("vac-race");
    await prisma.userSettings.create({ data: { userId: u } });
    await Promise.allSettled(Array.from({ length: 6 }, () => updateUserSettings(u, { vacationMode: true })));
    expect(await prisma.vacationPeriod.count({ where: { userId: u, endedAt: null } })).toBe(1);
  });
});

describe("aucun branchement du moteur dans cette PR", () => {
  test("les actions existantes ne créent ni événement ni état de réputation", async () => {
    expect(await prisma.reputationEvent.count({ where: { userId: { in: ids } } })).toBe(0);
    expect(await prisma.reputationState.count({ where: { userId: { in: ids } } })).toBe(0);
  });
});

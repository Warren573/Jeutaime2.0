import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/config/prisma";
import { runStage, type RunOptions } from "../../scripts/refuge-accelerated-test";
import { SCENARIOS } from "../../src/modules/refuge/refuge.testkit";

/**
 * Outil de test accéléré (PostgreSQL local, comptes testuserN@jeutaime.test créés ici puis supprimés) :
 * les trois scénarios de bout en bout, les gardes, et la préservation d'une adoption en cours.
 */
const test = process.env.TEST_DATABASE_URL ? it : it.skip;
const mail = (n: number) => `testuser${n}@jeutaime.test`;
const NUMBERS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const ids = new Map<number, string>();
let currentAdoption = "";
const silent = () => undefined;

const opts = (scenario: "S1" | "S2" | "S3", stage: RunOptions["stage"], c: number, s: number, over: Partial<RunOptions> = {}): RunOptions => ({
  scenario, stage, companionEmail: mail(c), sponsorEmail: mail(s), apply: false, decision: "none", excludeEmails: [], protectSessionIds: [], ...over,
});

/** Empreinte d'une adoption et des soldes de ses participants : sert à prouver qu'elle n'est pas touchée. */
async function fingerprint(sessionId: string, userIds: string[]) {
  const s = await prisma.refugeSession.findUniqueOrThrow({ where: { id: sessionId }, include: { dailyChoices: true, guesses: true, dayResults: true } });
  const w = await prisma.wallet.findMany({ where: { userId: { in: userIds } }, orderBy: { userId: "asc" } });
  const p = await prisma.profile.findMany({ where: { userId: { in: userIds } }, orderBy: { userId: "asc" }, select: { discoveryActivityScore: true } });
  const n = await prisma.notification.count({ where: { userId: { in: userIds } } });
  const t = await prisma.coinTransaction.count({ where: { walletId: { in: userIds } } });
  return JSON.stringify({ s, w, p, n, t });
}

async function dbCounts(userIds: string[]) {
  return JSON.stringify({
    sessions: await prisma.refugeSession.findMany({ where: { OR: [{ adopteId: { in: userIds } }, { adoptantId: { in: userIds } }] }, orderBy: { id: "asc" } }),
    wallets: await prisma.wallet.findMany({ where: { userId: { in: userIds } }, orderBy: { userId: "asc" } }),
    notifications: await prisma.notification.count({ where: { userId: { in: userIds } } }),
    txns: await prisma.coinTransaction.count({ where: { walletId: { in: userIds } } }),
    results: await prisma.refugeDayResult.count(),
  });
}

beforeAll(async () => {
  for (const n of NUMBERS) {
    const id = `rtk-${n}-${Date.now()}`;
    await prisma.user.create({
      data: {
        id, email: mail(n), passwordHash: "x", role: n === 4 ? "OWNER" : "USER",
        wallet: { create: { coins: 100 } }, settings: { create: {} },
        profile: { create: { pseudo: `rtk${n}`, birthDate: new Date("1995-01-01"), gender: n % 2 ? "FEMME" : "HOMME", city: "Paris" } },
      },
    });
    ids.set(n, id);
  }
  // « Adoption en cours » à préserver : testuser2 (compagnon) → testuser3 (parrain), déjà avancée.
  currentAdoption = `rtk-current-${Date.now()}`;
  const startedAt = new Date(Date.now() - 2 * 86400000);
  await prisma.refugeSession.create({ data: { id: currentAdoption, adopteId: ids.get(2)!, adoptantId: ids.get(3)!, animalType: "CHAT", animalCategory: "SIMPLE", animalSexe: "NEUTRE", animalAgeMonths: 12, acceptedSexe: "HOMME_FEMME", status: "ACTIVE", createdAt: new Date(startedAt.getTime() - 3600000), startedAt, endsAt: new Date(startedAt.getTime() + 7 * 86400000), rulesVersion: 2 } });
  await prisma.refugeDailyChoice.create({ data: { refugeSessionId: currentAdoption, dayNumber: 1, action1: "NOURRIR", action2: "JOUER" } });
});
afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: [...ids.values()] } } });
  await prisma.$disconnect();
});

describe("outil de test accéléré — gardes (aucune écriture)", () => {
  test("un compte hors liste (réel), un administrateur ou un compte en adoption en cours sont refusés, sans écriture", async () => {
    const all = [...ids.values()];
    const before = await dbCounts(all);
    const real = await prisma.user.create({ data: { id: `rtk-real-${Date.now()}`, email: `vrai-${Date.now()}@gmail.com`, passwordHash: "x", wallet: { create: { coins: 5 } }, settings: { create: {} } } });
    try {
      const r1 = await runStage({ ...opts("S1", "adopt", 5, 6), companionEmail: real.email, apply: true, confirm: "x" }, silent);
      expect(r1.refused.join()).toMatch(/n'est pas un compte de test/);
      const r2 = await runStage(opts("S1", "adopt", 4, 6, { apply: true, confirm: "x" }), silent);
      expect(r2.refused.join()).toMatch(/administration/);
      const r3 = await runStage(opts("S1", "adopt", 2, 5, { apply: true, confirm: "x" }), silent); // testuser2 : adoption en cours
      expect(r3.refused.join()).toMatch(/adoption en cours préservée/);
      const r4 = await runStage(opts("S1", "adopt", 5, 3, { apply: true, confirm: "x" }), silent); // testuser3 : adoption en cours
      expect(r4.refused.join()).toMatch(/adoption en cours préservée/);
      const r5 = await runStage(opts("S1", "adopt", 5, 6, { excludeEmails: [mail(6)], apply: true, confirm: "x" }), silent);
      expect(r5.refused.join()).toMatch(/exclu/);
      expect(await dbCounts(all)).toBe(before);
      expect((await prisma.wallet.findUniqueOrThrow({ where: { userId: real.id } })).coins).toBe(5);
    } finally {
      await prisma.user.delete({ where: { id: real.id } });
    }
  });

  test("la session de l'adoption en cours ne peut être ciblée : protégée, v1/autre couple, et jamais modifiée", async () => {
    const fp = await fingerprint(currentAdoption, [ids.get(2)!, ids.get(3)!]);
    const r = await runStage(opts("S1", "days-1-3", 2, 3, { sessionId: currentAdoption, protectSessionIds: [currentAdoption], apply: true, confirm: "x" }), silent);
    expect(r.refused.join()).toMatch(/protégée/);
    const r2 = await runStage(opts("S1", "days-1-3", 5, 6, { sessionId: currentAdoption, apply: true, confirm: "x" }), silent); // mauvais couple
    expect(r2.refused.length).toBeGreaterThan(0);
    expect(await fingerprint(currentAdoption, [ids.get(2)!, ids.get(3)!])).toBe(fp);
  });

  test("simulation : aucune écriture, phrase de confirmation fournie ; exécution refusée sans la phrase exacte", async () => {
    const all = [...ids.values()];
    const before = await dbCounts(all);
    const sim = await runStage(opts("S1", "adopt", 5, 6), silent);
    expect(sim.refused).toEqual([]);
    expect(sim.applied).toBe(false);
    expect(sim.confirmation).toBe("JE CONFIRME S1 adopt testuser5@jeutaime.test testuser6@jeutaime.test");
    const wrong = await runStage(opts("S1", "adopt", 5, 6, { apply: true, confirm: "oui" }), silent);
    expect(wrong.refused.join()).toMatch(/confirmation incorrecte/);
    expect(await dbCounts(all)).toBe(before);
  });
});

async function playScenario(id: "S1" | "S2" | "S3", c: number, s: number) {
  const guarded = [ids.get(2)!, ids.get(3)!];
  const fp = await fingerprint(currentAdoption, guarded);
  const run = async (stage: RunOptions["stage"], extra: Partial<RunOptions> = {}) => {
    const sim = await runStage(opts(id, stage, c, s, extra), silent); // 1) simulation
    expect(sim.refused, `${id} ${stage} simulation`).toEqual([]);
    const res = await runStage(opts(id, stage, c, s, { ...extra, apply: true, confirm: sim.confirmation }), silent); // 2) exécution
    expect(res.refused, `${id} ${stage}`).toEqual([]);
    const bad = res.checks.filter((x) => !x.ok);
    expect(bad, `${id} ${stage} : ${JSON.stringify(bad)}`).toEqual([]);
    return res;
  };
  const adopt = await run("adopt");
  const sessionId = adopt.sessionId!;
  // Rejouer une étape terminée, ou sauter une étape, est refusé.
  await run("days-1-3", { sessionId });
  expect((await runStage(opts(id, "days-1-3", c, s, { sessionId, apply: true, confirm: "JE CONFIRME " + id + " days-1-3 " + mail(c) + " " + mail(s) }), silent)).refused.join()).toMatch(/déjà été exécutée/);
  await run("days-4-6", { sessionId });
  // Avant l'expiration : le dévoilement n'est jamais proposé (le bilan « day-7 » vérifie reveal.available=false).
  await run("day-7", { sessionId });
  const early = await prisma.refugeSession.findUniqueOrThrow({ where: { id: sessionId } });
  expect(early.status).toBe("ACTIVE");
  await expect((await import("../../src/modules/refuge/refuge.service")).RefugeService.submitRevealConsent(sessionId, ids.get(c)!, "ACCEPT")).rejects.toMatchObject({ statusCode: 409 });
  await run("fast-forward", { sessionId });
  await run("decision", { sessionId, decision: "scenario" });
  // L'adoption en cours n'a pas bougé d'un octet, ni son solde, ni ses notifications.
  expect(await fingerprint(currentAdoption, guarded)).toBe(fp);
  return sessionId;
}

describe("outil de test accéléré — scénarios complets (sept jours, 168 h, décision)", () => {
  test("S1 : parcours parfait, dévoilement mutuel (REVEALED), 170 pièces chacun", async () => {
    const sid = await playScenario("S1", 5, 6);
    expect((await prisma.refugeSession.findUniqueOrThrow({ where: { id: sid } })).status).toBe("REVEALED");
    for (const n of [5, 6]) expect((await prisma.wallet.findUniqueOrThrow({ where: { userId: ids.get(n)! } })).coins).toBe(100 + 170);
  }, 180000);

  test("S2 : parcours incomplet, refus (COMPLETED), pièces conservées, points −10, Refuge actif disparu", async () => {
    const sid = await playScenario("S2", 7, 8);
    expect((await prisma.refugeSession.findUniqueOrThrow({ where: { id: sid } })).status).toBe("COMPLETED");
    expect((await prisma.wallet.findUniqueOrThrow({ where: { userId: ids.get(7)! } })).coins).toBe(100 + 50);
    expect((await prisma.wallet.findUniqueOrThrow({ where: { userId: ids.get(8)! } })).coins).toBe(100 + 40);
    for (const n of [7, 8]) expect((await prisma.profile.findUniqueOrThrow({ where: { userId: ids.get(n)! } })).discoveryActivityScore).toBe(-10);
    const { RefugeService } = await import("../../src/modules/refuge/refuge.service");
    expect(await RefugeService.getActiveRefugeSession(ids.get(7)!)).toBeNull();
    expect(await RefugeService.getActiveRefugeSession(ids.get(8)!)).toBeNull();
  }, 180000);

  test("S3 : 7/7 d'assiduité, un accepte et l'autre refuse (COMPLETED), 120 pièces chacun, aucun point retiré", async () => {
    const sid = await playScenario("S3", 9, 10);
    expect((await prisma.refugeSession.findUniqueOrThrow({ where: { id: sid } })).status).toBe("COMPLETED");
    for (const n of [9, 10]) {
      expect((await prisma.wallet.findUniqueOrThrow({ where: { userId: ids.get(n)! } })).coins).toBe(100 + 120);
      expect((await prisma.profile.findUniqueOrThrow({ where: { userId: ids.get(n)! } })).discoveryActivityScore).toBe(0);
    }
  }, 180000);

  test("effets secondaires : seuls les 6 comptes des scénarios ont changé ; les autres comptes de test et l'adoption en cours sont intacts", async () => {
    for (const n of [2, 3, 4, 11]) expect((await prisma.wallet.findUniqueOrThrow({ where: { userId: ids.get(n)! } })).coins).toBe(100);
    for (const n of [2, 3, 4, 11]) expect((await prisma.profile.findUniqueOrThrow({ where: { userId: ids.get(n)! } })).discoveryActivityScore).toBe(0);
    expect(await prisma.refugeSession.count({ where: { id: { not: currentAdoption }, OR: [{ adopteId: { in: [ids.get(2)!, ids.get(3)!, ids.get(4)!, ids.get(11)!] } }, { adoptantId: { in: [ids.get(2)!, ids.get(3)!, ids.get(4)!, ids.get(11)!] } }] } })).toBe(0);
    expect(SCENARIOS.S1.id).toBe("S1");
  });
});

import { afterAll, describe, expect, it, vi } from "vitest";

// Les notifications ne sont pas l'objet de ce test (phase finale seulement) : service isolé.
vi.mock("../../src/modules/notifications/notify.service", () => ({
  notifyEvent: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "../../src/config/prisma";
import { BadRequestError, RefugeGuessAlreadySubmittedError } from "../../src/core/errors";
import { RefugeService } from "../../src/modules/refuge/refuge.service";

/**
 * Aliment de la tentative : persistance RÉELLE en base, validation serveur, restitution,
 * ancienne donnée sans foodChoice, attribution unique sous requêtes simultanées.
 * Nécessite TEST_DATABASE_URL (PostgreSQL jetable).
 */
const test = process.env.TEST_DATABASE_URL ? it : it.skip;
const run = Date.now() + "-" + Math.random().toString(36).slice(2, 7);
const id = (tag: string) => `rf-${tag}-${run}`;
const allUsers: string[] = [];
const day = 24 * 60 * 60 * 1000;

// Une session par couple (contrainte unique) : chaque test crée sa propre paire.
async function makeSession(animalType: string, tag: string, choice: [string, string] = ["NOURRIR", "JOUER"]) {
  const companion = id(`${tag}-c`);
  const sponsor = id(`${tag}-s`);
  for (const u of [companion, sponsor]) {
    await prisma.user.create({ data: { id: u, email: `${u}@example.test`, passwordHash: "x" } });
    await prisma.wallet.create({ data: { userId: u, coins: 100 } });
    allUsers.push(u);
  }
  const sid = id(tag);
  const startedAt = new Date(Date.now() - 2 * 60 * 60 * 1000);
  await prisma.refugeSession.create({
    data: {
      id: sid, adopteId: companion, adoptantId: sponsor,
      animalType: animalType as never, animalCategory: "SIMPLE", animalSexe: "NEUTRE", animalAgeMonths: 12,
      acceptedSexe: "HOMME_FEMME", status: "ACTIVE",
      createdAt: new Date(startedAt.getTime() - day), startedAt, endsAt: new Date(startedAt.getTime() + 7 * day),
    },
  });
  await prisma.refugeDailyChoice.create({
    data: { refugeSessionId: sid, dayNumber: 1, action1: choice[0] as never, action2: choice[1] as never },
  });
  return { sid, companion, sponsor };
}

afterAll(async () => {
  if (!process.env.TEST_DATABASE_URL) return;
  await prisma.user.deleteMany({ where: { id: { in: allUsers } } }); // cascade : sessions, choix, tentatives, portefeuilles
  await prisma.$disconnect();
});

describe("Refuge — aliment persisté et restitué (PostgreSQL)", () => {
  test("aliment choisi : enregistré en base puis renvoyé aux deux participants", async () => {
    const { sid, companion: COMPANION, sponsor: SPONSOR } = await makeSession("CHAT", "chat");
    await RefugeService.submitGuess(sid, SPONSOR, 1, { guessedAction1: "NOURRIR", guessedAction2: "JOUER", foodChoice: "sardines" });
    const row = await prisma.refugeGuess.findFirstOrThrow({ where: { refugeSessionId: sid } });
    expect(row.foodChoice).toBe("sardines");
    const companionView = await RefugeService.getRefugeSession(sid, COMPANION);
    const sponsorView = await RefugeService.getRefugeSession(sid, SPONSOR);
    expect(companionView.animation).toEqual(sponsorView.animation);
    expect(companionView.animation.foodChoice).toBe("sardines");
    expect(companionView.animation.matches).toBe(2);
    expect(new Date(companionView.serverTime).getTime()).toBeGreaterThan(Date.now() - 5000);
    const home = await RefugeService.getActiveRefugeSession(COMPANION);
    expect(home?.animation).toEqual(companionView.animation);
  });

  test("animal à aliment unique : sélection automatique persistée", async () => {
    const { sid, sponsor: SPONSOR } = await makeSession("PANDA", "panda");
    await RefugeService.submitGuess(sid, SPONSOR, 1, { guessedAction1: "LAVER", guessedAction2: "NOURRIR" });
    const row = await prisma.refugeGuess.findFirstOrThrow({ where: { refugeSessionId: sid } });
    expect(row.foodChoice).toBe("bamboo");
  });

  test("aliment incompatible : refusé, rien n'est écrit, aucune pièce versée", async () => {
    const { sid, sponsor: SPONSOR } = await makeSession("CHIEN", "chien");
    const before = await prisma.wallet.findUniqueOrThrow({ where: { userId: SPONSOR } });
    await expect(
      RefugeService.submitGuess(sid, SPONSOR, 1, { guessedAction1: "NOURRIR", guessedAction2: "JOUER", foodChoice: "fish" })
    ).rejects.toBeInstanceOf(BadRequestError);
    expect(await prisma.refugeGuess.count({ where: { refugeSessionId: sid } })).toBe(0);
    expect(await prisma.refugeDayResult.count({ where: { refugeSessionId: sid } })).toBe(0);
    expect((await prisma.wallet.findUniqueOrThrow({ where: { userId: SPONSOR } })).coins).toBe(before.coins);
  });

  test("aliment sans l'action Nourrir : refusé, aucune valeur persistée", async () => {
    const { sid, sponsor: SPONSOR } = await makeSession("CHAT", "nofeed");
    await expect(
      RefugeService.submitGuess(sid, SPONSOR, 1, { guessedAction1: "JOUER", guessedAction2: "LAVER", foodChoice: "fish" })
    ).rejects.toBeInstanceOf(BadRequestError);
    expect(await prisma.refugeGuess.count({ where: { refugeSessionId: sid } })).toBe(0);
  });

  test("ancienne donnée sans foodChoice : lecture sans erreur, aliment par défaut compatible", async () => {
    const { sid, sponsor: SPONSOR } = await makeSession("CHAT", "legacy");
    await prisma.refugeGuess.create({
      data: { refugeSessionId: sid, dayNumber: 1, guessedAction1: "NOURRIR", guessedAction2: "LAVER" }, // pas de foodChoice
    });
    const view = await RefugeService.getRefugeSession(sid, SPONSOR);
    expect(view.animation.foodChoice).toBe("food");
    expect(view.animation.matches).toBe(1);
  });

  test("deux validations simultanées : un seul résultat, une seule attribution de pièces", async () => {
    const { sid, companion: COMPANION, sponsor: SPONSOR } = await makeSession("LAPIN", "race");
    const walletsBefore = await prisma.wallet.findMany({ where: { userId: { in: [COMPANION, SPONSOR] } }, orderBy: { userId: "asc" } });
    const input = { guessedAction1: "NOURRIR", guessedAction2: "JOUER", foodChoice: "carrot" } as const;
    const outcomes = await Promise.allSettled([
      RefugeService.submitGuess(sid, SPONSOR, 1, input),
      RefugeService.submitGuess(sid, SPONSOR, 1, input),
      RefugeService.submitGuess(sid, SPONSOR, 1, input),
    ]);
    expect(outcomes.filter((o) => o.status === "fulfilled")).toHaveLength(1);
    for (const o of outcomes) {
      if (o.status === "rejected") expect(o.reason).toBeInstanceOf(RefugeGuessAlreadySubmittedError);
    }
    expect(await prisma.refugeGuess.count({ where: { refugeSessionId: sid } })).toBe(1);
    expect(await prisma.refugeDayResult.count({ where: { refugeSessionId: sid } })).toBe(1);
    const walletsAfter = await prisma.wallet.findMany({ where: { userId: { in: [COMPANION, SPONSOR] } }, orderBy: { userId: "asc" } });
    walletsAfter.forEach((w, i) => expect(w.coins - walletsBefore[i]!.coins).toBe(10)); // 2/2 : +10 chacun, une seule fois
    expect(await prisma.coinTransaction.count({ where: { walletId: { in: [COMPANION, SPONSOR] }, type: "REFUGE_PERFECT_REWARD" } })).toBe(2);
  });
});

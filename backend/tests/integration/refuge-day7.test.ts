import { afterAll, describe, expect, it, vi } from "vitest";
vi.mock("../../src/modules/notifications/notify.service", () => ({ notifyEvent: vi.fn().mockResolvedValue(undefined) }));
import { prisma } from "../../src/config/prisma";
import { RefugeService } from "../../src/modules/refuge/refuge.service";

const run = Date.now() + "-" + Math.random().toString(36).slice(2, 6);
const DAY = 86400000, HOUR = 3600000;
const users: string[] = [];
async function mk(tag: string, startedAgoMs: number, opts: { choices?: number[]; legacyGuesses?: number[]; status?: string } = {}) {
  const c = `r7-${tag}-c-${run}`, s = `r7-${tag}-s-${run}`;
  for (const u of [c, s]) { await prisma.user.create({ data: { id: u, email: `${u}@e.test`, passwordHash: "x" } }); await prisma.wallet.create({ data: { userId: u, coins: 100 } }); users.push(u); }
  const startedAt = new Date(Date.now() - startedAgoMs);
  const sid = `r7-${tag}-${run}`;
  await prisma.refugeSession.create({ data: { id: sid, adopteId: c, adoptantId: s, animalType: "RENARD", animalCategory: "SIMPLE", animalSexe: "NEUTRE", animalAgeMonths: 12,
    acceptedSexe: "HOMME_FEMME", status: (opts.status ?? "ACTIVE") as never, createdAt: new Date(startedAt.getTime() - HOUR), startedAt, endsAt: new Date(startedAt.getTime() + 7 * DAY) } });
  for (const d of opts.choices ?? []) await prisma.refugeDailyChoice.create({ data: { refugeSessionId: sid, dayNumber: d, action1: "NOURRIR", action2: "CARESSER", submittedAt: new Date(startedAt.getTime() + (d - 1) * DAY + HOUR) } });
  for (const d of opts.legacyGuesses ?? []) {
    await prisma.refugeGuess.create({ data: { refugeSessionId: sid, dayNumber: d, guessedAction1: "NOURRIR", guessedAction2: "CARESSER", submittedAt: new Date(startedAt.getTime() + (d - 1) * DAY + 2 * HOUR) } });
    await prisma.refugeDayResult.create({ data: { refugeSessionId: sid, dayNumber: d, status: "PERFECT", matchCount: 2, adopteCoinsDelta: 10, adoptantCoinsDelta: 10 } });
  }
  return { sid, c, s };
}
const brief = (v: any) => ({ currentDay: v.currentDay, status: v.status, isActive: v.isActive, canAttemptToday: v.canAttemptToday, todaySubmitted: v.todaySubmitted, adopteSubmittedToday: v.adopteSubmittedToday, timeRemaining: v.timeRemaining, animation: v.animation });
const attempt = async (f: () => Promise<unknown>) => { try { await f(); return "OK"; } catch (e: any) { return `${e.constructor.name} ${e.statusCode ?? ""} « ${e.message} »`; } };

afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: users } } }); await prisma.$disconnect(); });

const test = process.env.TEST_DATABASE_URL ? it : it.skip;
const NOURRIR_CARESSER = { guessedAction1: "NOURRIR", guessedAction2: "CARESSER", foodChoice: "fish" } as never;

/**
 * Jour 7 sur 7 : ce que le serveur répond réellement (PostgreSQL), pour chaque rôle.
 * Régression d'un signalement : « je valide, rien ne se passe » au jour 7 d'une session de renard.
 */
describe("Refuge — jour 7 (PostgreSQL)", () => {
  test("session normale, jours 1 à 6 joués avant la migration (sans foodChoice) : la validation réussit et l'animation démarre", async () => {
    const x = await mk("normal", 6 * DAY + 2 * HOUR, { choices: [1, 2, 3, 4, 5, 6, 7], legacyGuesses: [1, 2, 3, 4, 5, 6] });
    const before: any = await RefugeService.getRefugeSession(x.sid, x.s);
    expect(before.currentDay).toBe(7);
    expect(before.isActive).toBe(true);
    expect(before.canAttemptToday).toBe(true);
    expect(await attempt(() => RefugeService.submitGuess(x.sid, x.s, 7, NOURRIR_CARESSER))).toBe("OK");
    const after: any = await RefugeService.getRefugeSession(x.sid, x.s);
    expect(after.animation.matches).toBe(2);
    expect(after.animation.foodChoice).toBe("fish");
    expect(after.animation.reactions.length).toBe(2);
  });

  test("fin dépassée mais statut encore ACTIVE : le serveur le dit (isActive=false) et refuse les deux rôles avec un message explicite", async () => {
    const x = await mk("expired", 8 * DAY, { choices: [1, 2, 3, 4, 5, 6, 7], legacyGuesses: [1, 2, 3, 4, 5, 6] });
    const v: any = await RefugeService.getRefugeSession(x.sid, x.s);
    // L'écran affichait « Jour 7 sur 7 » : currentDay est plafonné à 7, seule isActive permet de savoir que c'est fini.
    expect(v.currentDay).toBe(7);
    expect(v.status).toBe("ACTIVE");
    expect(v.isActive).toBe(false);
    expect(v.canAttemptToday).toBe(false);
    expect(await attempt(() => RefugeService.submitGuess(x.sid, x.s, 7, NOURRIR_CARESSER))).toMatch(/ConflictError 409 « Ce refuge a expiré »/);
    expect(await attempt(() => RefugeService.submitDailyChoice(x.sid, x.c, 7, { action1: "NOURRIR", action2: "CARESSER" }))).toMatch(/ConflictError 409 « Ce refuge a expiré »/);
    expect(await prisma.refugeGuess.count({ where: { refugeSessionId: x.sid, dayNumber: 7 } })).toBe(0); // rien n'est écrit
  });

  test("le compagnon n'a pas encore choisi le jour 7 : le parrain reçoit un refus explicite", async () => {
    const x = await mk("nochoice", 6 * DAY + 2 * HOUR, { choices: [1, 2, 3, 4, 5, 6], legacyGuesses: [1, 2, 3, 4, 5, 6] });
    expect(await attempt(() => RefugeService.submitGuess(x.sid, x.s, 7, NOURRIR_CARESSER))).toMatch(/ConflictError 409 « L'Adopté n'a pas encore choisi/);
  });

  test("jours précédents jamais joués : la validation du jour 7 réussit quand même", async () => {
    const x = await mk("skipped", 6 * DAY + 2 * HOUR, { choices: [7] });
    expect(await attempt(() => RefugeService.submitGuess(x.sid, x.s, 7, { guessedAction1: "NOURRIR", guessedAction2: "CARESSER", foodChoice: "meat" } as never))).toBe("OK");
  });

  test("renard : poisson et viande acceptés, aliment hors liste refusé avec un message", async () => {
    const x = await mk("food", 6 * DAY + 2 * HOUR, { choices: [7] });
    expect(await attempt(() => RefugeService.submitGuess(x.sid, x.s, 7, { guessedAction1: "NOURRIR", guessedAction2: "CARESSER", foodChoice: "food" } as never)))
      .toMatch(/BadRequestError 400 « Aliment incompatible avec cet animal »/);
    expect(await attempt(() => RefugeService.submitGuess(x.sid, x.s, 7, { guessedAction1: "NOURRIR", guessedAction2: "CARESSER", foodChoice: "meat" } as never))).toBe("OK");
  });
});

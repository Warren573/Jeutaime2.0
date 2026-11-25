import { afterAll, describe, expect, it, vi } from "vitest";
vi.mock("../../src/modules/notifications/notify.service", () => ({ notifyEvent: vi.fn().mockResolvedValue(undefined) }));
import { prisma } from "../../src/config/prisma";
import { RefugeService } from "../../src/modules/refuge/refuge.service";

/**
 * Clôture d'une session expirée restée ACTIVE (aucun job : ENABLE_SCHEDULER=false). PostgreSQL réel.
 *  - jour 7 joué → dévoilement ; sinon → clôture propre ;
 *  - une seule transition même sous requêtes simultanées ;
 *  - AUCUN mouvement de pièces (règle des ±5 en attente de validation), AUCUNE donnée supprimée ;
 *  - retour à un fonctionnement normal : plus de blocage à la proposition ni à l'adoption.
 */
const test = process.env.TEST_DATABASE_URL ? it : it.skip;
const run = Date.now() + "-" + Math.random().toString(36).slice(2, 6);
const DAY = 86400000, HOUR = 3600000;
const users: string[] = [];

// Compteur d'écritures de clôture au niveau de Prisma (un espion sur le délégué est fragile : c'est un proxy).
const track = { on: false, calls: 0, wins: 0 };
(prisma as any).$use(async (params: any, next: (p: any) => Promise<any>) => {
  if (!track.on || params.model !== "RefugeSession" || params.action !== "updateMany") return next(params);
  track.calls++;
  const result = await next(params);
  if (result?.count === 1) track.wins++;
  return result;
});
const startTrack = () => { track.calls = 0; track.wins = 0; track.on = true; };
const stopTrack = () => { track.on = false; };

async function user(tag: string) {
  const id = `rx-${tag}-${run}`;
  await prisma.user.create({ data: { id, email: `${id}@e.test`, passwordHash: "x" } });
  await prisma.wallet.create({ data: { userId: id, coins: 100 } });
  users.push(id);
  return id;
}
async function session(tag: string, opts: { startedAgoMs: number; choices?: number[]; guesses?: number[] }) {
  const c = await user(`${tag}-c`), s = await user(`${tag}-s`);
  const startedAt = new Date(Date.now() - opts.startedAgoMs);
  const sid = `rx-${tag}-${run}`;
  await prisma.refugeSession.create({ data: { id: sid, adopteId: c, adoptantId: s, animalType: "RENARD", animalCategory: "RARE", animalSexe: "NEUTRE",
    animalAgeMonths: 12, acceptedSexe: "HOMME_FEMME", status: "ACTIVE", createdAt: new Date(startedAt.getTime() - HOUR), startedAt,
    endsAt: new Date(startedAt.getTime() + 7 * DAY) } });
  for (const d of opts.choices ?? []) await prisma.refugeDailyChoice.create({ data: { refugeSessionId: sid, dayNumber: d, action1: "NOURRIR", action2: "CARESSER", submittedAt: new Date(startedAt.getTime() + (d - 1) * DAY + HOUR) } });
  for (const d of opts.guesses ?? []) await prisma.refugeGuess.create({ data: { refugeSessionId: sid, dayNumber: d, guessedAction1: "NOURRIR", guessedAction2: "CARESSER", submittedAt: new Date(startedAt.getTime() + (d - 1) * DAY + 2 * HOUR) } });
  return { sid, c, s };
}
const dbStatus = async (sid: string) => (await prisma.refugeSession.findUniqueOrThrow({ where: { id: sid } })).status;
const coins = async (ids: string[]) => (await prisma.wallet.findMany({ where: { userId: { in: ids } }, orderBy: { userId: "asc" } })).map((w) => w.coins);
const movements = (ids: string[]) => prisma.coinTransaction.count({ where: { walletId: { in: ids } } });
const attempt = async (f: () => Promise<unknown>) => { try { await f(); return "OK"; } catch (e: any) { return `${e.statusCode ?? ""} ${e.message}`; } };

afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: users } } }); await prisma.$disconnect(); });

describe("Refuge — clôture d'une session expirée (PostgreSQL)", () => {
  test("jour 7 non joué : clôture propre à la lecture, sans pièces, sans suppression, puis fonctionnement normal", async () => {
    const x = await session("a", { startedAgoMs: 8 * DAY, choices: [1, 2, 3], guesses: [1, 2] });
    const other = await user("a-other-c"); const newSponsor = await user("a-newsponsor");
    // Avant : l'Adopté et l'Adoptant sont bloqués par la session expirée restée ACTIVE.
    expect(await attempt(() => RefugeService.proposeAsAdopte(x.c, { animalType: "CHAT", acceptedSexe: "HOMME_FEMME" } as never))).toMatch(/refuge en cours ou en attente/);
    const proposal = await RefugeService.proposeAsAdopte(other, { animalType: "CHAT", acceptedSexe: "HOMME_FEMME" } as never);
    expect(await attempt(() => RefugeService.adoptRefuge(x.s, proposal.id))).toMatch(/refuge actif en cours/);
    const before = { coins: await coins([x.c, x.s]), tx: await movements([x.c, x.s]) };

    const v: any = await RefugeService.getRefugeSession(x.sid, x.s);
    expect(v.status).toBe("ABANDONED");
    expect(v.isActive).toBe(false);
    expect(await dbStatus(x.sid)).toBe("ABANDONED");
    expect(((await RefugeService.getRefugeSession(x.sid, x.c)) as any).status).toBe("ABANDONED");
    expect(await RefugeService.getActiveRefugeSession(x.c)).toBeNull();

    // Aucun mouvement de pièces, rien de supprimé, aucun résultat de jour créé.
    expect(await coins([x.c, x.s])).toEqual(before.coins);
    expect(await movements([x.c, x.s])).toBe(before.tx);
    expect(await prisma.refugeDailyChoice.count({ where: { refugeSessionId: x.sid } })).toBe(3);
    expect(await prisma.refugeGuess.count({ where: { refugeSessionId: x.sid } })).toBe(2);
    expect(await prisma.refugeDayResult.count({ where: { refugeSessionId: x.sid } })).toBe(0);

    // Définitivement fermée aux nouvelles actions.
    expect(await attempt(() => RefugeService.submitDailyChoice(x.sid, x.c, 7, { action1: "NOURRIR", action2: "CARESSER" }))).toMatch(/409 Ce refuge n'est pas actif/);
    expect(await attempt(() => RefugeService.submitGuess(x.sid, x.s, 7, { guessedAction1: "NOURRIR", guessedAction2: "CARESSER", foodChoice: "fish" } as never))).toMatch(/409 Ce refuge n'est pas actif/);

    // Fonctionnement normal : plus de blocage (règles d'adoption existantes).
    expect(await attempt(() => RefugeService.proposeAsAdopte(x.c, { animalType: "CHAT", acceptedSexe: "HOMME_FEMME" } as never))).toBe("OK");
    expect(await attempt(() => RefugeService.adoptRefuge(x.s, proposal.id))).toBe("OK");
    expect(newSponsor).toBeTruthy();
  });

  test("jour 7 joué : la session passe à la phase de dévoilement, qui reste utilisable, sans pièces", async () => {
    const x = await session("b", { startedAgoMs: 8 * DAY, choices: [7], guesses: [7] });
    const before = { coins: await coins([x.c, x.s]), tx: await movements([x.c, x.s]) };
    const v: any = await RefugeService.getRefugeSession(x.sid, x.c);
    expect(v.status).toBe("AWAITING_REVEAL_CONSENT");
    expect(v.reveal.available).toBe(true);
    expect(((await RefugeService.getActiveRefugeSession(x.c)) as any)?.status).toBe("AWAITING_REVEAL_CONSENT"); // toujours « en cours »
    expect(await attempt(() => RefugeService.submitRevealConsent(x.sid, x.c, "ACCEPT"))).toBe("OK");
    expect(await attempt(() => RefugeService.submitRevealConsent(x.sid, x.s, "ACCEPT"))).toBe("OK");
    expect(await dbStatus(x.sid)).toBe("REVEALED");
    expect(await coins([x.c, x.s])).toEqual(before.coins);
    expect(await movements([x.c, x.s])).toBe(before.tx);
  });

  test("clôture unique sous requêtes simultanées (lectures des deux rôles, accueil, appels directs)", async () => {
    const x = await session("c", { startedAgoMs: 9 * DAY, choices: [1], guesses: [] });
    const row = await prisma.refugeSession.findUniqueOrThrow({ where: { id: x.sid }, include: { dailyChoices: true, guesses: true } });
    startTrack();
    const direct = await Promise.all(Array.from({ length: 8 }, () => RefugeService.closeExpiredSession(row)));
    const reads = await Promise.all([
      ...Array.from({ length: 4 }, () => RefugeService.getRefugeSession(x.sid, x.s)),
      ...Array.from({ length: 4 }, () => RefugeService.getRefugeSession(x.sid, x.c)),
      ...Array.from({ length: 4 }, () => RefugeService.getActiveRefugeSession(x.c)),
    ]);
    expect(direct.filter((r) => r?.closedByThisCall).length).toBe(1);
    expect(direct.every((r) => r?.status === "ABANDONED")).toBe(true);
    stopTrack();
    expect(track.wins).toBe(1); // une seule transition réellement appliquée, quel que soit le nombre de requêtes
    expect(reads.slice(0, 8).every((r: any) => r.status === "ABANDONED")).toBe(true);
    expect(await dbStatus(x.sid)).toBe("ABANDONED");
  }, 30000);

  test("session en cours : aucune écriture supplémentaire, aucune clôture", async () => {
    const x = await session("d", { startedAgoMs: 6 * DAY + 2 * HOUR, choices: [7] });
    startTrack();
    const v: any = await RefugeService.getRefugeSession(x.sid, x.c);
    await RefugeService.getRefugeSession(x.sid, x.s);
    await RefugeService.getActiveRefugeSession(x.s);
    expect(v.status).toBe("ACTIVE");
    expect(v.isActive).toBe(true);
    stopTrack();
    expect(track.calls).toBe(0); // aucune écriture de clôture sur une session en cours
    expect(await dbStatus(x.sid)).toBe("ACTIVE");
  });

  test("écriture sur une session expirée non encore lue : même refus, et la session est clôturée", async () => {
    const x = await session("e", { startedAgoMs: 8 * DAY, choices: [1] });
    expect(await attempt(() => RefugeService.submitGuess(x.sid, x.s, 7, { guessedAction1: "NOURRIR", guessedAction2: "CARESSER", foodChoice: "fish" } as never))).toMatch(/409 Ce refuge a expiré/);
    expect(await dbStatus(x.sid)).toBe("ABANDONED");
    expect(await attempt(() => RefugeService.submitGuess(x.sid, x.s, 7, { guessedAction1: "NOURRIR", guessedAction2: "CARESSER", foodChoice: "fish" } as never))).toMatch(/409 Ce refuge n'est pas actif/);
  });

  test("décision de dévoilement sur une session expirée : jour 7 non joué = terminée ; aucune pièce n'est soldée", async () => {
    const x = await session("f", { startedAgoMs: 8 * DAY, choices: [1, 2], guesses: [1] });
    const before = { coins: await coins([x.c, x.s]), tx: await movements([x.c, x.s]) };
    expect(await attempt(() => RefugeService.submitRevealConsent(x.sid, x.c, "ACCEPT"))).toMatch(/409 Cette session est terminée/);
    expect(await dbStatus(x.sid)).toBe("ABANDONED");
    expect(await coins([x.c, x.s])).toEqual(before.coins);
    expect(await movements([x.c, x.s])).toBe(before.tx);
    expect(await prisma.refugeDayResult.count({ where: { refugeSessionId: x.sid } })).toBe(0);
  });
});

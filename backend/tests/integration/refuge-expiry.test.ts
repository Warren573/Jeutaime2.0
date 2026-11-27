import { afterAll, describe, expect, it, vi } from "vitest";
vi.mock("../../src/modules/notifications/notify.service", () => ({ notifyEvent: vi.fn().mockResolvedValue(undefined) }));
import { prisma } from "../../src/config/prisma";
import { RefugeService } from "../../src/modules/refuge/refuge.service";

/**
 * Clôture d'une session expirée restée ACTIVE (aucun job : ENABLE_SCHEDULER=false). PostgreSQL réel.
 *  - jour 7 joué → dévoilement ; sinon → clôture propre ;
 *  - une seule transition même sous requêtes simultanées ;
 *  - les jours incomplets sont soldés AVANT la clôture (règles de refuge.utils.ts), une seule fois, jamais de solde négatif ;
 *  - une session déjà clôturée n'est JAMAIS réglée rétroactivement ; AUCUNE donnée supprimée ;
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

afterAll(async () => { await prisma.match.deleteMany({ where: { OR: [{ userAId: { in: users } }, { userBId: { in: users } }] } }); await prisma.reaction.deleteMany({ where: { OR: [{ fromId: { in: users } }, { toId: { in: users } }] } }); await prisma.user.deleteMany({ where: { id: { in: users } } }); await prisma.$disconnect(); });

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

    // Jour 3 : choix du compagnon sans réponse → compagnon +5, parrain −5 (règle existante), une seule fois.
    // Jours 4 à 7 : personne n'a joué et le parrain n'a montré aucune présence → NOT_PLAYED, 0/0.
    // Jours 1-2 : complets (récompenses versées à la validation, ici insérés directement) → seulement le résultat.
    expect(before.coins).toEqual([100, 100]);
    expect(await coins([x.c, x.s])).toEqual([105, 95]);
    expect(await movements([x.c, x.s])).toBe(before.tx + 2);
    const results = await prisma.refugeDayResult.findMany({ where: { refugeSessionId: x.sid }, orderBy: { dayNumber: "asc" } });
    expect(results.map((r) => [r.dayNumber, r.status, r.adopteCoinsDelta, r.adoptantCoinsDelta])).toEqual([
      [1, "PERFECT", 10, 10], [2, "PERFECT", 10, 10], [3, "INCOMPLETE_ADOPTANT_MISSING", 5, -5],
      [4, "NOT_PLAYED", 0, 0], [5, "NOT_PLAYED", 0, 0], [6, "NOT_PLAYED", 0, 0], [7, "NOT_PLAYED", 0, 0],
    ]);
    expect(await prisma.refugeDailyChoice.count({ where: { refugeSessionId: x.sid } })).toBe(3);
    expect(await prisma.refugeGuess.count({ where: { refugeSessionId: x.sid } })).toBe(2);

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

  test("décision de dévoilement sur une session expirée : jour 7 non joué = terminée ; jours incomplets soldés une fois", async () => {
    const x = await session("f", { startedAgoMs: 8 * DAY, choices: [1, 2], guesses: [1] });
    const before = { coins: await coins([x.c, x.s]), tx: await movements([x.c, x.s]) };
    expect(await attempt(() => RefugeService.submitRevealConsent(x.sid, x.c, "ACCEPT"))).toMatch(/409 Cette session est terminée/);
    expect(await dbStatus(x.sid)).toBe("ABANDONED");
    // Jour 2 : choix sans réponse → +5 / −5. Jour 1 complet : aucun mouvement (déjà versé à la validation).
    expect(before.coins).toEqual([100, 100]);
    expect(await coins([x.c, x.s])).toEqual([105, 95]);
    expect(await movements([x.c, x.s])).toBe(before.tx + 2);
    expect(await prisma.refugeDayResult.count({ where: { refugeSessionId: x.sid } })).toBe(7);
    // Redemande : aucun second paiement.
    await attempt(() => RefugeService.submitRevealConsent(x.sid, x.s, "ACCEPT"));
    expect(await coins([x.c, x.s])).toEqual([105, 95]);
  });
  test("20 requêtes simultanées sur une session expirée : un seul règlement, aucun double paiement", async () => {
    const x = await session("g", { startedAgoMs: 8 * DAY, choices: [1, 2], guesses: [] });
    const ids = [x.c, x.s];
    const reads = await Promise.all([
      ...Array.from({ length: 7 }, () => RefugeService.getRefugeSession(x.sid, x.s)),
      ...Array.from({ length: 7 }, () => RefugeService.getRefugeSession(x.sid, x.c)),
      ...Array.from({ length: 6 }, () => RefugeService.getActiveRefugeSession(x.c)),
    ]);
    expect(reads.length).toBe(20);
    expect(await dbStatus(x.sid)).toBe("ABANDONED");
    // Jours 1 et 2 incomplets (choix sans réponse) : +5 / −5 chacun, soit +10 / −10, une seule fois.
    expect(await coins(ids)).toEqual([110, 90]);
    expect(await movements(ids)).toBe(4);
    expect(await prisma.refugeDayResult.count({ where: { refugeSessionId: x.sid } })).toBe(7);
    // Relectures ultérieures : rien ne bouge.
    await RefugeService.getRefugeSession(x.sid, x.s);
    await RefugeService.closePastDays(x.sid);
    expect(await coins(ids)).toEqual([110, 90]);
    expect(await movements(ids)).toBe(4);
  }, 40000);

  test("protection contre les soldes négatifs : la pénalité est plafonnée au solde, le montant théorique est conservé", async () => {
    const x = await session("h", { startedAgoMs: 8 * DAY, choices: [1, 2], guesses: [] });
    await prisma.wallet.update({ where: { userId: x.s }, data: { coins: 3 } });
    await RefugeService.getRefugeSession(x.sid, x.c);
    const [c, s] = await coins([x.c, x.s]);
    expect(c).toBe(110);
    expect(s).toBe(0); // 3 − 3 (jour 1, plafonné), puis rien (solde nul) : jamais négatif
    expect(await prisma.wallet.count({ where: { userId: { in: [x.c, x.s] }, coins: { lt: 0 } } })).toBe(0);
    const day1 = await prisma.refugeDayResult.findFirstOrThrow({ where: { refugeSessionId: x.sid, dayNumber: 1 } });
    expect(day1.adoptantCoinsDelta).toBe(-5); // théorique conservé
    expect(await prisma.coinTransaction.findMany({ where: { walletId: x.s }, select: { amount: true } })).toEqual([{ amount: -3 }]);
  });

  test("portefeuille partagé entre deux refuges expirés traités en même temps : aucune perte de mise à jour", async () => {
    const a = await session("i", { startedAgoMs: 8 * DAY, choices: [1], guesses: [] });
    const b = await session("j", { startedAgoMs: 8 * DAY, choices: [1], guesses: [] });
    // Le même parrain est dans les deux sessions.
    await prisma.refugeSession.update({ where: { id: b.sid }, data: { adoptantId: a.s } });
    await prisma.wallet.update({ where: { userId: a.s }, data: { coins: 50 } });
    await Promise.all([RefugeService.getRefugeSession(a.sid, a.c), RefugeService.getRefugeSession(b.sid, b.c)]);
    expect(await coins([a.s])).toEqual([40]); // 50 − 5 − 5, pas 45
  }, 30000);

  test("session déjà clôturée avant le correctif : aucun règlement rétroactif", async () => {
    const x = await session("k", { startedAgoMs: 8 * DAY, choices: [1, 2, 3], guesses: [] });
    await prisma.refugeSession.update({ where: { id: x.sid }, data: { status: "ABANDONED" } });
    const before = { coins: await coins([x.c, x.s]), tx: await movements([x.c, x.s]) };
    await RefugeService.getRefugeSession(x.sid, x.s);
    await RefugeService.getRefugeSession(x.sid, x.c);
    await RefugeService.closePastDays(x.sid);
    expect(await coins([x.c, x.s])).toEqual(before.coins);
    expect(await movements([x.c, x.s])).toBe(before.tx);
    expect(await prisma.refugeDayResult.count({ where: { refugeSessionId: x.sid } })).toBe(0);
  });

  test("jour 7 joué : les autres jours incomplets sont soldés, puis dévoilement utilisable", async () => {
    const x = await session("l", { startedAgoMs: 8 * DAY, choices: [5, 7], guesses: [7] });
    const v: any = await RefugeService.getRefugeSession(x.sid, x.s);
    expect(v.status).toBe("AWAITING_REVEAL_CONSENT");
    // Jour 5 : choix sans réponse → +5 / −5 ; jour 7 complet : récompense déjà versée à la validation (non rejouée ici).
    expect(await coins([x.c, x.s])).toEqual([105, 95]);
    expect(await attempt(() => RefugeService.submitRevealConsent(x.sid, x.c, "ACCEPT"))).toBe("OK");
    expect(await coins([x.c, x.s])).toEqual([105, 95]);
  });

  test("règlement qui échoue : la session n'est pas clôturée (retentée à la lecture suivante)", async () => {
    const x = await session("m", { startedAgoMs: 8 * DAY, choices: [1], guesses: [] });
    const spy = vi.spyOn(RefugeService, "closePastDays").mockRejectedValueOnce(new Error("panne"));
    const quiet = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const v: any = await RefugeService.getRefugeSession(x.sid, x.s);
    spy.mockRestore(); quiet.mockRestore();
    expect(v.status).toBe("ACTIVE");
    expect(await dbStatus(x.sid)).toBe("ACTIVE");
    expect(await coins([x.c, x.s])).toEqual([100, 100]);
    expect(((await RefugeService.getRefugeSession(x.sid, x.s)) as any).status).toBe("ABANDONED");
    expect(await coins([x.c, x.s])).toEqual([105, 95]);
  });
});

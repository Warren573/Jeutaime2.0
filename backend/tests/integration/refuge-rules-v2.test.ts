import { afterAll, describe, expect, it, vi } from "vitest";
vi.mock("../../src/modules/notifications/notify.service", () => ({ notifyEvent: vi.fn().mockResolvedValue(undefined) }));
import { prisma } from "../../src/config/prisma";
import { RefugeService } from "../../src/modules/refuge/refuge.service";

/**
 * Refuge — règles v2 sur un CYCLE COMPLET de sept jours (PostgreSQL réel). Le temps est simulé en reculant `startedAt`.
 */
const run = Date.now() + "-" + Math.random().toString(36).slice(2, 6);
const DAY = 86400000, HOUR = 3600000;
const created: string[] = [];
const test = process.env.TEST_DATABASE_URL ? it : it.skip;

async function pair(tag: string, rulesVersion = 2) {
  const mk = async (suffix: string) => {
    const id = `v2-${tag}-${suffix}-${run}`;
    await prisma.user.create({ data: { id, email: `${id}@example.test`, passwordHash: "x", wallet: { create: { coins: 0 } }, settings: { create: {} }, profile: { create: { pseudo: id.slice(0, 28), birthDate: new Date("1995-01-01"), gender: "HOMME", city: "Paris" } } } });
    created.push(id);
    return id;
  };
  const c = await mk("c"), s = await mk("s");
  const sid = `v2-${tag}-${run}`;
  const startedAt = new Date(Date.now() - 2 * HOUR);
  await prisma.refugeSession.create({ data: { id: sid, adopteId: c, adoptantId: s, animalType: "CHAT", animalCategory: "SIMPLE", animalSexe: "NEUTRE", animalAgeMonths: 12, acceptedSexe: "HOMME_FEMME", status: "ACTIVE", createdAt: new Date(startedAt.getTime() - HOUR), startedAt, endsAt: new Date(startedAt.getTime() + 7 * DAY), rulesVersion } });
  return { c, s, sid };
}
/**
 * Machine à remonter le temps : déplace `startedAt` ET tous les horodatages déjà posés (choix, réponses) du même écart,
 * pour que la chronologie simulée reste cohérente (ex. « validé à la 20e heure du jour 1 » le reste après le saut).
 */
const shiftTo = async (sid: string, startedAt: Date) => {
  const cur = await prisma.refugeSession.findUniqueOrThrow({ where: { id: sid } });
  const deltaMs = startedAt.getTime() - (cur.startedAt as Date).getTime();
  await prisma.$executeRaw`UPDATE "RefugeDailyChoice" SET "submittedAt" = "submittedAt" + (${deltaMs} * interval '1 millisecond') WHERE "refugeSessionId" = ${sid}`;
  await prisma.$executeRaw`UPDATE "RefugeGuess" SET "submittedAt" = "submittedAt" + (${deltaMs} * interval '1 millisecond') WHERE "refugeSessionId" = ${sid}`;
  await prisma.refugeSession.update({ where: { id: sid }, data: { startedAt, endsAt: new Date(startedAt.getTime() + 7 * DAY) } });
};
/** Place la session au jour `day`, `hoursIn` heures après le début de ce jour. */
const at = (sid: string, day: number, hoursIn: number) => shiftTo(sid, new Date(Date.now() - (day - 1) * DAY - hoursIn * HOUR));
const expire = (sid: string) => shiftTo(sid, new Date(Date.now() - 7 * DAY - HOUR));
const ACT = { action1: "NOURRIR", action2: "JOUER" } as const;
const guess = (ok: boolean) => (ok ? { guessedAction1: "NOURRIR", guessedAction2: "JOUER", foodChoice: "food" } : { guessedAction1: "LAVER", guessedAction2: "CARESSER" }) as never;
const coins = async (u: string) => (await prisma.wallet.findUniqueOrThrow({ where: { userId: u } })).coins;
const score = async (u: string) => (await prisma.profile.findUniqueOrThrow({ where: { userId: u } })).discoveryActivityScore;
const txns = (u: string, type?: string) => prisma.coinTransaction.findMany({ where: { walletId: u, ...(type ? { type: type as never } : {}) } });
/** Un jour joué par les deux (compagnon à 2 h, parrain à 3 h). */
async function playDay(x: { c: string; s: string; sid: string }, day: number, ok: boolean) {
  await at(x.sid, day, 2);
  await RefugeService.submitDailyChoice(x.sid, x.c, day, ACT);
  await RefugeService.submitGuess(x.sid, x.s, day, guess(ok));
}

afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: created } } }); await prisma.$disconnect(); });

describe("Refuge v2 — cycle complet de sept jours (PostgreSQL)", () => {
  test("parcours parfait 14/14 : 10 pièces par jour + 100 chacun = 170, bonus unique même sous lectures simultanées", async () => {
    const x = await pair("perfect");
    for (let d = 1; d <= 7; d++) {
      await playDay(x, d, true);
      expect(await coins(x.c)).toBe(d * 10);
      expect(await coins(x.s)).toBe(d * 10);
    }
    await expire(x.sid);
    await Promise.all(Array.from({ length: 12 }, (_, i) => RefugeService.getRefugeSession(x.sid, i % 2 ? x.c : x.s)));
    for (const u of [x.c, x.s]) {
      expect(await coins(u)).toBe(170); // 70 + 100 : maximum
      expect((await txns(u, "REFUGE_FINAL_BONUS")).map((t) => t.amount)).toEqual([100]); // une seule fois
      expect((await txns(u, "REFUGE_DAILY_ASSIDUITY")).length).toBe(7);
      expect(await score(u)).toBe(0);
    }
    const sess = await prisma.refugeSession.findUniqueOrThrow({ where: { id: x.sid } });
    expect(sess.status).toBe("AWAITING_REVEAL_CONSENT");
    expect(sess.finalizedAt).not.toBeNull();
    expect([sess.adopteFinalBonus, sess.adoptantFinalBonus]).toEqual([100, 100]);
    expect(await prisma.refugeDayResult.count({ where: { refugeSessionId: x.sid } })).toBe(7);
  }, 120000);

  test("7/7 d'assiduité sans parcours parfait (mauvaises réponses jamais pénalisées) : 70 + 50 = 120 chacun, bonus non cumulables", async () => {
    const x = await pair("assid");
    for (let d = 1; d <= 7; d++) await playDay(x, d, d % 2 === 0); // alternance 0/2 et 2/2
    await expire(x.sid);
    await RefugeService.getRefugeSession(x.sid, x.s);
    for (const u of [x.c, x.s]) {
      expect(await coins(u)).toBe(120);
      expect((await txns(u, "REFUGE_FINAL_BONUS")).map((t) => t.amount)).toEqual([50]);
      expect(await score(u)).toBe(0); // une mauvaise réponse ne coûte jamais de points
      expect((await txns(u)).every((t) => t.amount > 0)).toBe(true); // aucune pénalité en pièces
    }
  }, 120000);

  test("journée sans choix du compagnon : le parrain consulte (+10, assiduité reconnue), le compagnon perd 5 points ; aucun bonus pour le compagnon", async () => {
    const x = await pair("consult");
    for (let d = 1; d <= 7; d++) {
      if (d === 3) { await at(x.sid, 3, 2); await RefugeService.getRefugeSession(x.sid, x.s); continue; } // consultation seule
      await playDay(x, d, true);
    }
    await expire(x.sid);
    await RefugeService.getRefugeSession(x.sid, x.s);
    const day3 = await prisma.refugeDayResult.findUniqueOrThrow({ where: { refugeSessionId_dayNumber: { refugeSessionId: x.sid, dayNumber: 3 } } });
    expect(day3).toMatchObject({ status: "INCOMPLETE_ADOPTE_MISSING", adopteAssiduous: false, adoptantAssiduous: true, adopteScoreDelta: -5, adoptantScoreDelta: 0, adoptantCoinsDelta: 10, adopteCoinsDelta: 0 });
    expect(await score(x.c)).toBe(-5); // plancher à zéro : AUCUN
    expect(await score(x.s)).toBe(0);
    expect(await coins(x.c)).toBe(60); // 6 jours, pas de bonus (assiduité 6/7)
    expect(await coins(x.s)).toBe(120); // 7 jours d'assiduité reconnue (dont la consultation) : 70 + 50 ; 14/14 impossible (jour 3 non joué)
  }, 120000);

  test("absence des deux : −5 points chacun, aucune pièce ; jamais de pénalité en pièces", async () => {
    const x = await pair("both");
    for (let d = 1; d <= 7; d++) { if (d === 4) continue; await playDay(x, d, true); }
    await expire(x.sid);
    await RefugeService.getRefugeSession(x.sid, x.c);
    const day4 = await prisma.refugeDayResult.findUniqueOrThrow({ where: { refugeSessionId_dayNumber: { refugeSessionId: x.sid, dayNumber: 4 } } });
    expect(day4).toMatchObject({ status: "NOT_PLAYED", adopteScoreDelta: -5, adoptantScoreDelta: -5, adopteCoinsDelta: 0, adoptantCoinsDelta: 0 });
    expect(await score(x.c)).toBe(-5);
    expect(await score(x.s)).toBe(-5);
    expect(await coins(x.c)).toBe(60);
    expect(await coins(x.s)).toBe(60);
    expect((await txns(x.c)).concat(await txns(x.s)).every((t) => t.amount > 0)).toBe(true);
  }, 120000);

  test("actions disponibles au moins 6 h et pas de réponse : −5 points au parrain, 0 pièce ; clôture idempotente (10 appels simultanés)", async () => {
    const x = await pair("absent");
    await at(x.sid, 1, 2);
    await RefugeService.submitDailyChoice(x.sid, x.c, 1, ACT); // validé tôt : actions disponibles ~22 h
    await at(x.sid, 2, 0.5); // la journée 1 est échue
    await Promise.all(Array.from({ length: 10 }, () => RefugeService.closePastDays(x.sid)));
    await RefugeService.closePastDays(x.sid);
    expect(await prisma.refugeDayResult.count({ where: { refugeSessionId: x.sid } })).toBe(1);
    expect(await score(x.s)).toBe(-5); // une seule pénalité
    expect(await score(x.c)).toBe(0);
    expect(await coins(x.c)).toBe(10); // payé à la validation, indépendamment du reste
    expect(await coins(x.s)).toBe(0);
    expect((await txns(x.c, "REFUGE_DAILY_ASSIDUITY")).length).toBe(1);
  }, 60000);

  test("validation tardive (6 dernières heures) : sans consultation ni réponse → ni gain ni pénalité ; avec consultation → +10 et assiduité", async () => {
    const a = await pair("late-none");
    await at(a.sid, 1, 20); // il reste 4 h
    await RefugeService.submitDailyChoice(a.sid, a.c, 1, ACT);
    await at(a.sid, 2, 0.5);
    await RefugeService.closePastDays(a.sid);
    const none = await prisma.refugeDayResult.findUniqueOrThrow({ where: { refugeSessionId_dayNumber: { refugeSessionId: a.sid, dayNumber: 1 } } });
    expect(none).toMatchObject({ adoptantAssiduous: false, adoptantScoreDelta: 0, adoptantCoinsDelta: 0, adopteAssiduous: true, adopteCoinsDelta: 10 });
    expect(await score(a.s)).toBe(0);
    expect(await coins(a.s)).toBe(0);

    const b = await pair("late-consult");
    await at(b.sid, 1, 20);
    await RefugeService.getRefugeSession(b.sid, b.s); // consultation
    await RefugeService.submitDailyChoice(b.sid, b.c, 1, ACT);
    await at(b.sid, 2, 0.5);
    await Promise.all(Array.from({ length: 6 }, () => RefugeService.closePastDays(b.sid)));
    const yes = await prisma.refugeDayResult.findUniqueOrThrow({ where: { refugeSessionId_dayNumber: { refugeSessionId: b.sid, dayNumber: 1 } } });
    expect(yes).toMatchObject({ adoptantAssiduous: true, adoptantScoreDelta: 0, adoptantCoinsDelta: 10 });
    expect(await coins(b.s)).toBe(10); // une seule fois
    expect(await score(b.s)).toBe(0);
  }, 60000);

  test("consultation : un seul bit par jour, écrite une fois (aucune écriture de plus aux lectures suivantes)", async () => {
    const x = await pair("mask");
    await at(x.sid, 2, 1);
    await Promise.all(Array.from({ length: 8 }, () => RefugeService.getRefugeSession(x.sid, x.s)));
    await RefugeService.getRefugeSession(x.sid, x.c); // le compagnon ne compte pas
    expect((await prisma.refugeSession.findUniqueOrThrow({ where: { id: x.sid } })).adoptantConsultMask).toBe(0b10);
    await at(x.sid, 5, 1);
    await RefugeService.getRefugeSession(x.sid, x.s);
    expect((await prisma.refugeSession.findUniqueOrThrow({ where: { id: x.sid } })).adoptantConsultMask).toBe(0b10010);
  }, 60000);

  test("dévoilement : JAMAIS avant 168 h (jour 7 terminé inclus) ; ensuite proposé même si personne n'a participé", async () => {
    const x = await pair("reveal");
    for (let d = 1; d <= 7; d++) await playDay(x, d, true);
    const early: any = await RefugeService.getRefugeSession(x.sid, x.c);
    expect(early.reveal.available).toBe(false);
    expect(early.finalConsentAvailable).toBe(false);
    await expect(RefugeService.submitRevealConsent(x.sid, x.c, "ACCEPT")).rejects.toMatchObject({ statusCode: 409 });
    expect((await prisma.refugeSession.findUniqueOrThrow({ where: { id: x.sid } })).adopteRevealDecision).toBeNull();

    const y = await pair("nobody"); // aucune participation
    await expire(y.sid);
    const late: any = await RefugeService.getRefugeSession(y.sid, y.c);
    expect(late.status).toBe("AWAITING_REVEAL_CONSENT");
    expect(late.reveal.available).toBe(true);
    expect(await score(y.c)).toBe(-35); // sept jours d'absence des deux : −35 chacun, aucun plafond
    expect(await score(y.s)).toBe(-35);
    expect(await coins(y.c)).toBe(0);
  }, 120000);

  test("classement : un score négatif range simplement le profil après les autres (aucun plancher)", async () => {
    const x = await pair("rank");
    await prisma.profile.update({ where: { userId: x.c }, data: { discoveryActivityScore: -35 } });
    const ranked = await prisma.profile.findMany({ where: { userId: { in: [x.c, x.s] } }, orderBy: [{ discoveryActivityScore: "desc" }, { createdAt: "asc" }], select: { userId: true } });
    expect(ranked.map((r) => r.userId)).toEqual([x.s, x.c]);
  });

  test("session v1 (existante) : aucune règle v2 — ni pièces d'assiduité, ni points, ni bonus (pas de rétroactivité)", async () => {
    const x = await pair("legacy", 1);
    await at(x.sid, 1, 2);
    await RefugeService.submitDailyChoice(x.sid, x.c, 1, ACT);
    expect(await coins(x.c)).toBe(0); // v1 : récompense seulement quand les deux ont joué
    await RefugeService.submitGuess(x.sid, x.s, 1, guess(false)); // 0/2 → 0 pièce en v1
    expect(await coins(x.c)).toBe(0);
    expect(await coins(x.s)).toBe(0);
    await at(x.sid, 3, 1);
    await RefugeService.closePastDays(x.sid); // jour 2 : personne → NOT_PLAYED, aucun point retiré en v1
    expect(await score(x.c)).toBe(0);
    expect(await score(x.s)).toBe(0);
  }, 60000);
});

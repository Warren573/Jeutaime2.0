import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "../../src/config/prisma";
import { RefugeService } from "../../src/modules/refuge/refuge.service";
import { resetPushIdempotency } from "../../src/modules/notifications/push.service";

/**
 * Bilan final des sept jours + notification unique de fin + confirmation d'adoption (PostgreSQL réel, vrai notifyEvent,
 * push Expo simulé). Le temps est simulé en reculant startedAt ET les horodatages déjà posés.
 */
const test = process.env.TEST_DATABASE_URL ? it : it.skip;
const run = Date.now() + "-" + Math.random().toString(36).slice(2, 6);
const DAY = 86400000, HOUR = 3600000;
const created: string[] = [];
let expo: ReturnType<typeof vi.fn>;
const tokenFor = (id: string) => `ExponentPushToken[fr${id.replace(/[^A-Za-z0-9]/g, "")}]`;
const sent = () => expo.mock.calls.flatMap((c: any[]) => (JSON.parse(c[1].body as string) as Array<{ to: string; body: string; title: string; data: Record<string, string> }>));
const settle = () => new Promise((r) => setTimeout(r, 450));
const attempt = async (f: () => Promise<unknown>) => { try { await f(); return "OK"; } catch (e: any) { return `${e.statusCode} ${e.message}`; } };
const types = ["REFUGE_ADOPTED", "REFUGE_ADOPTION_CONFIRMED", "REFUGE_FINAL_REPORT", "REFUGE_REVEAL_PHASE", "REFUGE_EXPIRED", "REFUGE_REVEALED"] as never[];
const rows = (u: string) => prisma.notification.findMany({ where: { userId: u, type: { in: types } }, orderBy: { createdAt: "asc" } });
const kinds = async (u: string) => (await rows(u)).map((n) => n.type as string).sort();

async function users(tag: string) {
  const mk = async (suffix: string, g: "HOMME" | "FEMME") => {
    const id = `fr-${tag}-${suffix}-${run}`;
    await prisma.user.create({ data: { id, email: `${id}@example.test`, passwordHash: "x", wallet: { create: { coins: 0 } }, settings: { create: {} }, profile: { create: { pseudo: id.slice(0, 28), birthDate: new Date("1995-01-01"), gender: g, city: "Paris" } }, pushTokens: { create: { token: tokenFor(id), platform: "ios" } } } });
    created.push(id);
    return id;
  };
  return { c: await mk("c", "HOMME"), s: await mk("s", "FEMME") };
}
async function adopted(tag: string) {
  const u = await users(tag);
  const proposal = await RefugeService.proposeAsAdopte(u.c, { animalType: "CHAT", acceptedSexe: "HOMME_FEMME" } as never);
  await RefugeService.adoptRefuge(u.s, proposal.id);
  return { ...u, sid: proposal.id };
}
const shiftTo = async (sid: string, startedAt: Date) => {
  const cur = await prisma.refugeSession.findUniqueOrThrow({ where: { id: sid } });
  const deltaMs = startedAt.getTime() - (cur.startedAt as Date).getTime();
  await prisma.$executeRaw`UPDATE "RefugeDailyChoice" SET "submittedAt" = "submittedAt" + (${deltaMs} * interval '1 millisecond') WHERE "refugeSessionId" = ${sid}`;
  await prisma.$executeRaw`UPDATE "RefugeGuess" SET "submittedAt" = "submittedAt" + (${deltaMs} * interval '1 millisecond') WHERE "refugeSessionId" = ${sid}`;
  await prisma.refugeSession.update({ where: { id: sid }, data: { startedAt, endsAt: new Date(startedAt.getTime() + 7 * DAY) } });
};
const at = (sid: string, day: number, h: number) => shiftTo(sid, new Date(Date.now() - (day - 1) * DAY - h * HOUR));
const expire = (sid: string) => shiftTo(sid, new Date(Date.now() - 7 * DAY - HOUR));
const ok = { guessedAction1: "NOURRIR", guessedAction2: "JOUER", foodChoice: "food" } as never;
const ACT = { action1: "NOURRIR", action2: "JOUER" } as const;
async function play(x: { c: string; s: string; sid: string }, day: number) {
  await at(x.sid, day, 2);
  await RefugeService.submitDailyChoice(x.sid, x.c, day, ACT);
  await RefugeService.submitGuess(x.sid, x.s, day, ok);
}

beforeAll(() => {
  expo = vi.fn(async (_u: unknown, init: { body: string }) => new Response(JSON.stringify({ data: (JSON.parse(init.body) as unknown[]).map((_, i) => ({ status: "ok", id: `tk-${run}-${i}` })) }), { status: 200 }));
  vi.stubGlobal("fetch", expo);
});
afterEach(() => { expo.mockClear(); resetPushIdempotency(); });
afterAll(async () => {
  vi.unstubAllGlobals();
  await prisma.pushToken.deleteMany({ where: { userId: { in: created } } });
  await prisma.user.deleteMany({ where: { id: { in: created } } });
  await prisma.$disconnect();
});

describe("Refuge — bilan final, notification unique, historique du parrain (PostgreSQL)", () => {
  test("adoption : le compagnon reçoit notification + push ; le parrain/la marraine reçoit UNE ligne d'historique, JAMAIS de push", async () => {
    const x = await adopted("adopt");
    await settle();
    expect(await kinds(x.c)).toEqual(["REFUGE_ADOPTED"]);
    expect(await kinds(x.s)).toEqual(["REFUGE_ADOPTION_CONFIRMED"]);
    expect((await rows(x.s))[0]!.message).toBe("Tu as adopté un compagnon. Votre aventure de sept jours commence.");
    expect(sent().map((m) => m.to)).toEqual([tokenFor(x.c)]); // aucun push vers le parrain/la marraine
    expect(sent().some((m) => m.data["type"] === "REFUGE_ADOPTION_CONFIRMED")).toBe(false);
  }, 60000);

  test("parcours parfait : UNE notification de fin par participant (pas de dévoilement ni d'expiration), bilan complet 14/14, 170 pièces", async () => {
    const x = await adopted("perfect");
    for (let d = 1; d <= 7; d++) await play(x, d);
    await settle();
    expect(await kinds(x.c)).not.toContain("REFUGE_REVEAL_PHASE"); // jamais avant 168 h
    expo.mockClear();
    await expire(x.sid);
    await Promise.all(Array.from({ length: 12 }, (_, i) => RefugeService.getRefugeSession(x.sid, i % 2 ? x.c : x.s)));
    await settle();
    for (const u of [x.c, x.s]) {
      const k = await kinds(u);
      expect(k.filter((t) => t === "REFUGE_FINAL_REPORT")).toHaveLength(1);
      expect(k).not.toContain("REFUGE_REVEAL_PHASE");
      expect(k).not.toContain("REFUGE_EXPIRED");
    }
    expect(sent().filter((m) => m.data["type"] === "REFUGE_FINAL_REPORT").map((m) => m.to).sort()).toEqual([tokenFor(x.c), tokenFor(x.s)].sort());
    const report = async (u: string) => ((await RefugeService.getRefugeSession(x.sid, u)) as any).finalReport;
    for (const u of [x.c, x.s]) {
      const r = await report(u);
      expect(r).toMatchObject({ participationDays: 7, perfectDays: 7, correctActions: 14, perfectCourse: true, dailyCoins: 70, finalBonus: 100, bonusTier: "perfect", totalCoins: 170, penaltyPoints: 0 });
      expect(r.days).toHaveLength(7);
      expect(r.days.every((d: any) => d.assiduous && d.coins === 10 && d.points === 0 && d.matches === 2)).toBe(true);
      expect(JSON.stringify(r)).not.toMatch(/pseudo|userId|email/i); // aucune identité avant dévoilement
    }
  }, 120000);

  test("parcours partiel : bilan propre à chaque participant (jour manqué, consultation, points), bonus 50 ou aucun", async () => {
    const x = await adopted("partial");
    for (let d = 1; d <= 7; d++) {
      if (d === 3) { await at(x.sid, 3, 2); await RefugeService.getRefugeSession(x.sid, x.s); continue; } // le compagnon ne valide pas ; le parrain consulte
      await play(x, d);
    }
    await expire(x.sid);
    const comp: any = (await RefugeService.getRefugeSession(x.sid, x.c) as any).finalReport;
    const spon: any = (await RefugeService.getRefugeSession(x.sid, x.s) as any).finalReport;
    expect(comp).toMatchObject({ participationDays: 6, perfectDays: 6, correctActions: 12, perfectCourse: false, dailyCoins: 60, finalBonus: 0, bonusTier: null, totalCoins: 60, penaltyPoints: -5 });
    expect(comp.days[2]).toMatchObject({ dayNumber: 3, assiduous: false, coins: 0, points: -5, matches: null });
    expect(spon).toMatchObject({ participationDays: 7, dailyCoins: 70, finalBonus: 50, bonusTier: "assiduity", totalCoins: 120, penaltyPoints: 0 });
    expect(spon.days[2]).toMatchObject({ assiduous: true, coins: 10, points: 0 });
  }, 120000);

  test("dévoilement : refusé avant 168 h, proposé ensuite ; le bilan reste accessible après le dévoilement mutuel ; identités seulement alors", async () => {
    const x = await adopted("reveal");
    for (let d = 1; d <= 7; d++) await play(x, d);
    expect(await attempt(() => RefugeService.submitRevealConsent(x.sid, x.c, "ACCEPT"))).toMatch(/^409/);
    await expire(x.sid);
    const before: any = await RefugeService.getRefugeSession(x.sid, x.c);
    expect(before.reveal.available).toBe(true);
    expect(before.otherProfile).toBeUndefined();
    await RefugeService.submitRevealConsent(x.sid, x.c, "ACCEPT");
    const mid: any = await RefugeService.getRefugeSession(x.sid, x.s);
    expect(mid.otherProfile).toBeUndefined(); // un seul accord : rien n'est révélé
    const done: any = await RefugeService.submitRevealConsent(x.sid, x.s, "ACCEPT");
    expect(done.status).toBe("REVEALED");
    expect(done.otherProfile?.pseudo).toBeTruthy();
    expect(done.finalReport.totalCoins).toBe(170); // indépendant du dévoilement
  }, 120000);

  test("refus du dévoilement : les récompenses finales restent acquises", async () => {
    const x = await adopted("refuse");
    for (let d = 1; d <= 7; d++) await play(x, d);
    await expire(x.sid);
    await RefugeService.getRefugeSession(x.sid, x.c);
    await RefugeService.submitRevealConsent(x.sid, x.c, "REFUSE");
    expect((await prisma.wallet.findUniqueOrThrow({ where: { userId: x.c } })).coins).toBe(170);
    expect((await prisma.wallet.findUniqueOrThrow({ where: { userId: x.s } })).coins).toBe(170);
  }, 120000);
});

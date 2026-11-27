import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/config/prisma";
import { RefugeService } from "../../src/modules/refuge/refuge.service";

/** Petites attentions (PostgreSQL réel, notifications réelles de l'historique). */
const run = Date.now() + "-" + Math.random().toString(36).slice(2, 6);
const DAY = 86400000, HOUR = 3600000;
const created: string[] = [];
const test = process.env.TEST_DATABASE_URL ? it : it.skip;

async function pair(tag: string, sponsorGender: "HOMME" | "FEMME" | "AUTRE" = "HOMME") {
  const mk = async (suffix: string, g: "HOMME" | "FEMME" | "AUTRE") => {
    const id = `at-${tag}-${suffix}-${run}`;
    await prisma.user.create({ data: { id, email: `${id}@example.test`, passwordHash: "x", wallet: { create: { coins: 0 } }, settings: { create: {} }, profile: { create: { pseudo: id.slice(0, 28), birthDate: new Date("1995-01-01"), gender: g, city: "Paris" } } } });
    created.push(id);
    return id;
  };
  const c = await mk("c", "HOMME"), s = await mk("s", sponsorGender);
  const sid = `at-${tag}-${run}`;
  const startedAt = new Date(Date.now() - 2 * HOUR);
  await prisma.refugeSession.create({ data: { id: sid, adopteId: c, adoptantId: s, animalType: "CHAT", animalCategory: "SIMPLE", animalSexe: "NEUTRE", animalAgeMonths: 12, acceptedSexe: "HOMME_FEMME", status: "ACTIVE", createdAt: new Date(startedAt.getTime() - HOUR), startedAt, endsAt: new Date(startedAt.getTime() + 7 * DAY), rulesVersion: 2 } });
  return { c, s, sid };
}
const settle = () => new Promise((r) => setTimeout(r, 500));
const rows = (u: string) => prisma.notification.findMany({ where: { userId: u, type: "REFUGE_ATTENTION" as never } });
const attempt = async (f: () => Promise<unknown>) => { try { await f(); return "OK"; } catch (e: any) { return `${e.statusCode} ${e.message}`; } };

afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: created } } }); await prisma.$disconnect(); });

describe("Refuge — petites attentions (PostgreSQL)", () => {
  test("une seule attention par jour, même sous 10 requêtes simultanées ; une seule notification, texte selon geste et genre", async () => {
    const x = await pair("one", "FEMME");
    const res = await Promise.all(Array.from({ length: 10 }, () => attempt(() => RefugeService.sendAttention(x.sid, x.s, "GRATTER_TETE" as never))));
    expect(res.filter((r) => r === "OK")).toHaveLength(1);
    expect(res.filter((r) => r !== "OK").every((r) => r.startsWith("409"))).toBe(true);
    await settle();
    const n = await rows(x.c);
    expect(n).toHaveLength(1);
    expect(n[0]!.message).toBe("Ta marraine est passée te gratter la tête.");
    expect(await rows(x.s)).toHaveLength(0); // jamais l'auteur
    const v: any = await RefugeService.getRefugeSession(x.sid, x.s);
    expect(v.attention).toMatchObject({ kind: "GRATTER_TETE" });
    expect(v.canSendAttention).toBe(false);
    const w: any = await RefugeService.getRefugeSession(x.sid, x.c);
    expect(w.attention).toMatchObject({ kind: "GRATTER_TETE" }); // visible des deux (réaction du compagnon)
    expect(w.canSendAttention).toBe(false);
  }, 60000);

  test("disponible seulement avant la validation du compagnon ; refusée ensuite ; réservée au parrain / à la marraine", async () => {
    const x = await pair("rules");
    const before: any = await RefugeService.getRefugeSession(x.sid, x.s);
    expect(before.canSendAttention).toBe(true);
    expect(((await RefugeService.getRefugeSession(x.sid, x.c)) as any).canSendAttention).toBe(false); // le compagnon n'en envoie pas
    expect(await attempt(() => RefugeService.sendAttention(x.sid, x.c, "BONJOUR" as never))).toMatch(/^403/);
    await RefugeService.submitDailyChoice(x.sid, x.c, 1, { action1: "NOURRIR", action2: "JOUER" });
    expect(((await RefugeService.getRefugeSession(x.sid, x.s)) as any).canSendAttention).toBe(false); // les trois boutons disparaissent
    expect(await attempt(() => RefugeService.sendAttention(x.sid, x.s, "BONJOUR" as never))).toMatch(/^409 Ton compagnon a déjà validé/);
    await settle();
    expect(await rows(x.c)).toHaveLength(0);
  }, 60000);

  test("aucun gain : ni pièces ni points de classement ; réinitialisation au jour suivant (fenêtre de 24 h)", async () => {
    const x = await pair("reset");
    const coinsBefore = (await prisma.wallet.findUniqueOrThrow({ where: { userId: x.s } })).coins;
    await RefugeService.sendAttention(x.sid, x.s, "CARESSE" as never);
    expect((await prisma.wallet.findUniqueOrThrow({ where: { userId: x.s } })).coins).toBe(coinsBefore);
    expect((await prisma.profile.findUniqueOrThrow({ where: { userId: x.s } })).discoveryActivityScore).toBe(0);
    expect(await prisma.coinTransaction.count({ where: { walletId: { in: [x.c, x.s] } } })).toBe(0);
    expect(await attempt(() => RefugeService.sendAttention(x.sid, x.s, "BONJOUR" as never))).toMatch(/^409/);
    // Le jour suivant (24 h plus tard) : de nouveau disponible, nouvelle notification (clé du jour 2).
    const startedAt = new Date(Date.now() - DAY - 2 * HOUR);
    await prisma.refugeSession.update({ where: { id: x.sid }, data: { startedAt, endsAt: new Date(startedAt.getTime() + 7 * DAY) } });
    expect(((await RefugeService.getRefugeSession(x.sid, x.s)) as any).canSendAttention).toBe(true);
    expect(await attempt(() => RefugeService.sendAttention(x.sid, x.s, "BONJOUR" as never))).toBe("OK");
    await settle();
    expect((await rows(x.c)).map((n) => n.message).sort()).toEqual(["Ton parrain est passé te dire bonjour.", "Ton parrain est passé te faire une caresse."].sort());
  }, 60000);

  test("session non active (expirée) : refusée", async () => {
    const x = await pair("exp");
    const startedAt = new Date(Date.now() - 8 * DAY);
    await prisma.refugeSession.update({ where: { id: x.sid }, data: { startedAt, endsAt: new Date(startedAt.getTime() + 7 * DAY) } });
    expect(await attempt(() => RefugeService.sendAttention(x.sid, x.s, "BONJOUR" as never))).toMatch(/^409/);
  }, 60000);
});

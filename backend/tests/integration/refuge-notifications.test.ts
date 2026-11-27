import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "../../src/config/prisma";
import { RefugeService } from "../../src/modules/refuge/refuge.service";
import { notifyRefugeNewDayJob, resetHandledNewDays } from "../../src/jobs/notifyRefugeNewDay";
import { resetPushIdempotency } from "../../src/modules/notifications/push.service";

/**
 * Notifications du Refuge, de bout en bout (PostgreSQL réel, vrai `notifyEvent`, push Expo simulé) :
 * événement → destinataire → texte → redirection → anti-doublon → push uniquement avec un appareil.
 * Nécessite TEST_DATABASE_URL.
 */
const test = process.env.TEST_DATABASE_URL ? it : it.skip;
const run = Date.now() + "-" + Math.random().toString(36).slice(2, 6);
const DAY = 86400000, HOUR = 3600000;
const created: string[] = [];
const tokenFor = (tag: string) => `ExponentPushToken[rn${tag}${run.replace(/[^A-Za-z0-9]/g, "")}]`;
let expo: ReturnType<typeof vi.fn>;

async function pair(tag: string, gender: "HOMME" | "FEMME" | "AUTRE" = "FEMME", withToken = false) {
  const mk = async (suffix: string, g: "HOMME" | "FEMME" | "AUTRE") => {
    const id = `rn-${tag}-${suffix}-${run}`;
    await prisma.user.create({
      data: {
        id, email: `${id}@example.test`, passwordHash: "x",
        wallet: { create: { coins: 100 } }, settings: { create: {} },
        profile: { create: { pseudo: id.slice(0, 28), birthDate: new Date("1995-01-01"), gender: g, city: "Paris" } },
      },
    });
    created.push(id);
    return id;
  };
  const companion = await mk("c", "HOMME");
  const sponsor = await mk("s", gender);
  const token = tokenFor(tag);
  if (withToken) await prisma.pushToken.create({ data: { userId: companion, token, platform: "ios" } });
  return { companion, sponsor, token };
}

/** Session ACTIVE démarrée il y a `startedAgoMs`, avec éventuellement des choix / réponses déjà posés. */
async function activeSession(tag: string, p: { companion: string; sponsor: string }, startedAgoMs: number, choices: number[] = [], guesses: number[] = []) {
  const startedAt = new Date(Date.now() - startedAgoMs);
  const id = `rn-${tag}-${run}`;
  await prisma.refugeSession.create({
    data: {
      id, adopteId: p.companion, adoptantId: p.sponsor, animalType: "CHAT", animalCategory: "SIMPLE", animalSexe: "NEUTRE", animalAgeMonths: 12,
      acceptedSexe: "HOMME_FEMME", status: "ACTIVE", createdAt: new Date(startedAt.getTime() - HOUR), startedAt,
      endsAt: new Date(startedAt.getTime() + 7 * DAY),
    },
  });
  for (const d of choices) await prisma.refugeDailyChoice.create({ data: { refugeSessionId: id, dayNumber: d, action1: "NOURRIR", action2: "JOUER", submittedAt: new Date(startedAt.getTime() + (d - 1) * DAY + HOUR) } });
  for (const d of guesses) await prisma.refugeGuess.create({ data: { refugeSessionId: id, dayNumber: d, guessedAction1: "NOURRIR", guessedAction2: "JOUER", submittedAt: new Date(startedAt.getTime() + (d - 1) * DAY + 2 * HOUR) } });
  return id;
}

const rows = (userId: string) => prisma.notification.findMany({ where: { userId, type: { in: refugeTypes } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
const refugeTypes = ["REFUGE_ADOPTED", "REFUGE_CHOICE_READY", "REFUGE_RESULT_READY", "REFUGE_DAY_RESULT", "REFUGE_NEW_DAY", "REFUGE_COINS", "REFUGE_REVEAL_PHASE", "REFUGE_REVEALED", "REFUGE_ADOPTION_CONFIRMED", "REFUGE_FINAL_REPORT", "REFUGE_REVEAL_REFUSED", "REFUGE_EXPIRED"] as never[];
/** Types reçus, triés : les notifications d'un même événement sont créées en parallèle (ordre non significatif). */
const summary = async (userId: string) => (await rows(userId)).map((n) => `${n.type}`).sort();
const dbStatusOf = async (id: string) => (await prisma.refugeSession.findUniqueOrThrow({ where: { id }, select: { status: true } })).status;
async function settle(ms = 400) { await new Promise((r) => setTimeout(r, ms)); }
const attempt = async (f: () => Promise<unknown>) => { try { await f(); return "OK"; } catch (e: any) { return `${e.statusCode ?? ""} ${e.message}`; } };
const bodiesSentToExpo = () => expo.mock.calls.flatMap((c: any[]) => (JSON.parse(c[1].body as string) as Array<{ to: string; body: string; data: Record<string, string> }>));

beforeAll(() => {
  expo = vi.fn(async (_u: unknown, init: { body: string }) =>
    new Response(JSON.stringify({ data: (JSON.parse(init.body) as unknown[]).map((_, i) => ({ status: "ok", id: `tk-${run}-${i}` })) }), { status: 200 }));
  vi.stubGlobal("fetch", expo);
});
afterEach(() => { expo.mockClear(); resetPushIdempotency(); resetHandledNewDays(); });
afterAll(async () => {
  vi.unstubAllGlobals();
  await prisma.pushToken.deleteMany({ where: { userId: { in: created } } });
  await prisma.match.deleteMany({ where: { OR: [{ userAId: { in: created } }, { userBId: { in: created } }] } }); await prisma.reaction.deleteMany({ where: { OR: [{ fromId: { in: created } }, { toId: { in: created } }] } }); await prisma.user.deleteMany({ where: { id: { in: created } } });
  await prisma.$disconnect();
});

describe("Refuge : parcours complet des notifications (base réelle)", () => {
  test("incarnation → adoption → actions du jour : chaque événement, son destinataire, son texte, son push", async () => {
    const p = await pair("flow", "FEMME", true);

    // INCARNATION : aucune notification.
    const proposal = await RefugeService.proposeAsAdopte(p.companion, { animalType: "CHAT", acceptedSexe: "HOMME_FEMME" } as never);
    await settle();
    expect(await summary(p.companion)).toEqual([]);
    expect(await summary(p.sponsor)).toEqual([]);

    // ADOPTION : le compagnon seulement, texte demandé, push avec redirection vers CE refuge.
    await RefugeService.adoptRefuge(p.sponsor, proposal.id);
    await settle();
    const adopted = await rows(p.companion);
    expect(adopted.map((n) => [n.type, n.message, n.meta])).toEqual([["REFUGE_ADOPTED", "Tu as été adopté ! Ton aventure de sept jours commence.", { refugeSessionId: proposal.id }]]);
    // Le parrain / la marraine reçoit seulement une ligne d'HISTORIQUE (confirmation d'adoption), jamais de push.
    expect((await rows(p.sponsor)).map((n) => [n.type, n.message])).toEqual([["REFUGE_ADOPTION_CONFIRMED", "Tu as adopté un compagnon. Votre aventure de sept jours commence."]]);
    expect(bodiesSentToExpo().map((m) => [m.to, m.body, m.data])).toEqual([[p.token, "Tu as été adopté ! Ton aventure de sept jours commence.", { type: "REFUGE_ADOPTED", refugeSessionId: proposal.id }]]);

    // LE COMPAGNON VALIDE SES 2 ACTIONS : le parrain/la marraine est prévenu, sans action nommée ; pas de push (aucun appareil).
    expo.mockClear();
    await RefugeService.submitDailyChoice(proposal.id, p.companion, 1, { action1: "NOURRIR", action2: "JOUER" });
    await settle();
    expect((await rows(p.sponsor)).filter((n) => n.type !== ("REFUGE_ADOPTION_CONFIRMED" as never)).map((n) => [n.type, n.message])).toEqual([["REFUGE_CHOICE_READY", "Ton compagnon attend tes deux actions du jour."]]);
    expect(await summary(p.companion)).toEqual(["REFUGE_ADOPTED"]);
    expect(expo).not.toHaveBeenCalled(); // le parrain/la marraine n'a pas d'appareil : notification interne seulement

    // LE PARRAIN/LA MARRAINE VALIDE : score + pièces pour lui/elle ; « résultat prêt » (sans score) pour le compagnon.
    await RefugeService.submitGuess(proposal.id, p.sponsor, 1, { guessedAction1: "NOURRIR", guessedAction2: "JOUER", foodChoice: "food" } as never);
    await settle();
    expect(await summary(p.sponsor)).toEqual(["REFUGE_ADOPTION_CONFIRMED", "REFUGE_CHOICE_READY", "REFUGE_DAY_RESULT"].sort());
    expect((await rows(p.sponsor)).find((n) => n.type === ("REFUGE_DAY_RESULT" as never))!.message).toBe("Résultat du jour : 2/2, bravo ! +10 pièces.");
    const ready = (await rows(p.companion)).find((n) => n.type === ("REFUGE_RESULT_READY" as never))!;
    expect(ready.type).toBe("REFUGE_RESULT_READY");
    expect(ready.message).toBe("Ta marraine a validé ses actions : découvre le résultat du jour."); // genre FEMME
    expect(ready.message).not.toMatch(/\d|pièce/); // aucun score avant l'ouverture du Refuge
    expect(ready.meta).toEqual({ refugeSessionId: proposal.id });
    // Push du compagnon : même texte que la cloche, redirection vers le Refuge.
    expect(bodiesSentToExpo().map((m) => [m.body, m.data])).toEqual([[ready.message, { type: "REFUGE_RESULT_READY", refugeSessionId: proposal.id }]]);

    // Pièces d'un jour complet : versées à la validation, annoncées UNE fois (dans le score du parrain/de la marraine), pas de message de pièces en plus.
    expect(await prisma.notification.count({ where: { userId: { in: [p.companion, p.sponsor] }, type: "REFUGE_COINS" as never } })).toBe(0);
    expect((await prisma.wallet.findMany({ where: { userId: { in: [p.companion, p.sponsor] } }, select: { coins: true } })).map((w) => w.coins)).toEqual([110, 110]);

    // AUCUN DOUBLON : rejouer la réponse ou le choix (double clic, nouvelle tentative) est refusé et ne notifie rien.
    const before = [await summary(p.companion), await summary(p.sponsor)];
    expect(await attempt(() => RefugeService.submitGuess(proposal.id, p.sponsor, 1, { guessedAction1: "NOURRIR", guessedAction2: "JOUER", foodChoice: "food" } as never))).toMatch(/409/);
    expect(await attempt(() => RefugeService.submitDailyChoice(proposal.id, p.companion, 1, { action1: "NOURRIR", action2: "JOUER" }))).toMatch(/409/);
    await settle();
    expect([await summary(p.companion), await summary(p.sponsor)]).toEqual(before);

    // Aucune notification de rencontre, de lettre ni de match pour tout ce parcours.
    expect(await prisma.notification.count({ where: { userId: { in: [p.companion, p.sponsor] }, type: { in: ["MATCH_CREATED", "QUESTIONS_PASSED", "QUESTIONS_TURN", "LETTER_RECEIVED"] as never[] } } })).toBe(0);
  }, 60000);

  test("genre du parrain/de la marraine : « parrain », « marraine », formulation double", async () => {
    for (const [gender, expected] of [["HOMME", "Ton parrain a validé ses actions : découvre le résultat du jour."], ["AUTRE", "Ton parrain ou ta marraine a validé ses actions : découvre le résultat du jour."]] as const) {
      const p = await pair(`g${gender}`, gender);
      const id = await activeSession(`g${gender}`, p, 2 * HOUR, [1]);
      await RefugeService.submitGuess(id, p.sponsor, 1, { guessedAction1: "LAVER", guessedAction2: "CARESSER", foodChoice: null } as never);
      await settle();
      expect((await rows(p.companion)).map((n) => n.message)).toEqual([expected]);
      expect((await rows(p.sponsor)).find((n) => n.type === ("REFUGE_DAY_RESULT" as never))!.message).toBe("Résultat du jour : 0/2."); // 0/2 : pas de pièces
    }
  }, 30000);

  test("résultat 1/2 : score annoncé avec +5 pièces", async () => {
    const p = await pair("half");
    const id = await activeSession("half", p, 2 * HOUR, [1]);
    await RefugeService.submitGuess(id, p.sponsor, 1, { guessedAction1: "NOURRIR", guessedAction2: "LAVER", foodChoice: "food" } as never);
    await settle();
    expect((await rows(p.sponsor)).find((n) => n.type === ("REFUGE_DAY_RESULT" as never))!.message).toBe("Résultat du jour : 1/2. +5 pièces.");
  });
});

describe("Refuge : pièces appliquées (règlement), jour 7, dévoilement, expiration, nouvelle journée", () => {
  test("règlement d'une journée incomplète : montants EFFECTIVEMENT appliqués, une notification par participant, jamais deux fois", async () => {
    const p = await pair("coins");
    await prisma.wallet.update({ where: { userId: p.sponsor }, data: { coins: 3 } }); // la pénalité −5 sera plafonnée à −3
    const id = await activeSession("coins", p, 1 * DAY + 2 * HOUR, [1]);
    await Promise.all(Array.from({ length: 10 }, () => RefugeService.closePastDays(id))); // 10 appels simultanés
    await RefugeService.closePastDays(id); // et un de plus plus tard
    await settle();
    expect((await rows(p.companion)).map((n) => [n.type, n.message])).toEqual([["REFUGE_COINS", "Refuge : +5 pièces ajoutées à ton solde."]]);
    expect((await rows(p.sponsor)).map((n) => [n.type, n.message])).toEqual([["REFUGE_COINS", "Refuge : 3 pièces retirées de ton solde."]]);
    expect((await prisma.wallet.findMany({ where: { userId: { in: [p.companion, p.sponsor] } }, orderBy: { userId: "asc" }, select: { coins: true } })).map((w) => w.coins).sort()).toEqual([0, 105]);
  }, 60000);

  test("jour 7 : AUCUN dévoilement avant 168 h ; à l'expiration, les DEUX participants sont prévenus une fois ; refus → l'autre seulement", async () => {
    const p = await pair("end");
    const id = await activeSession("end", p, 6 * DAY + 2 * HOUR);
    await RefugeService.submitDailyChoice(id, p.companion, 7, { action1: "NOURRIR", action2: "JOUER" });
    await RefugeService.submitGuess(id, p.sponsor, 7, { guessedAction1: "NOURRIR", guessedAction2: "JOUER", foodChoice: "food" } as never);
    await settle();
    // Jour 7 terminé mais 168 h non écoulées : résultat du jour seulement, aucune notification de dévoilement.
    expect(await summary(p.companion)).toEqual(["REFUGE_RESULT_READY"]);
    expect(await summary(p.sponsor)).toEqual(["REFUGE_CHOICE_READY", "REFUGE_DAY_RESULT"].sort());
    const early: any = await RefugeService.getRefugeSession(id, p.companion);
    expect(early.reveal.available).toBe(false);
    expect(await attempt(() => RefugeService.submitRevealConsent(id, p.companion, "ACCEPT"))).toMatch(/409 Le dévoilement n'est possible qu'à la fin des sept jours/);

    // Les 168 h s'écoulent : la lecture clôture la session et propose le dévoilement.
    const startedAt = new Date(Date.now() - 7 * DAY - HOUR);
    await prisma.refugeSession.update({ where: { id }, data: { startedAt, endsAt: new Date(startedAt.getTime() + 7 * DAY) } });
    await Promise.all(Array.from({ length: 5 }, () => RefugeService.getRefugeSession(id, p.companion)));
    await settle();
    // Fin AUTOMATIQUE : UNE seule notification de fin par personne (bilan), jamais de « choix » à faire, ni de dévoilement à accepter.
    expect(await summary(p.companion)).toEqual(["REFUGE_FINAL_REPORT", "REFUGE_RESULT_READY"].sort());
    expect((await rows(p.companion)).find((n) => n.type === ("REFUGE_FINAL_REPORT" as never))!.message).toBe("Le bilan de votre aventure est prêt.");
    expect(await summary(p.sponsor)).toEqual(["REFUGE_CHOICE_READY", "REFUGE_DAY_RESULT", "REFUGE_FINAL_REPORT"].sort());
    expect(await dbStatusOf(id)).toBe("REVEALED");

    // Une ancienne application qui répond encore au consentement ne change rien et ne notifie personne.
    await RefugeService.submitRevealConsent(id, p.companion, "ACCEPT");
    await RefugeService.submitRevealConsent(id, p.sponsor, "REFUSE");
    await settle();
    expect(await summary(p.companion)).toEqual(["REFUGE_FINAL_REPORT", "REFUGE_RESULT_READY"].sort());
    expect(await summary(p.sponsor)).toEqual(["REFUGE_CHOICE_READY", "REFUGE_DAY_RESULT", "REFUGE_FINAL_REPORT"].sort());
  }, 60000);

  test("dévoilement automatique : chaque participant reçoit UNE seule notification de fin, même sous lectures simultanées", async () => {
    const p = await pair("reveal");
    const id = await activeSession("reveal", p, 7 * DAY + 2 * HOUR, [7], [7]); // 168 h écoulées
    await Promise.all([
      ...Array.from({ length: 6 }, () => RefugeService.getRefugeSession(id, p.companion)),
      ...Array.from({ length: 6 }, () => RefugeService.getRefugeSession(id, p.sponsor)),
    ]);
    await settle();
    expect((await summary(p.companion)).filter((t) => t === "REFUGE_FINAL_REPORT")).toHaveLength(1);
    expect((await summary(p.sponsor)).filter((t) => t === "REFUGE_FINAL_REPORT")).toHaveLength(1);
    for (const u of [p.companion, p.sponsor]) {
      const types = await summary(u);
      expect(types.some((t) => t === "REFUGE_REVEALED" || t === "REFUGE_REVEAL_PHASE" || t === "REFUGE_REVEAL_REFUSED")).toBe(false);
    }
  }, 60000);

  test("expiration sans jour 7 : les deux participants, une seule fois, même sous 20 lectures simultanées ; rien pour une session déjà fermée", async () => {
    const p = await pair("exp");
    const id = await activeSession("exp", p, 8 * DAY);
    await Promise.all([
      ...Array.from({ length: 10 }, () => RefugeService.getRefugeSession(id, p.sponsor)),
      ...Array.from({ length: 10 }, () => RefugeService.getRefugeSession(id, p.companion)),
    ]);
    await settle();
    expect(await summary(p.companion)).toEqual(["REFUGE_EXPIRED"]);
    expect(await summary(p.sponsor)).toEqual(["REFUGE_EXPIRED"]);
    expect((await rows(p.sponsor))[0]!.message).toBe("Votre refuge est terminé : le temps imparti est écoulé.");
    expect((await prisma.refugeSession.findUniqueOrThrow({ where: { id } })).status).toBe("ABANDONED");

    // Session déjà fermée AVANT (ancienne) : aucune notification rétroactive.
    const old = await pair("expold");
    const oldId = await activeSession("expold", old, 8 * DAY);
    await prisma.refugeSession.update({ where: { id: oldId }, data: { status: "ABANDONED" } });
    await RefugeService.getRefugeSession(oldId, old.sponsor);
    await settle();
    expect(await summary(old.companion)).toEqual([]);
    expect(await summary(old.sponsor)).toEqual([]);
  }, 60000);

  test("nouvelle journée : le compagnon seulement, jamais s'il a déjà choisi, jamais deux fois (même après redémarrage)", async () => {
    const p = await pair("newday", "FEMME", true);
    const id = await activeSession("newday", p, 1 * DAY + 2 * HOUR, [1]); // jour 2, pas encore de choix
    const done = await pair("newdaydone");
    await activeSession("newdaydone", done, 1 * DAY + 2 * HOUR, [1, 2]); // a déjà choisi aujourd'hui
    const day1 = await pair("newday1");
    await activeSession("newday1", day1, 2 * HOUR, []); // jour 1 : l'adoption suffit

    const first = await notifyRefugeNewDayJob.run(new Date());
    await settle();
    expect(first.affected).toBeGreaterThanOrEqual(1);
    expect((await rows(p.companion)).map((n) => [n.type, n.message, n.meta])).toEqual([["REFUGE_NEW_DAY", "Une nouvelle journée commence : tu peux choisir tes deux actions.", { refugeSessionId: id }]]);
    expect(await summary(p.sponsor)).toEqual([]);
    expect(bodiesSentToExpo().map((m) => [m.to, m.data])).toEqual([[p.token, { type: "REFUGE_NEW_DAY", refugeSessionId: id }]]);
    expect(await summary(done.companion)).toEqual([]);
    expect(await summary(day1.companion)).toEqual([]);

    // Exécutions suivantes et redémarrage du processus (mémoire vidée) : toujours UNE notification.
    await notifyRefugeNewDayJob.run(new Date());
    resetHandledNewDays();
    await notifyRefugeNewDayJob.run(new Date());
    await settle();
    expect(await summary(p.companion)).toEqual(["REFUGE_NEW_DAY"]);
  }, 60000);
});

import { afterAll, describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import { prisma } from "../../src/config/prisma";
import {
  adjustReputation,
  registerParticipationActivity,
  reverseReputationEvent,
  runInTransaction,
} from "../../src/modules/reputation/reputation.service";
import {
  applyDiversityBonus,
  applyReputationReward,
  getReliabilityLevel,
  recordReliabilityIncident,
  type DiversityFacts,
  type IncidentFacts,
  type RewardFacts,
  type RuleOptions,
} from "../../src/modules/reputation/reputation.rules.service";
import { textFingerprint, type PenaltyFamily, type RewardKey } from "../../src/policies/reputationRules";
import type { DiversityMetrics, ThreadMessage } from "../../src/policies/reputationDiversity";

/**
 * Application du barème sur PostgreSQL LOCAL de test (garde tests/setup/dbGuard.ts). Nécessite TEST_DATABASE_URL.
 * Les horloges sont injectées : les semaines sont simulées sans attendre.
 */
const test = process.env.TEST_DATABASE_URL ? it : it.skip;
const run = Date.now() + "-" + Math.random().toString(36).slice(2, 7);
const mk = (tag: string) => `rr-${tag}-${run}`;
const ids: string[] = [];
const DAY = 86_400_000;
/** Un lundi : les semaines calendaires UTC démarrent ici. */
const MON = new Date("2026-12-07T10:00:00Z");
const at = (days: number, hours = 0) => new Date(MON.getTime() + days * DAY + hours * 3_600_000);
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

async function makeUser(tag: string, opts: { coins?: number; premium?: boolean } = {}) {
  const id = mk(tag);
  ids.push(id);
  await prisma.user.create({
    data: {
      id,
      email: `${id}@test.local`,
      passwordHash: "x",
      isVerified: true,
      premiumTier: opts.premium ? "PREMIUM" : "FREE",
      premiumUntil: opts.premium ? new Date(Date.now() + 30 * DAY) : null,
      wallet: { create: { coins: opts.coins ?? 100 } },
    },
  });
  return id;
}

const ACTIVE: RuleOptions = { mode: "active", effectiveFrom: null };
const reward = (key: RewardKey, userId: string, facts: Partial<RewardFacts> & { sourceId: string }, now: Date, opts: RuleOptions = {}) =>
  runInTransaction((tx) =>
    applyReputationReward(tx, key, userId, { sourceType: "Test", conditionsMet: true, ...facts }, { ...ACTIVE, ...opts, now }),
  );
const incident = (family: PenaltyFamily, userId: string, sourceId: string, now: Date, over: Partial<IncidentFacts> = {}, opts: RuleOptions = {}) =>
  runInTransaction((tx) =>
    recordReliabilityIncident(tx, family, userId, { sourceType: "Match", sourceId, classification: "CLEAR_BREACH", ...over }, { ...ACTIVE, ...opts, now }),
  );
const state = (userId: string) => prisma.reputationState.findUniqueOrThrow({ where: { userId } });
const events = (userId: string, where: Record<string, unknown> = {}) => prisma.reputationEvent.findMany({ where: { userId, ...where }, orderBy: { createdAt: "asc" } });

/** Engagements respectés injectés directement (fixture) pour tester les proportions sans simuler des mois entiers. */
async function seedRespected(userId: string, n: number, around: Date) {
  await prisma.reputationState.createMany({ data: [{ userId }], skipDuplicates: true });
  await prisma.reputationEvent.createMany({
    data: Array.from({ length: n }, (_, i) => ({
      userId, axis: "RELIABILITY" as const, kind: "SALON_COMPLETED_REL", delta: 1, ruleVersion: 2, epoch: 0,
      commitment: true, sourceType: "Seed", sourceId: `seed-${userId}-${i}`, dedupeKey: `seed:${userId}:${i}`,
      occurredAt: new Date(around.getTime() - (i % 20) * DAY),
    })),
  });
  await prisma.reputationState.update({ where: { userId }, data: { reliability: n, evaluatedCommitments: n } });
}

afterAll(async () => {
  if (!process.env.TEST_DATABASE_URL) return;
  await prisma.auditLog.deleteMany({ where: { actorId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
});

describe("modes : rien ne s'exécute par défaut", () => {
  test("mode « off » (valeur par défaut) : aucune lecture ni écriture, aucun état créé", async () => {
    const u = await makeUser("off");
    const r = await runInTransaction((tx) => applyReputationReward(tx, "RECIPROCAL_SMILE", u, { sourceType: "Match", sourceId: "m", conditionsMet: true }, { now: MON, effectiveFrom: null }));
    expect(r).toMatchObject({ mode: "off", applied: false, reason: "RULES_OFF", decisions: [] });
    expect(await prisma.reputationState.count({ where: { userId: u } })).toBe(0);
    expect(await prisma.reputationEvent.count({ where: { userId: u } })).toBe(0);
    const inc = await runInTransaction((tx) => recordReliabilityIncident(tx, "SALON_ABANDONED", u, { sourceType: "S", sourceId: "s", classification: "CLEAR_BREACH" }, { now: MON }));
    expect(inc).toMatchObject({ mode: "off", recorded: false, reason: "RULES_OFF" });
    const div = await runInTransaction((tx) => applyDiversityBonus(tx, u, { partnerId: "x", stage: 1, thread: [], partner: {} as DiversityMetrics }, { now: MON }));
    expect(div).toMatchObject({ mode: "off", granted: 0, reason: "RULES_OFF" });
  });

  test("mode « shadow » : décisions calculées, AUCUNE écriture (pas même l'état)", async () => {
    const u = await makeUser("shadow");
    const r = await reward("LETTER_REPLY", u, { sourceId: "m1", dayKey: dayKey(MON), partnerId: "p" }, MON, { mode: "shadow" });
    expect(r.applied).toBe(false);
    expect(r.decisions.map((d) => [d.axis, d.granted, d.reason])).toEqual([["RELIABILITY", 2, "WOULD_GRANT"], ["PARTICIPATION", 2, "WOULD_GRANT"]]);
    expect(await prisma.reputationState.count({ where: { userId: u } })).toBe(0);
    expect(await prisma.reputationEvent.count({ where: { userId: u } })).toBe(0);
  });

  test("aucun fait antérieur à la date d'entrée en vigueur n'est évalué (jamais rétroactif)", async () => {
    const u = await makeUser("retro");
    const r = await reward("SALON_COMPLETED", u, { sourceId: "old", occurredAt: at(-3) }, MON, { effectiveFrom: MON });
    expect(r).toMatchObject({ applied: false, reason: "BEFORE_EFFECTIVE_DATE" });
    const inc = await incident("SALON_ABANDONED", u, "old", MON, { occurredAt: at(-3) }, { effectiveFrom: MON });
    expect(inc).toMatchObject({ recorded: false, reason: "BEFORE_EFFECTIVE_DATE" });
    expect(await prisma.reputationEvent.count({ where: { userId: u } })).toBe(0);
    expect((await reward("SALON_COMPLETED", u, { sourceId: "new", occurredAt: at(1) }, at(1), { effectiveFrom: MON })).applied).toBe(true);
  });
});

describe("récompenses : application du barème", () => {
  test("une règle à un seul axe ne touche que cet axe, avec la version du jeu de règles", async () => {
    const u = await makeUser("smile");
    const r = await reward("RECIPROCAL_SMILE", u, { sourceType: "Match", sourceId: "m1", partnerId: "p1" }, MON);
    expect(r).toMatchObject({ applied: true, reason: "GRANTED" });
    const s = await state(u);
    expect([s.reliability, s.participation, s.popularity]).toEqual([0, 1, 0]);
    expect(s.ruleVersion).toBe(2);
    const [e] = await events(u);
    expect(e).toMatchObject({ kind: "RECIPROCAL_SMILE_PART", axis: "PARTICIPATION", delta: 1, ruleVersion: 2, commitment: false });
  });

  test("une règle à deux axes crée deux événements séparés ; l'engagement n'est compté qu'une fois (fiabilité)", async () => {
    const u = await makeUser("both");
    await reward("CORRESPONDENCE_ENGAGED", u, { sourceType: "Match", sourceId: "m1", partnerId: "p" }, MON);
    const s = await state(u);
    expect([s.reliability, s.participation, s.evaluatedCommitments]).toEqual([5, 2, 1]);
    const evs = await events(u);
    expect(evs.map((e) => [e.axis, e.delta, e.commitment]).sort()).toEqual([["PARTICIPATION", 2, false], ["RELIABILITY", 5, true]]);
  });

  test("tout le barème : valeurs exactes pour chaque règle disponible", async () => {
    const expected: Array<[RewardKey, number, number]> = [
      ["RECIPROCAL_SMILE", 0, 1], ["QUESTIONS_COMPLETED", 0, 2], ["CORRESPONDENCE_ENGAGED", 5, 2], ["FIRST_LETTER", 0, 2],
      ["LETTER_REPLY", 2, 2], ["CORRESPONDENCE_SUSTAINED", 5, 3], ["BOTTLE_REPLY", 0, 2], ["BOTTLE_SUSTAINED", 5, 3],
      ["SALON_ACTIVE_DAY", 0, 2], ["SALON_COMPLETED", 10, 5], ["REFUGE_DAY_HONORED", 2, 2], ["REFUGE_COMPLETED", 10, 5],
      ["DUEL_COMPLETED", 3, 2], ["ELECTION_VOTE", 0, 1],
    ];
    for (const [key, rel, part] of expected) {
      const u = await makeUser(`bar-${key.toLowerCase()}`);
      await reward(key, u, { sourceId: "src", dayKey: dayKey(MON), partnerId: "p", tier: 1 }, MON);
      const s = await state(u);
      expect([key, s.reliability, s.participation]).toEqual([key, rel, part]);
    }
  });

  test("le journal général n'a aucune fonctionnalité correspondante : règle indisponible, aucun événement", async () => {
    const u = await makeUser("journal");
    expect(await reward("JOURNAL_PARTICIPATION", u, { sourceId: "j" }, MON)).toMatchObject({ applied: false, reason: "RULE_UNAVAILABLE" });
    expect(await prisma.reputationEvent.count({ where: { userId: u } })).toBe(0);
  });

  test("conditions objectives non remplies, auto-interaction, jour manquant : refusés sans écriture", async () => {
    const u = await makeUser("deny");
    expect(await reward("FIRST_LETTER", u, { sourceId: "m", conditionsMet: false }, MON)).toMatchObject({ applied: false, reason: "OBJECTIVE_NOT_MET" });
    expect(await reward("LETTER_REPLY", u, { sourceId: "m", dayKey: dayKey(MON), partnerId: u }, MON)).toMatchObject({ applied: false, reason: "SELF_INTERACTION" });
    expect(await reward("LETTER_REPLY", u, { sourceId: "m" }, MON)).toMatchObject({ applied: false, reason: "DAY_KEY_REQUIRED" });
    expect(await prisma.reputationEvent.count({ where: { userId: u } })).toBe(0);
  });

  test("double comptage impossible : même fait deux fois, même jour par correspondance", async () => {
    const u = await makeUser("dedupe");
    expect((await reward("QUESTIONS_COMPLETED", u, { sourceType: "Match", sourceId: "m1" }, MON)).applied).toBe(true);
    const again = await reward("QUESTIONS_COMPLETED", u, { sourceType: "Match", sourceId: "m1" }, at(0, 2));
    expect(again.applied).toBe(false);
    expect(again.reason).toBe("SOURCE_CAP");
    expect((await state(u)).participation).toBe(2);
    // une réponse par correspondance et par jour : la même clé journalière ne rapporte qu'une fois
    expect((await reward("LETTER_REPLY", u, { sourceType: "Match", sourceId: "m2", dayKey: dayKey(MON), partnerId: "p" }, MON)).applied).toBe(true);
    const dup = await reward("LETTER_REPLY", u, { sourceType: "Match", sourceId: "m2", dayKey: dayKey(MON), partnerId: "p" }, at(0, 3));
    expect(dup.applied).toBe(false);
    expect(dup.reason).toBe("ALREADY_RECORDED");
    // le lendemain, la même correspondance rapporte de nouveau
    expect((await reward("LETTER_REPLY", u, { sourceType: "Match", sourceId: "m2", dayKey: dayKey(at(1)), partnerId: "p" }, at(1))).applied).toBe(true);
  });
});

describe("plafonds", () => {
  test("plafond journalier : 5 votes par jour pour tous, puis reprise le lendemain", async () => {
    const u = await makeUser("votes");
    const out: boolean[] = [];
    for (let i = 0; i < 8; i++) out.push((await reward("ELECTION_VOTE", u, { sourceType: "Duel", sourceId: `d${i}` }, at(0, i))).applied);
    expect(out).toEqual([true, true, true, true, true, false, false, false]);
    expect((await state(u)).participation).toBe(5);
    expect((await reward("ELECTION_VOTE", u, { sourceType: "Duel", sourceId: "next" }, at(1))).applied).toBe(true);
  });

  test("Gratuit et Plus obtiennent exactement le même résultat (aucune notion d'abonnement dans le barème)", async () => {
    const free = await makeUser("free", { premium: false });
    const plus = await makeUser("plus", { premium: true });
    for (const u of [free, plus]) {
      for (let i = 0; i < 20; i++) await reward("ELECTION_VOTE", u, { sourceType: "Duel", sourceId: `d${i}` }, at(0, i % 12));
      await reward("CORRESPONDENCE_SUSTAINED", u, { sourceType: "Match", sourceId: "m", tier: 1 }, MON);
    }
    const a = await state(free);
    const b = await state(plus);
    expect([a.reliability, a.participation, a.evaluatedCommitments]).toEqual([b.reliability, b.participation, b.evaluatedCommitments]);
    expect(a.participation).toBe(5 + 3); // 5 votes plafonnés + palier de correspondance
  });

  test("plafond hebdomadaire par règle (4 correspondances engagées par semaine), puis reprise la semaine suivante", async () => {
    const u = await makeUser("weekcap");
    const res: boolean[] = [];
    for (let i = 0; i < 6; i++) res.push((await reward("CORRESPONDENCE_ENGAGED", u, { sourceType: "Match", sourceId: `m${i}`, partnerId: `p${i}` }, at(i % 5))).applied);
    expect(res).toEqual([true, true, true, true, false, false]);
    expect((await reward("CORRESPONDENCE_ENGAGED", u, { sourceType: "Match", sourceId: "m-next", partnerId: "pn" }, at(7))).applied).toBe(true);
  });

  test("deux paliers au maximum par correspondance entretenue", async () => {
    const u = await makeUser("tiers");
    expect((await reward("CORRESPONDENCE_SUSTAINED", u, { sourceType: "Match", sourceId: "m", tier: 1 }, MON)).applied).toBe(true);
    expect((await reward("CORRESPONDENCE_SUSTAINED", u, { sourceType: "Match", sourceId: "m", tier: 2 }, at(2))).applied).toBe(true);
    expect(await reward("CORRESPONDENCE_SUSTAINED", u, { sourceType: "Match", sourceId: "m", tier: 3 }, at(3))).toMatchObject({ applied: false, reason: "SOURCE_CAP" });
    expect((await state(u)).reliability).toBe(10);
  });

  test("au plus 3 réponses par semaine avec un même interlocuteur", async () => {
    const u = await makeUser("partner");
    const r: boolean[] = [];
    for (let i = 0; i < 5; i++) r.push((await reward("LETTER_REPLY", u, { sourceType: "Match", sourceId: `m${i}`, dayKey: dayKey(at(i)), partnerId: "same" }, at(i))).applied);
    expect(r).toEqual([true, true, true, false, false]);
    expect((await reward("LETTER_REPLY", u, { sourceType: "Match", sourceId: "m9", dayKey: dayKey(at(4)), partnerId: "other" }, at(4))).applied).toBe(true);
  });

  test("plafond global hebdomadaire de fiabilité : jamais de dépassement, gain partiel au lieu d'un refus brutal", async () => {
    const u = await makeUser("axiscap");
    for (let i = 0; i < 5; i++) await reward("REFUGE_COMPLETED", u, { sourceType: "Refuge", sourceId: `r${i}` }, at(i % 4)); // 5 × 10 = 50
    for (let i = 0; i < 3; i++) await reward("DUEL_COMPLETED", u, { sourceType: "Duel", sourceId: `d${i}`, partnerId: `o${i}` }, at(1)); // 3 × 3 = 9 → 59
    const partial = await reward("LETTER_REPLY", u, { sourceType: "Match", sourceId: "mx", dayKey: dayKey(at(2)), partnerId: "q" }, at(2)); // reste 1 sur 2
    expect(partial.decisions.find((d) => d.axis === "RELIABILITY")).toMatchObject({ requested: 2, granted: 1, reason: "GRANTED_CLAMPED" });
    expect(partial.decisions.find((d) => d.axis === "PARTICIPATION")?.granted).toBe(2);
    expect((await state(u)).reliability).toBe(60);
    const next = await reward("REFUGE_COMPLETED", u, { sourceType: "Refuge", sourceId: "r-over" }, at(2));
    expect(next.decisions.find((d) => d.axis === "RELIABILITY")).toMatchObject({ granted: 0, reason: "AXIS_WEEKLY_CAP" });
    // la participation du même fait reste accordée
    expect(next.decisions.find((d) => d.axis === "PARTICIPATION")?.granted).toBe(5);
    expect((await state(u)).reliability).toBe(60);
    // semaine suivante : de nouveau possible
    expect((await reward("REFUGE_COMPLETED", u, { sourceType: "Refuge", sourceId: "r-w2" }, at(8))).applied).toBe(true);
  });

  test("messages recopiés : une même empreinte de texte ne rapporte qu'une fois par période de 30 jours", async () => {
    const u = await makeUser("fp");
    const fp = textFingerprint("Bonjour, j'ai adoré ton récit de voyage, raconte-moi la suite s'il te plaît !");
    expect((await reward("FIRST_LETTER", u, { sourceType: "Match", sourceId: "m1", fingerprint: fp }, MON)).applied).toBe(true);
    expect(await reward("FIRST_LETTER", u, { sourceType: "Match", sourceId: "m2", fingerprint: fp }, at(2))).toMatchObject({ applied: false, reason: "REPEATED_CONTENT" });
    expect((await reward("FIRST_LETTER", u, { sourceType: "Match", sourceId: "m3", fingerprint: textFingerprint("Un tout autre message, écrit avec soin, pour une personne différente.") }, at(2))).applied).toBe(true);
    expect((await reward("FIRST_LETTER", u, { sourceType: "Match", sourceId: "m4", fingerprint: fp }, at(40))).applied).toBe(true);
  });
});

describe("concurrence : plafonds exacts et idempotence", () => {
  test("12 requêtes simultanées pour un même fait : une seule application", async () => {
    const u = await makeUser("race-same");
    const rs = await Promise.all(Array.from({ length: 12 }, () => reward("CORRESPONDENCE_ENGAGED", u, { sourceType: "Match", sourceId: "m", partnerId: "p" }, MON)));
    expect(rs.filter((r) => r.applied)).toHaveLength(1);
    expect((await state(u)).reliability).toBe(5);
    expect(await events(u)).toHaveLength(2);
  });

  test("20 votes simultanés le même jour : exactement 5 points, jamais 6 (le plafond tient en concurrence)", async () => {
    const u = await makeUser("race-cap");
    const rs = await Promise.all(Array.from({ length: 20 }, (_, i) => reward("ELECTION_VOTE", u, { sourceType: "Duel", sourceId: `v${i}` }, at(0, 1))));
    expect(rs.filter((r) => r.applied)).toHaveLength(5);
    expect((await state(u)).participation).toBe(5);
    expect(await prisma.reputationEvent.count({ where: { userId: u } })).toBe(5);
  });

  test("incidents simultanés : un seul incident par fait, une seule pénalité", async () => {
    const u = await makeUser("race-inc");
    await incident("SALON_ABANDONED", u, "a", MON);
    await incident("SALON_ABANDONED", u, "b", at(1));
    const rs = await Promise.all(Array.from({ length: 8 }, () => incident("SALON_ABANDONED", u, "c", at(2))));
    expect(rs.filter((r) => r.reason === "PENALIZED")).toHaveLength(1);
    expect(await prisma.reputationEvent.count({ where: { userId: u, kind: "SALON_ABANDONED_PENALTY" } })).toBe(1);
    expect((await state(u)).reliability).toBe(-4);
  });
});

describe("incidents et pénalités", () => {
  test("deux incidents ordinaires : aucune perte ; le troisième, répétitif : pénalité de la famille", async () => {
    const u = await makeUser("pen3");
    const r1 = await incident("MATCH_BREAK_AFTER_QUESTIONS", u, "m1", MON);
    const r2 = await incident("MATCH_BREAK_AFTER_QUESTIONS", u, "m2", at(3));
    expect([r1.penalty?.delta, r2.penalty?.delta]).toEqual([0, 0]);
    expect((await state(u)).reliability).toBe(0);
    const r3 = await incident("MATCH_BREAK_AFTER_QUESTIONS", u, "m3", at(6));
    expect(r3).toMatchObject({ recorded: true, reason: "PENALIZED" });
    expect(r3.penalty).toMatchObject({ delta: -8, incidentsInWindow: 3 });
    expect((await state(u)).reliability).toBe(-8);
    const pen = await prisma.reputationEvent.findFirstOrThrow({ where: { userId: u, kind: "MATCH_BREAK_AFTER_QUESTIONS_PENALTY" } });
    expect(pen).toMatchObject({ delta: -8, contestable: true, ruleVersion: 2 });
    expect(await prisma.reputationEvent.count({ where: { userId: u, kind: "MATCH_BREAK_AFTER_QUESTIONS_INCIDENT" } })).toBe(3);
  });

  test("valeurs par famille", async () => {
    const expected: Array<[PenaltyFamily, number]> = [
      ["SALON_ABANDONED", -4], ["CORRESPONDENCE_ABANDONED", -3], ["BOTTLE_ABANDONED", -3], ["REFUGE_NEGLECTED", -3], ["DUEL_ABANDONED", -2],
    ];
    for (const [family, delta] of expected) {
      const u = await makeUser(`fam-${family.toLowerCase()}`);
      for (let i = 0; i < 3; i++) await incident(family, u, `x${i}`, at(i));
      expect([family, (await state(u)).reliability]).toEqual([family, delta]);
    }
  });

  test("30 engagements respectés et 3 difficultés : aucune pénalité ; 3 abandons sur 3 engagements : pénalité", async () => {
    const vet = await makeUser("vet");
    await seedRespected(vet, 30, at(5));
    for (let i = 0; i < 3; i++) await incident("CORRESPONDENCE_ABANDONED", vet, `v${i}`, at(i));
    expect((await state(vet)).reliability).toBe(30); // aucune perte
    expect(await prisma.reputationEvent.count({ where: { userId: vet, kind: "CORRESPONDENCE_ABANDONED_PENALTY" } })).toBe(0);
    expect((await getReliabilityLevel(prisma, vet, at(5))).level).toBe("VERY_RELIABLE");

    const novice = await makeUser("novice3");
    await seedRespected(novice, 0, at(5));
    for (let i = 0; i < 3; i++) await incident("CORRESPONDENCE_ABANDONED", novice, `n${i}`, at(i));
    expect((await state(novice)).reliability).toBe(-3);
  });

  test("plafonds : au plus 12 par famille et 24 au total sur 60 jours", async () => {
    const u = await makeUser("pencap");
    const deltas: number[] = [];
    for (let i = 0; i < 7; i++) deltas.push((await incident("MATCH_BREAK_AFTER_QUESTIONS", u, `m${i}`, at(i))).penalty?.delta ?? 0);
    expect(deltas).toEqual([0, 0, -8, -4, 0, 0, 0]); // 3ᵉ : −8, 4ᵉ : reste 4 sur 12, puis plafond atteint
    expect((await state(u)).reliability).toBe(-12);
    const total = await makeUser("pentotal");
    for (let i = 0; i < 4; i++) await incident("MATCH_BREAK_AFTER_QUESTIONS", total, `a${i}`, at(i)); // −8, −4 = −12
    for (let i = 0; i < 4; i++) await incident("SALON_ABANDONED", total, `b${i}`, at(i)); // −4 ×3 = −12 → −24
    for (let i = 0; i < 4; i++) await incident("CORRESPONDENCE_ABANDONED", total, `c${i}`, at(i)); // plafond global atteint
    expect((await state(total)).reliability).toBeGreaterThanOrEqual(-24);
    expect((await state(total)).reliability).toBe(-24);
  });

  test("récupération : les incidents sortent de la fenêtre glissante de 60 jours", async () => {
    const u = await makeUser("recover");
    await incident("SALON_ABANDONED", u, "a", MON);
    await incident("SALON_ABANDONED", u, "b", at(1));
    const late = await incident("SALON_ABANDONED", u, "c", at(70));
    expect(late.penalty).toMatchObject({ delta: 0, incidentsInWindow: 1 });
    expect((await state(u)).reliability).toBe(0);
  });

  test("l'annulation d'un incident par un administrateur l'exclut du décompte", async () => {
    const u = await makeUser("incident-rev");
    const admin = await makeUser("incident-admin", { });
    await prisma.user.update({ where: { id: admin }, data: { role: Role.ADMIN } });
    await incident("SALON_ABANDONED", u, "a", MON);
    await incident("SALON_ABANDONED", u, "b", at(1));
    const bEvent = await prisma.reputationEvent.findFirstOrThrow({ where: { userId: u, sourceId: "b", kind: "SALON_ABANDONED_INCIDENT" } });
    await reverseReputationEvent({ eventId: bEvent.id, actor: { id: admin, role: Role.ADMIN }, reason: "incident erroné" });
    const third = await incident("SALON_ABANDONED", u, "c", at(2));
    expect(third.penalty).toMatchObject({ delta: 0, incidentsInWindow: 2 });
    expect((await state(u)).reliability).toBe(0);
  });

  test("une pénalité injustifiée peut être contestée et annulée (événement compensatoire)", async () => {
    const u = await makeUser("pen-undo");
    const admin = await makeUser("pen-undo-admin");
    await prisma.user.update({ where: { id: admin }, data: { role: Role.ADMIN } });
    for (let i = 0; i < 3; i++) await incident("MATCH_BREAK_AFTER_QUESTIONS", u, `m${i}`, at(i));
    const pen = await prisma.reputationEvent.findFirstOrThrow({ where: { userId: u, kind: "MATCH_BREAK_AFTER_QUESTIONS_PENALTY" } });
    expect(pen.contestable).toBe(true);
    await reverseReputationEvent({ eventId: pen.id, actor: { id: admin, role: Role.ADMIN }, reason: "rupture légitime confirmée" });
    expect((await state(u)).reliability).toBe(0);
  });

  test("JAMAIS de pénalité : doute, refus, incompatibilité, blocage, signalement, vacances, sécurité", async () => {
    const u = await makeUser("never");
    const cases: Array<Partial<IncidentFacts>> = [
      { classification: "UNKNOWN" },
      { classification: "LEGITIMATE" },
      { exemptions: { refusal: true } },
      { exemptions: { incompatibility: true } },
      { exemptions: { blocked: true } },
      { exemptions: { reportOnly: true } },
      { exemptions: { vacation: true } },
      { exemptions: { safety: true } },
    ];
    for (let round = 0; round < 3; round++) {
      for (const [i, c] of cases.entries()) {
        const r = await incident("MATCH_BREAK_AFTER_QUESTIONS", u, `n${round}-${i}`, at(round), c);
        expect(r.recorded).toBe(false);
      }
    }
    expect(await prisma.reputationEvent.count({ where: { userId: u } })).toBe(0);
  });

  test("mode « shadow » : annonce la pénalité qui serait appliquée, sans rien écrire", async () => {
    const u = await makeUser("shadow-pen");
    await incident("SALON_ABANDONED", u, "a", MON);
    await incident("SALON_ABANDONED", u, "b", at(1));
    const s = await incident("SALON_ABANDONED", u, "c", at(2), {}, { mode: "shadow" });
    expect(s).toMatchObject({ recorded: false, reason: "WOULD_PENALIZE" });
    expect(s.penalty?.delta).toBe(-4);
    expect(await prisma.reputationEvent.count({ where: { userId: u, kind: "SALON_ABANDONED_PENALTY" } })).toBe(0);
    expect((await state(u)).reliability).toBe(0);
  });

  test("les pénalités ne touchent que la fiabilité, jamais la participation, la popularité ni les pièces", async () => {
    const u = await makeUser("pen-axes", { coins: 250 });
    await reward("LETTER_REPLY", u, { sourceType: "Match", sourceId: "m", dayKey: dayKey(MON), partnerId: "p" }, MON);
    for (let i = 0; i < 3; i++) await incident("SALON_ABANDONED", u, `s${i}`, at(i));
    const s = await state(u);
    expect([s.reliability, s.participation, s.popularity]).toEqual([2 - 4, 2, 0]);
    expect((await prisma.wallet.findUniqueOrThrow({ where: { userId: u } })).coins).toBe(250);
    expect(await prisma.coinTransaction.count({ where: { walletId: u } })).toBe(0);
  });
});

describe("niveaux de fiabilité (calculés depuis le registre)", () => {
  test("nouveau membre → fiable → très fiable → exemplaire, sans dépendre de la quantité de messages", async () => {
    const u = await makeUser("levels");
    expect((await getReliabilityLevel(prisma, u, MON)).level).toBe("NEW_MEMBER"); // aucun état
    const sources = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o"];
    const seen: Record<number, string> = {};
    for (const [i, s] of sources.entries()) {
      await reward("REFUGE_COMPLETED", u, { sourceType: "Refuge", sourceId: s }, at(i * 7)); // 1 aventure par semaine
      seen[i + 1] = (await getReliabilityLevel(prisma, u, at(i * 7))).level;
    }
    expect(seen[3]).toBe("NEW_MEMBER");
    expect(seen[5]).toBe("RELIABLE");
    expect(seen[8]).toBe("VERY_RELIABLE");
    expect(seen[15]).toBe("EXEMPLARY");
  });

  test("après une remise à zéro : « fiabilité à réévaluer » jusqu'à 5 engagements observés, puis niveau normal", async () => {
    const u = await makeUser("reassess");
    await seedRespected(u, 12, MON);
    await prisma.reputationState.update({ where: { userId: u }, data: { lastActivityAt: at(-130) } });
    const r = await registerParticipationActivity({ userId: u, at: MON, thresholdMonths: 3, thresholdDays: null });
    expect(r.reset).toBe(true);
    expect((await state(u)).reliabilityReassessment).toBe(true);
    expect((await getReliabilityLevel(prisma, u, MON)).level).toBe("REASSESSMENT"); // l'ancienne époque n'est pas retenue
    for (let i = 0; i < 4; i++) await reward("REFUGE_DAY_HONORED", u, { sourceType: "Refuge", sourceId: `rd${i}` }, at(i));
    expect((await getReliabilityLevel(prisma, u, at(4))).level).toBe("REASSESSMENT");
    await reward("REFUGE_DAY_HONORED", u, { sourceType: "Refuge", sourceId: "rd4" }, at(4));
    const s = await state(u);
    expect(s.evaluatedCommitments).toBe(5);
    expect(s.reliabilityReassessment).toBe(false);
    expect((await getReliabilityLevel(prisma, u, at(4))).level).toBe("RELIABLE");
  });

  test("le niveau ne révèle jamais les points : seul un niveau et son libellé sont retournés", async () => {
    const u = await makeUser("private");
    await seedRespected(u, 9, MON);
    const out = await getReliabilityLevel(prisma, u, MON);
    expect(Object.keys(out).sort()).toEqual(["label", "level"]);
    expect(JSON.stringify(out)).not.toMatch(/\d{2,}/);
  });
});

describe("inactivité en mois calendaires (désactivée par défaut)", () => {
  test("remise à zéro exactement à l'échéance calendaire, une seule fois, sans rien supprimer", async () => {
    const u = await makeUser("cal", { coins: 321 });
    await reward("SALON_COMPLETED", u, { sourceType: "Salon", sourceId: "s" }, new Date("2026-05-15T12:00:00Z"));
    expect((await state(u)).reliability).toBe(10);
    const before = await events(u);
    // la veille de l'échéance, sur un autre membre ayant la même dernière activité : pas de remise à zéro
    const early = await makeUser("cal-early");
    await reward("SALON_COMPLETED", early, { sourceType: "Salon", sourceId: "s" }, new Date("2026-05-15T12:00:00Z"));
    expect((await registerParticipationActivity({ userId: early, at: new Date("2026-08-14T12:00:00Z"), thresholdMonths: 3, thresholdDays: null })).reset).toBe(false);
    const due = await registerParticipationActivity({ userId: u, at: new Date("2026-08-15T12:00:00Z"), thresholdMonths: 3, thresholdDays: null });
    expect(due).toEqual({ reset: true, epoch: 1 });
    const s = await state(u);
    expect([s.reliability, s.participation, s.resetCount, s.reliabilityReassessment]).toEqual([0, 0, 1, true]);
    expect(await events(u, { kind: { not: "INACTIVITY_RESET" } })).toHaveLength(before.length); // historique intact
    expect((await prisma.wallet.findUniqueOrThrow({ where: { userId: u } })).coins).toBe(321);
    // pas de seconde remise à zéro pendant la même période
    const again = await registerParticipationActivity({ userId: u, at: new Date("2026-08-16T12:00:00Z"), thresholdMonths: 3, thresholdDays: null });
    expect(again.reset).toBe(false);
  });

  test("sans seuil configuré : jamais de remise à zéro, quelle que soit l'ancienneté", async () => {
    const u = await makeUser("cal-off");
    await reward("SALON_COMPLETED", u, { sourceType: "Salon", sourceId: "s" }, new Date("2020-01-01T00:00:00Z"));
    expect((await registerParticipationActivity({ userId: u, at: new Date("2026-12-01T00:00:00Z") })).reset).toBe(false);
  });

  test("une récompense compte comme activité réelle (dernière activité enregistrée)", async () => {
    const u = await makeUser("act");
    await reward("ELECTION_VOTE", u, { sourceType: "Duel", sourceId: "d" }, MON);
    expect((await state(u)).lastActivityAt?.toISOString()).toBe(MON.toISOString());
  });
});

describe("diversité des rencontres", () => {
  const A = "alice";
  const B = "bruno";
  const TXT = [
    "Bonjour, j'ai adoré ta description de la randonnée dans les Alpes, tu y retournes quand ?",
    "Merci beaucoup, oui j'y retourne en juillet, et toi tu préfères la montagne ou la mer cet été ?",
    "Plutôt la mer, mais j'avoue que la montagne me tente après ton récit, quel sentier conseilles-tu ?",
    "Je te conseille le lac Blanc, la vue est incroyable et le chemin reste accessible pour débuter.",
    "Parfait, j'irai le voir le mois prochain, et je te raconterai ce que j'en ai pensé, promis !",
    "Avec plaisir, n'oublie pas de prendre de l'eau et de bonnes chaussures de marche pour la descente.",
  ];
  const target = (over: Partial<DiversityMetrics> = {}): DiversityMetrics => ({
    accountAgeDays: 6, distinctSendersReceived30d: 0, exposures30d: 10, positiveSignals30d: 1, activeRecently: true,
    daysSinceReset: null, verified: true, profileComplete: true, banned: false, accountAgeHours: 6 * 24, ...over,
  });
  const m = (from: string, i: number, day = 0): ThreadMessage => ({ fromId: from, text: TXT[i]!, sentAt: at(day, 1 + i) });
  const first = (a: string, b: string): ThreadMessage[] => [m(a, 0), m(b, 1)];
  const long = (a: string, b: string): ThreadMessage[] => [m(a, 0, 0), m(b, 1, 0), m(a, 2, 1), m(b, 3, 1), m(a, 4, 2), m(b, 5, 2)];
  const div = (member: string, partnerId: string, stage: 1 | 2, thread: ThreadMessage[], partner: DiversityMetrics, now: Date = MON) =>
    runInTransaction((tx) => applyDiversityBonus(tx, member, { partnerId, stage, thread, partner } satisfies DiversityFacts, { ...ACTIVE, now }));

  test("premier véritable échange : +5 ; poursuite réelle : +5 ; au plus 10 par binôme ; rien de plus ensuite", async () => {
    const a = await makeUser("div-a");
    const p = await makeUser("div-p");
    expect(await div(a, p, 1, first(a, p), target())).toMatchObject({ granted: 5, reason: "GRANTED" });
    expect(await div(a, p, 1, first(a, p), target())).toMatchObject({ granted: 0, reason: "ALREADY_RECORDED" });
    expect(await div(a, p, 2, long(a, p), target())).toMatchObject({ granted: 5, reason: "GRANTED" });
    expect(await div(a, p, 2, long(a, p), target())).toMatchObject({ granted: 0 });
    expect((await state(a)).participation).toBe(10);
    // une nouvelle relation avec la même personne (relation réinitialisée, autre match) ne redonne rien
    expect((await div(a, p, 1, first(a, p), target(), at(30))).granted).toBe(0);
  });

  test("étape 2 sans étape 1, échange non véritable, partenaire non éligible : aucun point", async () => {
    const a = await makeUser("div-bad");
    const p = await makeUser("div-bad-p");
    expect(await div(a, p, 2, long(a, p), target())).toMatchObject({ granted: 0, reason: "STAGE_ONE_MISSING" });
    expect(await div(a, p, 1, [m(a, 0)], target())).toMatchObject({ granted: 0, reason: "NOT_A_GENUINE_EXCHANGE" });
    expect(await div(a, p, 1, [{ fromId: a, text: "salut", sentAt: MON }, { fromId: p, text: "salut", sentAt: at(0, 3) }], target())).toMatchObject({ granted: 0, reason: "NOT_A_GENUINE_EXCHANGE" });
    expect(await div(a, p, 1, first(a, p), target({ accountAgeDays: 500, accountAgeHours: 12000, distinctSendersReceived30d: 40 }))).toMatchObject({ granted: 0, reason: "NOT_ELIGIBLE" });
    expect(await div(a, a, 1, first(a, a), target())).toMatchObject({ granted: 0, reason: "SELF_INTERACTION" });
    expect(await prisma.reputationEvent.count({ where: { userId: a } })).toBe(0);
  });

  test("comptes multiples : compte trop récent, non vérifié, incomplet ou banni ne peut pas servir de cible", async () => {
    const a = await makeUser("div-multi");
    const p = await makeUser("div-multi-p");
    for (const bad of [{ accountAgeHours: 2 }, { verified: false }, { profileComplete: false }, { banned: true }]) {
      expect((await div(a, p, 1, first(a, p), target(bad))).reason).toBe("NOT_ELIGIBLE");
    }
    expect(await prisma.reputationEvent.count({ where: { userId: a } })).toBe(0);
  });

  test("plafond de 30 points par semaine ; la semaine suivante repart", async () => {
    const a = await makeUser("div-week");
    const partners: string[] = [];
    for (let i = 0; i < 8; i++) partners.push(await makeUser(`div-week-p${i}`));
    const granted: number[] = [];
    for (const [i, p] of partners.entries()) {
      granted.push((await div(a, p, 1, first(a, p), target(), at(i % 5))).granted);
    }
    expect(granted).toEqual([5, 5, 5, 5, 5, 5, 0, 0]);
    expect((await state(a)).participation).toBe(30);
    expect((await div(a, partners[6]!, 1, first(a, partners[6]!), target(), at(8))).granted).toBe(5);
  });

  test("aucun motif privé n'est stocké ni renvoyé : seuls l'interlocuteur et l'étape sont conservés", async () => {
    const a = await makeUser("div-private");
    const p = await makeUser("div-private-p");
    const res = await div(a, p, 1, first(a, p), target({ accountAgeDays: 3 }));
    expect(Object.keys(res).sort()).toEqual(["eventId", "granted", "mode", "reason"]);
    const e = await prisma.reputationEvent.findFirstOrThrow({ where: { userId: a, kind: "DIVERSITY_BONUS_PART" } });
    expect(Object.keys(e.meta as object).sort()).toEqual(["partnerId", "stage"]);
    expect(JSON.stringify(e)).not.toMatch(/NEW_MEMBER|LOW_RECEIVED|RARELY|RETURNING|nouveau|sollicit/i);
  });

  test("participation uniquement : fiabilité et popularité inchangées, pièces intactes, plafond hebdomadaire des règles distinct", async () => {
    const a = await makeUser("div-axes", { coins: 99 });
    const p = await makeUser("div-axes-p");
    await div(a, p, 1, first(a, p), target());
    const s = await state(a);
    expect([s.reliability, s.participation, s.popularity]).toEqual([0, 5, 0]);
    expect((await prisma.wallet.findUniqueOrThrow({ where: { userId: a } })).coins).toBe(99);
    expect(await prisma.coinTransaction.count({ where: { walletId: a } })).toBe(0);
  });

  test("des membres plus nombreux en parallèle : le plafond hebdomadaire tient en concurrence", async () => {
    const a = await makeUser("div-race");
    const partners: string[] = [];
    for (let i = 0; i < 10; i++) partners.push(await makeUser(`div-race-p${i}`));
    await Promise.all(partners.map((p) => div(a, p, 1, first(a, p), target(), at(1))));
    expect((await state(a)).participation).toBe(30);
    expect(await prisma.reputationEvent.count({ where: { userId: a, kind: "DIVERSITY_BONUS_PART" } })).toBe(6);
  });
});

describe("indépendance totale", () => {
  test("aucune règle n'écrit la popularité, les pièces ou les anciens classements", async () => {
    const u = await makeUser("indep", { coins: 500 });
    await prisma.profile.create({ data: { userId: u, pseudo: `P_${u}`, birthDate: new Date("1990-01-01"), gender: "HOMME", city: "Paris", points: 77, discoveryActivityScore: 33 } });
    for (const key of ["RECIPROCAL_SMILE", "FIRST_LETTER", "SALON_COMPLETED", "REFUGE_COMPLETED", "ELECTION_VOTE", "DUEL_COMPLETED"] as RewardKey[]) {
      await reward(key, u, { sourceId: key, dayKey: dayKey(MON), partnerId: "p" }, MON);
    }
    for (let i = 0; i < 3; i++) await incident("SALON_ABANDONED", u, `z${i}`, at(i));
    await adjustReputation({ actor: { id: u, role: Role.USER }, userId: u, axis: "POPULARITY", delta: 5, reason: "non", dedupeKey: `x:${run}` }).catch(() => undefined);
    const s = await state(u);
    expect(s.popularity).toBe(0);
    expect((await prisma.wallet.findUniqueOrThrow({ where: { userId: u } })).coins).toBe(500);
    const p = await prisma.profile.findUniqueOrThrow({ where: { userId: u } });
    expect([p.points, p.discoveryActivityScore, p.discoveryBreakPenalty]).toEqual([77, 33, 0]);
  });
});

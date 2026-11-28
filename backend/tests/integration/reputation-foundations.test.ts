import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import { prisma } from "../../src/config/prisma";
import { ForbiddenError } from "../../src/core/errors";
import { registerReputationKind } from "../../src/policies/reputation";
import {
  acknowledgeWelcomeBack,
  adjustReputation,
  applyInactivityResetTx,
  ensureReputationState,
  getWelcomeState,
  markDailyWelcomeShown,
  openReputationDispute,
  recordReputationEvent,
  recordReputationEventStandalone,
  registerParticipationActivity,
  resetReputationForTestAccounts,
  resolveReputationDispute,
  reverseReputationEvent,
  runInTransaction,
  withdrawReputationDispute,
} from "../../src/modules/reputation/reputation.service";

/**
 * Fondations du système de confiance — PostgreSQL local de TEST uniquement (garde tests/setup/dbGuard.ts).
 * Nécessite TEST_DATABASE_URL. Aucun barème : les valeurs ci-dessous sont des valeurs de test arbitraires.
 */
const test = process.env.TEST_DATABASE_URL ? it : it.skip;
const run = Date.now() + "-" + Math.random().toString(36).slice(2, 7);
const mk = (tag: string) => `rep-${tag}-${run}`;
const userIds: string[] = [];
const DAY = 86_400_000;

registerReputationKind("TEST_RELIABLE", { axis: "RELIABILITY", delta: "ANY" });
registerReputationKind("TEST_PENALTY", { axis: "RELIABILITY", delta: "NON_POSITIVE" });
registerReputationKind("TEST_PARTICIPATION", { axis: "PARTICIPATION", delta: "NON_NEGATIVE" });
registerReputationKind("TEST_POPULARITY", { axis: "POPULARITY", delta: "ANY" });

async function makeUser(tag: string, opts: { coins?: number; role?: Role; legacyScore?: number } = {}) {
  const id = mk(tag);
  userIds.push(id);
  await prisma.user.create({
    data: {
      id,
      email: `${id}@test.local`,
      passwordHash: "x",
      role: opts.role ?? Role.USER,
      wallet: { create: { coins: opts.coins ?? 100 } },
      profile: {
        create: {
          pseudo: `P_${id}`,
          birthDate: new Date("1990-01-01"),
          gender: "HOMME",
          city: "Paris",
          points: 300,
          discoveryActivityScore: opts.legacyScore ?? 0,
        },
      },
    },
  });
  return id;
}

const state = (userId: string) => prisma.reputationState.findUniqueOrThrow({ where: { userId } });
const events = (userId: string) => prisma.reputationEvent.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });

let ADMIN_ID = "";
/** Administrateur réel (clé étrangère de l'audit) ; défini une fois les utilisateurs créés. */
const adm = () => ({ id: ADMIN_ID, role: Role.ADMIN });
beforeAll(async () => {
  if (!process.env.TEST_DATABASE_URL) return;
  ADMIN_ID = await makeUser("admin", { role: Role.ADMIN });
});

afterAll(async () => {
  if (!process.env.TEST_DATABASE_URL) return;
  await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
  await prisma.report.deleteMany({ where: { OR: [{ reporterId: { in: userIds } }, { targetId: { in: userIds } }] } });
  await prisma.match.deleteMany({ where: { OR: [{ userAId: { in: userIds } }, { userBId: { in: userIds } }] } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } }); // cascade : réputation, vacances
});

const input = (userId: string, key: string, over: Record<string, unknown> = {}) => ({
  userId,
  axis: "RELIABILITY" as const,
  kind: "TEST_RELIABLE",
  delta: 3,
  dedupeKey: `${key}:${run}`,
  ...over,
});

describe("état neutre et compatibilité avec les anciennes données", () => {
  test("l'état est créé à la demande, NEUTRE, sans convertir aucun ancien score", async () => {
    const u = await makeUser("neutral", { legacyScore: 57 });
    expect(await prisma.reputationState.findUnique({ where: { userId: u } })).toBeNull(); // aucune création en masse
    const s = await ensureReputationState(prisma, u);
    expect([s.reliability, s.participation, s.popularity, s.epoch, s.evaluatedCommitments, s.resetCount]).toEqual([0, 0, 0, 0, 0, 0]);
    expect(s.reliabilityReassessment).toBe(false);
    expect(s.lastActivityAt).toBeNull();
    expect(s.welcomeBackPendingAt).toBeNull();
    // Les anciennes données sont intactes.
    const p = await prisma.profile.findUniqueOrThrow({ where: { userId: u } });
    expect(p.discoveryActivityScore).toBe(57);
    expect(p.points).toBe(300);
    expect(await events(u)).toHaveLength(0);
  });

  test("ensureReputationState est idempotent et sûr en concurrence", async () => {
    const u = await makeUser("ensure");
    const states = await Promise.all(Array.from({ length: 10 }, () => ensureReputationState(prisma, u)));
    expect(new Set(states.map((s) => s.userId)).size).toBe(1);
    expect(await prisma.reputationState.count({ where: { userId: u } })).toBe(1);
  });

  test("un utilisateur inexistant est refusé proprement (aucune ligne orpheline)", async () => {
    await expect(ensureReputationState(prisma, `ghost-${run}`)).rejects.toThrow();
    expect(await prisma.reputationState.count({ where: { userId: `ghost-${run}` } })).toBe(0);
  });
});

describe("événements : unicité, idempotence, concurrence", () => {
  test("un fait n'est attribué qu'une fois", async () => {
    const u = await makeUser("once");
    const a = await recordReputationEventStandalone(input(u, "fact-1"));
    const b = await recordReputationEventStandalone(input(u, "fact-1"));
    expect(a.applied).toBe(true);
    expect(b.applied).toBe(false);
    expect((await state(u)).reliability).toBe(3);
    expect(await events(u)).toHaveLength(1);
  });

  test("12 requêtes simultanées pour le MÊME fait : une seule application", async () => {
    const u = await makeUser("race-same");
    const results = await Promise.all(Array.from({ length: 12 }, () => recordReputationEventStandalone(input(u, "same-fact", { delta: 5 }))));
    expect(results.filter((r) => r.applied)).toHaveLength(1);
    expect((await state(u)).reliability).toBe(5);
    expect(await events(u)).toHaveLength(1);
  });

  test("20 faits DIFFÉRENTS simultanés : aucun incrément perdu, engagements comptés", async () => {
    const u = await makeUser("race-diff");
    await Promise.all(
      Array.from({ length: 20 }, (_, i) => recordReputationEventStandalone(input(u, `diff-${i}`, { delta: 3, commitment: true }))),
    );
    const s = await state(u);
    expect(s.reliability).toBe(60);
    expect(s.evaluatedCommitments).toBe(20);
    expect(await events(u)).toHaveLength(20);
  });

  test("l'événement enregistre époque et version des règles ; l'état est la somme du registre", async () => {
    const u = await makeUser("sum");
    await recordReputationEventStandalone(input(u, "s1", { delta: 4 }));
    await recordReputationEventStandalone(input(u, "s2", { kind: "TEST_PENALTY", delta: -1, contestable: true }));
    const evs = await events(u);
    expect(evs.every((e) => e.ruleVersion === 1 && e.epoch === 0)).toBe(true);
    expect(evs.reduce((n, e) => n + e.delta, 0)).toBe((await state(u)).reliability);
  });

  test("atomicité : si la transaction appelante échoue, ni événement ni état ne persistent", async () => {
    const u = await makeUser("atomic");
    await expect(
      runInTransaction(async (tx) => {
        await recordReputationEvent(tx, input(u, "atomic-1", { delta: 9 }));
        throw new Error("échec de la fonctionnalité appelante");
      }),
    ).rejects.toThrow("échec");
    expect(await events(u)).toHaveLength(0);
    expect(await prisma.reputationState.findUnique({ where: { userId: u } })).toBeNull();
  });

  test("un événement refusé par la validation n'écrit rien", async () => {
    const u = await makeUser("invalid");
    await expect(recordReputationEventStandalone(input(u, "bad", { delta: 2.5 }))).rejects.toThrow();
    await expect(recordReputationEventStandalone(input(u, "bad2", { kind: "REVERSAL" }))).rejects.toThrow();
    expect(await events(u)).toHaveLength(0);
  });
});

describe("séparation des axes et indépendance des pièces", () => {
  test("chaque axe n'est modifié que par ses propres événements", async () => {
    const u = await makeUser("axes");
    await recordReputationEventStandalone(input(u, "a1", { delta: 7 }));
    await recordReputationEventStandalone(input(u, "a2", { kind: "TEST_PARTICIPATION", axis: "PARTICIPATION", delta: 11 }));
    await recordReputationEventStandalone(input(u, "a3", { kind: "TEST_POPULARITY", axis: "POPULARITY", delta: 13 }));
    const s = await state(u);
    expect([s.reliability, s.participation, s.popularity]).toEqual([7, 11, 13]);
    // Un type fonctionnel refuse un autre axe : aucune ligne, aucun effet.
    await expect(
      recordReputationEventStandalone(input(u, "a4", { kind: "TEST_PARTICIPATION", axis: "RELIABILITY", delta: 5 })),
    ).rejects.toThrow();
    const after = await state(u);
    expect([after.reliability, after.participation, after.popularity]).toEqual([7, 11, 13]);
  });

  test("la participation ne masque jamais un mauvais comportement : les axes ne se compensent pas", async () => {
    const u = await makeUser("nocompensate");
    await recordReputationEventStandalone(input(u, "p", { kind: "TEST_PARTICIPATION", axis: "PARTICIPATION", delta: 500 }));
    await recordReputationEventStandalone(input(u, "r", { kind: "TEST_PENALTY", delta: -8 }));
    const s = await state(u);
    expect(s.reliability).toBe(-8);
    expect(s.participation).toBe(500);
  });

  test("les pièces sont indépendantes : aucune lecture ni écriture du portefeuille, aucune transaction de pièces", async () => {
    const u = await makeUser("coins", { coins: 321 });
    const before = await prisma.coinTransaction.count({ where: { walletId: u } });
    await recordReputationEventStandalone(input(u, "c1", { delta: 40 }));
    await recordReputationEventStandalone(input(u, "c2", { kind: "TEST_PENALTY", delta: -40 }));
    await adjustReputation({ actor: { id: ADMIN_ID, role: Role.ADMIN }, userId: u, axis: "POPULARITY", delta: 25, reason: "test", dedupeKey: `adj-coins:${run}` });
    expect((await prisma.wallet.findUniqueOrThrow({ where: { userId: u } })).coins).toBe(321);
    expect(await prisma.coinTransaction.count({ where: { walletId: u } })).toBe(before);
  });

  test("le moteur n'écrit jamais dans les anciens classements", async () => {
    const u = await makeUser("legacy-untouched", { legacyScore: 12 });
    await recordReputationEventStandalone(input(u, "l1", { delta: 30 }));
    const p = await prisma.profile.findUniqueOrThrow({ where: { userId: u } });
    expect(p.discoveryActivityScore).toBe(12);
    expect(p.discoveryBreakPenalty).toBe(0);
    expect(p.points).toBe(300);
  });
});

describe("annulation par événement compensatoire", () => {
  async function penalize(tag: string) {
    const u = await makeUser(tag);
    await recordReputationEventStandalone(input(u, `${tag}-gain`, { delta: 10 }));
    const pen = await recordReputationEventStandalone(input(u, `${tag}-pen`, { kind: "TEST_PENALTY", delta: -6, contestable: true, commitment: true }));
    return { u, penaltyId: pen.eventId! };
  }

  test("la pénalité injustifiée est annulée ; l'original reste intact ; l'historique est conservé", async () => {
    const { u, penaltyId } = await penalize("rev");
    expect((await state(u)).reliability).toBe(4);
    const before = await prisma.reputationEvent.findUniqueOrThrow({ where: { id: penaltyId } });
    const res = await reverseReputationEvent({ eventId: penaltyId, actor: { id: ADMIN_ID, role: Role.ADMIN }, reason: "pénalité injustifiée" });
    expect(res.applied).toBe(true);
    expect((await state(u)).reliability).toBe(10);
    const after = await prisma.reputationEvent.findUniqueOrThrow({ where: { id: penaltyId } });
    expect(after).toEqual(before); // jamais modifié
    const comp = await prisma.reputationEvent.findUniqueOrThrow({ where: { id: res.reversalEventId! } });
    expect(comp.kind).toBe("REVERSAL");
    expect(comp.delta).toBe(6);
    expect(comp.axis).toBe("RELIABILITY");
    expect(comp.reversalOf).toBe(penaltyId);
    expect(comp.actorId).toBe(ADMIN_ID);
    expect(await events(u)).toHaveLength(3);
    // l'engagement évalué n'est pas « dé-compté » (le fait d'avoir été évalué demeure)
    expect((await state(u)).evaluatedCommitments).toBe(1);
  });

  test("annulation idempotente : une seule fois, même à 8 simultanées", async () => {
    const { u, penaltyId } = await penalize("rev-race");
    const results = await Promise.all(
      Array.from({ length: 8 }, () => reverseReputationEvent({ eventId: penaltyId, actor: { id: ADMIN_ID, role: Role.ADMIN }, reason: "annulation" })),
    );
    expect(results.filter((r) => r.applied)).toHaveLength(1);
    expect(results.filter((r) => r.alreadyReversed)).toHaveLength(7);
    expect(new Set(results.map((r) => r.reversalEventId)).size).toBe(1);
    expect((await state(u)).reliability).toBe(10);
    expect(await prisma.reputationEvent.count({ where: { reversalOf: penaltyId } })).toBe(1);
  });

  test("seuls ADMIN et OWNER annulent ; une annulation ne s'annule pas ; événement inconnu refusé", async () => {
    const { u, penaltyId } = await penalize("rev-perm");
    for (const role of [Role.USER, Role.MODERATOR]) {
      await expect(reverseReputationEvent({ eventId: penaltyId, actor: { id: "x", role }, reason: "tentative" })).rejects.toBeInstanceOf(ForbiddenError);
    }
    expect((await state(u)).reliability).toBe(4);
    const ok = await reverseReputationEvent({ eventId: penaltyId, actor: { id: ADMIN_ID, role: Role.OWNER }, reason: "propriétaire" });
    await expect(reverseReputationEvent({ eventId: ok.reversalEventId!, actor: adm(), reason: "annuler l'annulation" })).rejects.toThrow();
    await expect(reverseReputationEvent({ eventId: "nope", actor: adm(), reason: "inconnu" })).rejects.toThrow();
    expect((await state(u)).reliability).toBe(10);
  });

  test("l'annulation est journalisée dans l'audit", async () => {
    const { penaltyId } = await penalize("rev-audit");
    await reverseReputationEvent({ eventId: penaltyId, actor: { id: ADMIN_ID, role: Role.ADMIN }, reason: "audit" });
    expect(await prisma.auditLog.count({ where: { actorId: ADMIN_ID, action: "reputation.event.reverse", target: penaltyId } })).toBe(1);
  });

  test("ajustement manuel : réservé ADMIN/OWNER, motif obligatoire, idempotent, journalisé", async () => {
    const u = await makeUser("adjust");
    await expect(adjustReputation({ actor: { id: "x", role: Role.USER }, userId: u, axis: "RELIABILITY", delta: 5, reason: "non", dedupeKey: `adj0:${run}` })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(adjustReputation({ actor: { id: ADMIN_ID, role: Role.ADMIN }, userId: u, axis: "RELIABILITY", delta: 5, reason: "", dedupeKey: `adj1:${run}` })).rejects.toThrow();
    const a = await adjustReputation({ actor: { id: ADMIN_ID, role: Role.ADMIN }, userId: u, axis: "RELIABILITY", delta: 5, reason: "geste commercial", dedupeKey: `adj2:${run}` });
    const b = await adjustReputation({ actor: { id: ADMIN_ID, role: Role.ADMIN }, userId: u, axis: "RELIABILITY", delta: 5, reason: "geste commercial", dedupeKey: `adj2:${run}` });
    expect([a.applied, b.applied]).toEqual([true, false]);
    expect((await state(u)).reliability).toBe(5);
  });
});

describe("contestation (préparation)", () => {
  test("le membre conteste SA pénalité contestable ; l'acceptation crée l'annulation compensatoire", async () => {
    const u = await makeUser("disp");
    const pen = await recordReputationEventStandalone(input(u, "d-pen", { kind: "TEST_PENALTY", delta: -9, contestable: true }));
    const d = await openReputationDispute({ userId: u, eventId: pen.eventId!, reason: "je n'ai rien fait" });
    expect(d.status).toBe("OPEN");
    const out = await resolveReputationDispute({ disputeId: d.id, actor: { id: ADMIN_ID, role: Role.ADMIN }, accept: true, resolution: "erreur reconnue" });
    expect(out.accepted).toBe(true);
    expect((await state(u)).reliability).toBe(0);
    const row = await prisma.reputationDispute.findUniqueOrThrow({ where: { id: d.id } });
    expect(row.status).toBe("ACCEPTED");
    expect(row.reversalEventId).toBe(out.reversalEventId);
    expect(row.resolvedBy).toBe(ADMIN_ID);
  });

  test("rejet : aucune annulation ; arbitrage unique même en concurrence", async () => {
    const u = await makeUser("disp-rej");
    const pen = await recordReputationEventStandalone(input(u, "dr-pen", { kind: "TEST_PENALTY", delta: -4, contestable: true }));
    const d = await openReputationDispute({ userId: u, eventId: pen.eventId!, reason: "conteste" });
    const settled = await Promise.allSettled([
      resolveReputationDispute({ disputeId: d.id, actor: adm(), accept: true, resolution: "accepter" }),
      resolveReputationDispute({ disputeId: d.id, actor: adm(), accept: false, resolution: "rejeter" }),
      resolveReputationDispute({ disputeId: d.id, actor: adm(), accept: true, resolution: "accepter encore" }),
    ]);
    expect(settled.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.reputationEvent.count({ where: { reversalOf: pen.eventId! } })).toBeLessThanOrEqual(1);
    const final = await prisma.reputationDispute.findUniqueOrThrow({ where: { id: d.id } });
    expect(final.status === "ACCEPTED" ? (await state(u)).reliability : (await state(u)).reliability).toBe(final.status === "ACCEPTED" ? 0 : -4);
  });

  test("refus : événement non contestable, positif, d'un autre membre, déjà contesté ou annulé", async () => {
    const u = await makeUser("disp-bad");
    const other = await makeUser("disp-other");
    const gain = await recordReputationEventStandalone(input(u, "db-gain", { delta: 5 }));
    const silent = await recordReputationEventStandalone(input(u, "db-silent", { kind: "TEST_PENALTY", delta: -2, contestable: false }));
    const pen = await recordReputationEventStandalone(input(u, "db-pen", { kind: "TEST_PENALTY", delta: -3, contestable: true }));
    await expect(openReputationDispute({ userId: u, eventId: gain.eventId!, reason: "positif" })).rejects.toThrow();
    await expect(openReputationDispute({ userId: u, eventId: silent.eventId!, reason: "non contestable" })).rejects.toThrow();
    await expect(openReputationDispute({ userId: other, eventId: pen.eventId!, reason: "pas le mien" })).rejects.toThrow(/Événement/);
    await openReputationDispute({ userId: u, eventId: pen.eventId!, reason: "première" });
    await expect(openReputationDispute({ userId: u, eventId: pen.eventId!, reason: "seconde" })).rejects.toThrow();
  });

  test("retrait par le membre ; un modérateur n'arbitre pas", async () => {
    const u = await makeUser("disp-wd");
    const pen = await recordReputationEventStandalone(input(u, "dw-pen", { kind: "TEST_PENALTY", delta: -3, contestable: true }));
    const d = await openReputationDispute({ userId: u, eventId: pen.eventId!, reason: "à retirer" });
    await expect(resolveReputationDispute({ disputeId: d.id, actor: { id: "m", role: Role.MODERATOR }, accept: true, resolution: "non" })).rejects.toBeInstanceOf(ForbiddenError);
    expect(await withdrawReputationDispute({ userId: "someone-else", disputeId: d.id })).toBe(false);
    expect(await withdrawReputationDispute({ userId: u, disputeId: d.id })).toBe(true);
    expect(await withdrawReputationDispute({ userId: u, disputeId: d.id })).toBe(false);
  });
});

describe("remise à zéro après inactivité", () => {
  async function seedActive(tag: string, daysSinceActivity: number) {
    const u = await makeUser(tag, { coins: 777 });
    await recordReputationEventStandalone(input(u, `${tag}-r`, { delta: 20, commitment: true }));
    await recordReputationEventStandalone(input(u, `${tag}-p`, { kind: "TEST_PARTICIPATION", axis: "PARTICIPATION", delta: 15 }));
    await recordReputationEventStandalone(input(u, `${tag}-v`, { kind: "TEST_POPULARITY", axis: "POPULARITY", delta: 9 }));
    await prisma.reputationState.update({ where: { userId: u }, data: { lastActivityAt: new Date(Date.now() - daysSinceActivity * DAY) } });
    return u;
  }

  test("DÉSACTIVÉE par défaut : sans seuil, rien ne se produit", async () => {
    const u = await seedActive("reset-off", 1000);
    const r = await registerParticipationActivity({ userId: u, thresholdDays: null });
    expect(r.reset).toBe(false);
    const s = await state(u);
    expect([s.reliability, s.participation, s.popularity, s.epoch]).toEqual([20, 15, 9, 0]);
  });

  test("activité inconnue (aucune donnée) : jamais de remise à zéro déduite", async () => {
    const u = await makeUser("reset-unknown");
    await recordReputationEventStandalone(input(u, "ru", { delta: 5 }));
    const r = await registerParticipationActivity({ userId: u, thresholdDays: 90 });
    expect(r.reset).toBe(false);
    expect((await state(u)).reliability).toBe(5);
    expect((await state(u)).lastActivityAt).not.toBeNull(); // la prochaine échéance partira de maintenant
  });

  test("avant le seuil : rien ; au seuil : remise à zéro des TROIS axes, époque suivante, réévaluation, accueil de retour", async () => {
    const early = await seedActive("reset-early", 89);
    expect((await registerParticipationActivity({ userId: early, thresholdDays: 90 })).reset).toBe(false);
    expect((await state(early)).reliability).toBe(20);

    const u = await seedActive("reset-due", 90);
    const r = await registerParticipationActivity({ userId: u, thresholdDays: 90 });
    expect(r).toEqual({ reset: true, epoch: 1 });
    const s = await state(u);
    expect([s.reliability, s.participation, s.popularity, s.evaluatedCommitments]).toEqual([0, 0, 0, 0]);
    expect(s.epoch).toBe(1);
    expect(s.resetCount).toBe(1);
    expect(s.reliabilityReassessment).toBe(true);
    expect(s.welcomeBackPendingAt).not.toBeNull();
    expect(s.lastResetAt).not.toBeNull();
    // la nouvelle activité est enregistrée APRÈS la remise à zéro
    expect(Date.now() - s.lastActivityAt!.getTime()).toBeLessThan(60_000);
  });

  test("IDEMPOTENTE : 10 requêtes simultanées après une longue absence = une seule remise à zéro", async () => {
    const u = await seedActive("reset-race", 200);
    const results = await Promise.all(Array.from({ length: 10 }, () => registerParticipationActivity({ userId: u, thresholdDays: 90 })));
    expect(results.filter((r) => r.reset)).toHaveLength(1);
    const s = await state(u);
    expect(s.epoch).toBe(1);
    expect(s.resetCount).toBe(1);
    expect(await prisma.reputationEvent.count({ where: { userId: u, kind: "INACTIVITY_RESET" } })).toBe(1);
  });

  test("pas de seconde remise à zéro tant qu'aucune nouvelle activité ; possible après une nouvelle période d'inactivité", async () => {
    const u = await seedActive("reset-twice", 100);
    await runInTransaction((tx) => applyInactivityResetTx(tx, { userId: u, thresholdDays: 90 }));
    // appel direct, sans nouvelle activité, bien plus tard : plus rien à remettre à zéro
    const later = new Date(Date.now() + 400 * DAY);
    const again = await runInTransaction((tx) => applyInactivityResetTx(tx, { userId: u, now: later, thresholdDays: 90 }));
    expect(again.reset).toBe(false);
    expect((await state(u)).resetCount).toBe(1);
    // nouvelle activité (enregistrée à une date passée de la période), puis nouvelle longue absence
    await prisma.reputationState.update({ where: { userId: u }, data: { lastActivityAt: new Date(Date.now() + DAY) } });
    const third = await runInTransaction((tx) => applyInactivityResetTx(tx, { userId: u, now: later, thresholdDays: 90 }));
    expect(third.reset).toBe(true);
    expect((await state(u)).resetCount).toBe(2);
  });

  test("le mode vacances n'empêche pas la remise à zéro (règle validée)", async () => {
    const u = await seedActive("reset-vacation", 120);
    await prisma.userSettings.create({ data: { userId: u, vacationMode: true, vacationStartedAt: new Date(Date.now() - 100 * DAY) } });
    expect((await registerParticipationActivity({ userId: u, thresholdDays: 90 })).reset).toBe(true);
  });

  test("AUCUNE autre donnée n'est supprimée : pièces, profil, correspondances, notifications, signalements, historique de points", async () => {
    const u = await seedActive("reset-keep", 150);
    const other = await makeUser("reset-keep-other");
    const [a, b] = [u, other].sort();
    const match = await prisma.match.create({ data: { userAId: a!, userBId: b!, initiatorId: u, status: "ACTIVE", letterCountA: 2, letterCountB: 1 } });
    await prisma.notification.create({ data: { userId: u, type: "LETTER_RECEIVED", message: "Nouvelle lettre", dedupeKey: `keep:${run}` } });
    await prisma.report.create({ data: { reporterId: other, targetId: u, reason: "OTHER", details: "historique de modération" } });
    await prisma.userSettings.create({ data: { userId: u, vacationMode: false } });
    await prisma.vacationPeriod.create({ data: { userId: u, startedAt: new Date(Date.now() - 300 * DAY), endedAt: new Date(Date.now() - 290 * DAY) } });
    const eventsBefore = await prisma.reputationEvent.count({ where: { userId: u } });

    expect((await registerParticipationActivity({ userId: u, thresholdDays: 90 })).reset).toBe(true);

    expect((await prisma.wallet.findUniqueOrThrow({ where: { userId: u } })).coins).toBe(777);
    expect((await prisma.profile.findUniqueOrThrow({ where: { userId: u } })).points).toBe(300);
    expect(await prisma.match.findUnique({ where: { id: match.id } })).not.toBeNull();
    expect(await prisma.notification.count({ where: { userId: u } })).toBe(1);
    expect(await prisma.report.count({ where: { targetId: u } })).toBe(1);
    expect(await prisma.vacationPeriod.count({ where: { userId: u } })).toBe(1);
    expect(await prisma.userSettings.count({ where: { userId: u } })).toBe(1);
    // tout l'historique des événements est conservé (+ le repère de remise à zéro)
    expect(await prisma.reputationEvent.count({ where: { userId: u } })).toBe(eventsBefore + 1);
    const marker = await prisma.reputationEvent.findFirstOrThrow({ where: { userId: u, kind: "INACTIVITY_RESET" } });
    expect((marker.meta as { previous: { reliability: number } }).previous.reliability).toBe(20);
  });

  test("écriture de l'activité limitée (au plus une par heure) : économie d'écritures", async () => {
    const u = await makeUser("throttle");
    await ensureReputationState(prisma, u);
    const t0 = new Date();
    await registerParticipationActivity({ userId: u, at: t0, thresholdDays: null });
    const first = (await state(u)).lastActivityAt!;
    await registerParticipationActivity({ userId: u, at: new Date(t0.getTime() + 10 * 60_000), thresholdDays: null });
    expect((await state(u)).lastActivityAt!.getTime()).toBe(first.getTime());
    await registerParticipationActivity({ userId: u, at: new Date(t0.getTime() + 2 * 3_600_000), thresholdDays: null });
    expect((await state(u)).lastActivityAt!.getTime()).toBeGreaterThan(first.getTime());
  });

  test("un événement d'une époque révolue : journalisé mais sans effet sur l'état courant (annulation après remise à zéro)", async () => {
    const u = await makeUser("old-epoch");
    const pen = await recordReputationEventStandalone(input(u, "oe-pen", { kind: "TEST_PENALTY", delta: -5, contestable: true }));
    await prisma.reputationState.update({ where: { userId: u }, data: { lastActivityAt: new Date(Date.now() - 200 * DAY) } });
    await registerParticipationActivity({ userId: u, thresholdDays: 90 });
    expect((await state(u)).reliability).toBe(0);
    const rev = await reverseReputationEvent({ eventId: pen.eventId!, actor: adm(), reason: "ancienne époque" });
    expect(rev.applied).toBe(true);
    expect((await state(u)).reliability).toBe(0); // la compensation ne fabrique pas de points
    expect((await prisma.reputationEvent.findUniqueOrThrow({ where: { id: rev.reversalEventId! } })).affectsState).toBe(false);
    await expect(openReputationDispute({ userId: u, eventId: pen.eventId!, reason: "trop tard" })).rejects.toThrow();
  });
});

describe("données des accueils", () => {
  test("accueil quotidien : un seul affichage par date locale, même en concurrence", async () => {
    const u = await makeUser("welcome");
    const today = new Date().toISOString().slice(0, 10);
    const results = await Promise.all(Array.from({ length: 10 }, () => markDailyWelcomeShown(u, today)));
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await markDailyWelcomeShown(u, today)).toBe(false);
    expect((await getWelcomeState(u)).lastWelcomeDay).toBe(today);
    // jour local suivant (fuseau en avance d'un jour) : de nouveau permis
    const tomorrow = new Date(Date.now() + DAY).toISOString().slice(0, 10);
    expect(await markDailyWelcomeShown(u, tomorrow)).toBe(true);
    // revenir en arrière (changement de fuseau) ne réaffiche pas
    expect(await markDailyWelcomeShown(u, today)).toBe(false);
    await expect(markDailyWelcomeShown(u, "2020-01-01")).rejects.toThrow();
    await expect(markDailyWelcomeShown(u, "pas-une-date")).rejects.toThrow();
  });

  test("accueil de retour : en attente après la remise à zéro, acquitté une seule fois", async () => {
    const u = await makeUser("welcome-back");
    await recordReputationEventStandalone(input(u, "wb", { delta: 1 }));
    expect((await getWelcomeState(u)).welcomeBackPending).toBe(false);
    await prisma.reputationState.update({ where: { userId: u }, data: { lastActivityAt: new Date(Date.now() - 100 * DAY) } });
    await registerParticipationActivity({ userId: u, thresholdDays: 90 });
    expect((await getWelcomeState(u)).welcomeBackPending).toBe(true);
    const acks = await Promise.all(Array.from({ length: 6 }, () => acknowledgeWelcomeBack(u)));
    expect(acks.filter(Boolean)).toHaveLength(1);
    expect((await getWelcomeState(u)).welcomeBackPending).toBe(false);
  });
});

describe("outils de réinitialisation des comptes de test et suppression de comptes", () => {
  test("resetReputationForTestAccounts : efface seulement les comptes indiqués, refuse en production", async () => {
    const a = await makeUser("tool-a");
    const b = await makeUser("tool-b");
    await recordReputationEventStandalone(input(a, "ta", { delta: -5, contestable: true, kind: "TEST_PENALTY" }));
    await recordReputationEventStandalone(input(b, "tb", { delta: 5 }));
    const out = await resetReputationForTestAccounts([a]);
    expect(out.states).toBe(1);
    expect(await prisma.reputationEvent.count({ where: { userId: a } })).toBe(0);
    expect(await prisma.reputationEvent.count({ where: { userId: b } })).toBe(1);
    expect((await state(b)).reliability).toBe(5);
    // l'état repart neutre à la demande
    expect((await ensureReputationState(prisma, a)).reliability).toBe(0);

    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      await expect(resetReputationForTestAccounts([b])).rejects.toBeInstanceOf(ForbiddenError);
    } finally {
      process.env.NODE_ENV = prev;
    }
    expect(await prisma.reputationEvent.count({ where: { userId: b } })).toBe(1);
  });

  test("la suppression d'un compte (outils de test, RGPD) supprime sa réputation sans erreur", async () => {
    const u = await makeUser("cascade");
    const pen = await recordReputationEventStandalone(input(u, "cs", { kind: "TEST_PENALTY", delta: -2, contestable: true }));
    await openReputationDispute({ userId: u, eventId: pen.eventId!, reason: "cascade" });
    await reverseReputationEvent({ eventId: pen.eventId!, actor: adm(), reason: "avant suppression" }).catch(() => undefined);
    await prisma.user.delete({ where: { id: u } });
    expect(await prisma.reputationState.count({ where: { userId: u } })).toBe(0);
    expect(await prisma.reputationEvent.count({ where: { userId: u } })).toBe(0);
    expect(await prisma.reputationDispute.count({ where: { userId: u } })).toBe(0);
  });
});

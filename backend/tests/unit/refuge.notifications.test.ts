import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/modules/notifications/notify.service", () => ({
  notifyEvent: vi.fn().mockResolvedValue({ created: true, notificationId: "n" }),
}));
vi.mock("../../src/config/prisma", () => ({ prisma: { refugeSession: { findMany: vi.fn() } } }));

import { NotificationType } from "@prisma/client";
import { notifyEvent } from "../../src/modules/notifications/notify.service";
import { prisma } from "../../src/config/prisma";
import * as N from "../../src/modules/refuge/refuge.notifications";
import { buildNotificationMessage, buildPushPayload, sponsorTitle } from "../../src/policies/notifications";
import { findNewDayTargets, notifyRefugeNewDayJob, resetHandledNewDays } from "../../src/jobs/notifyRefugeNewDay";

const S = "sess-1", C = "companion-1", P = "sponsor-1";
const sent = () => (notifyEvent as any).mock.calls.map((c: any[]) => c[0]);
beforeEach(() => { vi.clearAllMocks(); (notifyEvent as any).mockResolvedValue({ created: true, notificationId: "n" }); resetHandledNewDays(); });

describe("destinataires, auteurs et clés anti-doublon", () => {
  it("adoption → compagnon uniquement (l'auteur n'est jamais notifié)", async () => {
    await N.notifyAdopted({ refugeSessionId: S, companionId: C, sponsorId: P });
    expect(sent()).toEqual([{ recipientId: C, actorId: P, type: "REFUGE_ADOPTED", meta: { refugeSessionId: S }, dedupeKey: `refuge-adopted:${S}` }]);
  });

  it("compagnon prêt → parrain/marraine uniquement, une clé par jour", async () => {
    await N.notifyChoiceReady({ refugeSessionId: S, dayNumber: 3, companionId: C, sponsorId: P });
    expect(sent()).toEqual([{ recipientId: P, actorId: C, type: "REFUGE_CHOICE_READY", meta: { refugeSessionId: S }, dedupeKey: `refuge-choice-ready:${S}:3` }]);
  });

  it("réponse du parrain/de la marraine (jours 1 à 6) : score au parrain, « résultat prêt » au compagnon", async () => {
    await N.notifyGuessSubmitted({ refugeSessionId: S, dayNumber: 2, lastDay: false, companionId: C, sponsorId: P, sponsorGender: "FEMME", score: 1, sponsorCoins: 5 });
    const calls = sent();
    expect(calls).toHaveLength(2);
    expect(calls.find((c: any) => c.type === "REFUGE_DAY_RESULT")).toEqual({
      recipientId: P, counterpartId: C, type: "REFUGE_DAY_RESULT", meta: { refugeSessionId: S },
      dedupeKey: `refuge-day-result:${S}:2`, textContext: { refugeScore: 1, coinsDelta: 5 },
    });
    expect(calls.find((c: any) => c.type === "REFUGE_RESULT_READY")).toEqual({
      recipientId: C, actorId: P, type: "REFUGE_RESULT_READY", meta: { refugeSessionId: S },
      dedupeKey: `refuge-result-ready:${S}:2`, textContext: { sponsorGender: "FEMME" },
    });
  });

  it("0/2 : score annoncé sans pièces (aucun gain)", async () => {
    await N.notifyGuessSubmitted({ refugeSessionId: S, dayNumber: 1, lastDay: false, companionId: C, sponsorId: P, sponsorGender: null, score: 0, sponsorCoins: 0 });
    expect(sent().find((c: any) => c.type === "REFUGE_DAY_RESULT").textContext).toEqual({ refugeScore: 0, coinsDelta: null });
  });

  it("jour 7 : fin des sept jours pour les DEUX participants, score au parrain, pas de « résultat prêt » en plus", async () => {
    await N.notifyGuessSubmitted({ refugeSessionId: S, dayNumber: 7, lastDay: true, companionId: C, sponsorId: P, sponsorGender: "HOMME", score: 2, sponsorCoins: 10 });
    const calls = sent();
    expect(calls.filter((c: any) => c.type === "REFUGE_REVEAL_PHASE").map((c: any) => c.recipientId).sort()).toEqual([C, P].sort());
    expect(calls.filter((c: any) => c.type === "REFUGE_REVEAL_PHASE").every((c: any) => c.dedupeKey === `refuge-reveal-phase:${S}`)).toBe(true);
    expect(calls.some((c: any) => c.type === "REFUGE_RESULT_READY")).toBe(false);
    expect(calls.filter((c: any) => c.type === "REFUGE_DAY_RESULT").map((c: any) => c.recipientId)).toEqual([P]);
  });

  it("nouvelle journée → compagnon uniquement, une clé par jour", async () => {
    await N.notifyNewDay({ refugeSessionId: S, dayNumber: 4, companionId: C, sponsorId: P });
    expect(sent()).toEqual([{ recipientId: C, counterpartId: P, type: "REFUGE_NEW_DAY", meta: { refugeSessionId: S }, dedupeKey: `refuge-new-day:${S}:4` }]);
  });

  it("pièces : une notification par participant concerné, jamais pour 0, clé liée aux jours réglés", async () => {
    await N.notifyCoinsSettled({ refugeSessionId: S, days: [3, 1, 2], companionId: C, sponsorId: P, companionApplied: 15, sponsorApplied: 0 });
    expect(sent()).toEqual([{ recipientId: C, counterpartId: P, type: "REFUGE_COINS", meta: { refugeSessionId: S }, dedupeKey: `refuge-coins:${S}:1-2-3`, textContext: { coinsDelta: 15 } }]);
    vi.clearAllMocks();
    await N.notifyCoinsSettled({ refugeSessionId: S, days: [1], companionId: C, sponsorId: P, companionApplied: 0, sponsorApplied: 0 });
    expect(notifyEvent).not.toHaveBeenCalled();
  });

  it("dévoilement mutuel → les deux ; refus → l'autre seulement ; expiration → les deux", async () => {
    await N.notifyRevealed({ refugeSessionId: S, acceptedLastBy: P, otherId: C });
    expect(sent().map((c: any) => c.recipientId).sort()).toEqual([C, P].sort());
    expect(sent().every((c: any) => c.type === "REFUGE_REVEALED" && c.dedupeKey === `refuge-revealed:${S}`)).toBe(true);
    vi.clearAllMocks();
    await N.notifyRevealRefused({ refugeSessionId: S, refusedBy: P, otherId: C });
    expect(sent()).toEqual([{ recipientId: C, actorId: P, type: "REFUGE_REVEAL_REFUSED", meta: { refugeSessionId: S }, dedupeKey: `refuge-reveal-refused:${S}` }]);
    vi.clearAllMocks();
    await N.notifyExpired({ refugeSessionId: S, companionId: C, sponsorId: P });
    expect(sent().map((c: any) => c.recipientId).sort()).toEqual([C, P].sort());
    expect(sent().every((c: any) => c.type === "REFUGE_EXPIRED" && !("actorId" in c))).toBe(true);
  });

  it("toute notification du Refuge n'emporte QUE refugeSessionId (redirection vers LE Refuge concerné)", async () => {
    await N.notifyAdopted({ refugeSessionId: S, companionId: C, sponsorId: P });
    await N.notifyChoiceReady({ refugeSessionId: S, dayNumber: 1, companionId: C, sponsorId: P });
    await N.notifyGuessSubmitted({ refugeSessionId: S, dayNumber: 1, lastDay: false, companionId: C, sponsorId: P, sponsorGender: null, score: 2, sponsorCoins: 10 });
    await N.notifyNewDay({ refugeSessionId: S, dayNumber: 2, companionId: C, sponsorId: P });
    await N.notifyExpired({ refugeSessionId: S, companionId: C, sponsorId: P });
    for (const c of sent()) expect(c.meta).toEqual({ refugeSessionId: S });
  });
});

describe("textes : vocabulaire, gabarits exacts, aucune révélation", () => {
  const T = NotificationType;
  const text = (t: NotificationType, ctx?: Parameters<typeof buildNotificationMessage>[1]) => buildNotificationMessage(t, ctx);

  it("textes demandés, mot pour mot", () => {
    expect(text(T.REFUGE_ADOPTED)).toBe("Tu as été adopté ! Ton aventure de sept jours commence.");
    expect(text(T.REFUGE_CHOICE_READY)).toBe("Ton compagnon attend tes deux actions du jour.");
  });

  it("« résultat prêt » : parrain, marraine ou formulation double selon le genre", () => {
    expect(text(T.REFUGE_RESULT_READY, { sponsorGender: "HOMME" })).toBe("Ton parrain a validé ses actions : découvre le résultat du jour.");
    expect(text(T.REFUGE_RESULT_READY, { sponsorGender: "FEMME" })).toBe("Ta marraine a validé ses actions : découvre le résultat du jour.");
    for (const g of ["AUTRE", null, undefined, "x"]) {
      expect(text(T.REFUGE_RESULT_READY, { sponsorGender: g as any })).toBe("Ton parrain ou ta marraine a validé ses actions : découvre le résultat du jour.");
    }
    expect(sponsorTitle("FEMME")).toEqual({ possessive: "Ta", noun: "marraine" });
  });

  it("score du jour : 0/2, 1/2, 2/2, avec les pièces seulement si elles ont été gagnées", () => {
    expect(text(T.REFUGE_DAY_RESULT, { refugeScore: 2, coinsDelta: 10 })).toBe("Résultat du jour : 2/2, bravo ! +10 pièces.");
    expect(text(T.REFUGE_DAY_RESULT, { refugeScore: 1, coinsDelta: 5 })).toBe("Résultat du jour : 1/2. +5 pièces.");
    expect(text(T.REFUGE_DAY_RESULT, { refugeScore: 0, coinsDelta: null })).toBe("Résultat du jour : 0/2.");
    expect(text(T.REFUGE_DAY_RESULT, { refugeScore: 0, coinsDelta: 0 })).toBe("Résultat du jour : 0/2.");
    for (const bad of [3, -1, 1.5, null, undefined, "2" as any]) expect(text(T.REFUGE_DAY_RESULT, { refugeScore: bad as any })).toBe("Le résultat du jour est disponible.");
  });

  it("pièces effectivement appliquées : gain, perte, singulier/pluriel ; valeur invalide → texte générique", () => {
    expect(text(T.REFUGE_COINS, { coinsDelta: 5 })).toBe("Refuge : +5 pièces ajoutées à ton solde.");
    expect(text(T.REFUGE_COINS, { coinsDelta: 1 })).toBe("Refuge : +1 pièce ajoutée à ton solde.");
    expect(text(T.REFUGE_COINS, { coinsDelta: -3 })).toBe("Refuge : 3 pièces retirées de ton solde.");
    expect(text(T.REFUGE_COINS, { coinsDelta: -1 })).toBe("Refuge : 1 pièce retirée de ton solde.");
    for (const bad of [0, 2.5, NaN, 1e9, "5" as any, null]) expect(text(T.REFUGE_COINS, { coinsDelta: bad as any })).toBe("Ton solde de pièces a changé après ton refuge.");
  });

  it("nouvelle journée, fin, refus, expiration", () => {
    expect(text(T.REFUGE_NEW_DAY)).toBe("Une nouvelle journée commence : tu peux choisir tes deux actions.");
    expect(text(T.REFUGE_REVEAL_PHASE)).toBe("Ton refuge arrive à son terme : choisis de te dévoiler ou non");
    expect(text(T.REFUGE_REVEAL_REFUSED)).toBe("Votre refuge se termine sans dévoilement. D'autres rencontres vous attendent.");
    expect(text(T.REFUGE_EXPIRED)).toBe("Votre refuge est terminé : le temps imparti est écoulé.");
  });

  it("AUCUN texte du Refuge ne nomme une action ni ne parle de « gestes » ; « adopté le refuge » jamais réintroduit", () => {
    const all = Object.values(T).filter((t) => t.startsWith("REFUGE_"));
    expect(all.length).toBeGreaterThanOrEqual(10);
    for (const t of all) {
      const m = text(t as NotificationType, { sponsorGender: "FEMME", refugeScore: 1, coinsDelta: 5 });
      expect(m, t).not.toMatch(/nourrir|caresser|câliner|laver|jouer|geste|adopté le refuge/i);
    }
  });

  it("le compagnon n'apprend JAMAIS le score avant d'ouvrir le Refuge : « résultat prêt » ne contient ni score ni pièces, même avec un contexte complet", () => {
    for (const ctx of [{ refugeScore: 2, coinsDelta: 10, sponsorGender: "HOMME" }, { refugeScore: 0, coinsDelta: -5 }]) {
      expect(text(T.REFUGE_RESULT_READY, ctx as any)).not.toMatch(/\d|pièce|bravo/);
    }
  });

  it("push : même texte que la cloche, destination /refuge, seul refugeSessionId transmis, aucun secret", () => {
    for (const t of ["REFUGE_CHOICE_READY", "REFUGE_RESULT_READY", "REFUGE_DAY_RESULT", "REFUGE_NEW_DAY", "REFUGE_COINS", "REFUGE_REVEAL_REFUSED", "REFUGE_EXPIRED"]) {
      const ctx = { sponsorGender: "FEMME", refugeScore: 2, coinsDelta: 10 };
      const payload = buildPushPayload(t, { refugeSessionId: S, pseudo: "Alice", action: "NOURRIR" } as any, ctx as any);
      expect(payload.body, t).toBe(buildNotificationMessage(t as NotificationType, ctx));
      expect(payload.data, t).toEqual({ type: t, refugeSessionId: S });
      expect(JSON.stringify(payload)).not.toMatch(/Alice|NOURRIR/);
    }
  });
});

describe("job « nouvelle journée » : cibles, coût Neon, doublons", () => {
  const H = 3600_000, D = 24 * H;
  const now = new Date("2026-11-27T12:00:00Z");
  const session = (over: Record<string, unknown> = {}) => {
    const startedAt = new Date(now.getTime() - (D + 2 * H)); // jour 2
    return { id: "s", adopteId: C, adoptantId: P, createdAt: new Date(startedAt.getTime() - D), startedAt, endsAt: new Date(startedAt.getTime() + 7 * D), dailyChoices: [] as { dayNumber: number }[], ...over } as any;
  };

  it("jour 2 sans choix → compagnon ciblé ; jour 1, choix déjà fait, session expirée ou sans parrain → personne", () => {
    expect(findNewDayTargets([session()], now)).toEqual([{ refugeSessionId: "s", dayNumber: 2, companionId: C, sponsorId: P, key: "s:2" }]);
    expect(findNewDayTargets([session({ startedAt: new Date(now.getTime() - 2 * H) })], now)).toEqual([]); // jour 1 : adoption déjà notifiée
    expect(findNewDayTargets([session({ dailyChoices: [{ dayNumber: 2 }] })], now)).toEqual([]);
    expect(findNewDayTargets([session({ endsAt: new Date(now.getTime() - 1) })], now)).toEqual([]);
    expect(findNewDayTargets([session({ adoptantId: null })], now)).toEqual([]);
    expect(findNewDayTargets([session({ dailyChoices: [{ dayNumber: 1 }] })], now)).toHaveLength(1); // choix d'hier ≠ choix du jour
  });

  it("jours 2 à 7 ciblés ; jour 7 inclus (dernier jour)", () => {
    for (let day = 2; day <= 7; day++) {
      const startedAt = new Date(now.getTime() - ((day - 1) * D + H));
      const t = findNewDayTargets([session({ startedAt, createdAt: new Date(startedAt.getTime() - D), endsAt: new Date(now.getTime() + 3 * D) })], now);
      expect(t[0]?.dayNumber).toBe(day);
    }
  });

  it("UNE seule requête de lecture par exécution, quelle que soit la taille ; aucune requête par session", async () => {
    (prisma.refugeSession.findMany as any).mockResolvedValue([session({ id: "a" }), session({ id: "b" }), session({ id: "c", dailyChoices: [{ dayNumber: 2 }] })]);
    const result = await notifyRefugeNewDayJob.run(now);
    expect(prisma.refugeSession.findMany).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ scanned: 3, affected: 2 });
    expect(sent().map((c: any) => c.dedupeKey).sort()).toEqual(["refuge-new-day:a:2", "refuge-new-day:b:2"]);
  });

  it("déjà traité par ce processus : aucune nouvelle tentative (pas de requête répétée pour la même journée)", async () => {
    (prisma.refugeSession.findMany as any).mockResolvedValue([session()]);
    await notifyRefugeNewDayJob.run(now);
    await notifyRefugeNewDayJob.run(new Date(now.getTime() + H));
    await notifyRefugeNewDayJob.run(new Date(now.getTime() + 2 * H));
    expect(notifyEvent).toHaveBeenCalledTimes(1);
  });

  it("échec d'envoi : la journée sera retentée à l'exécution suivante ; doublon en base : traité sans erreur", async () => {
    (prisma.refugeSession.findMany as any).mockResolvedValue([session()]);
    (notifyEvent as any).mockResolvedValueOnce({ created: false, reason: "error" });
    await notifyRefugeNewDayJob.run(now);
    (notifyEvent as any).mockResolvedValueOnce({ created: false, reason: "duplicate" });
    expect(await notifyRefugeNewDayJob.run(now)).toMatchObject({ affected: 0 });
    await notifyRefugeNewDayJob.run(now);
    expect(notifyEvent).toHaveBeenCalledTimes(2); // erreur → retentée ; doublon → clé mémorisée, plus de tentative
  });

  it("cadence horaire (comme closeRefugeDays) : jamais une requête par minute", () => {
    expect(notifyRefugeNewDayJob.cadence).toBe("hourly");
  });
});

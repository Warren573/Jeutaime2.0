import { afterAll, describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { prisma } from "../../src/config/prisma";
import { registerParticipationActivity, runInTransaction } from "../../src/modules/reputation/reputation.service";
import {
  applyDiversityBonus,
  applyReputationReward,
  getReliabilityLevel,
  recordReliabilityIncident,
} from "../../src/modules/reputation/reputation.rules.service";
import { textFingerprint, type PenaltyFamily, type RewardKey } from "../../src/policies/reputationRules";
import type { DiversityMetrics, ThreadMessage } from "../../src/policies/reputationDiversity";

/**
 * Simulations jour par jour (horloge injectée) sur PostgreSQL LOCAL de test.
 * Si REPUTATION_SIM_OUT est défini, les tableaux chiffrés sont écrits dans ce fichier Markdown.
 */
const test = process.env.TEST_DATABASE_URL ? it : it.skip;
const run = Date.now() + "-" + Math.random().toString(36).slice(2, 7);
const ids: string[] = [];
const DAY = 86_400_000;
const START = new Date("2026-12-07T09:00:00Z"); // lundi
const at = (d: number, h = 0) => new Date(START.getTime() + d * DAY + h * 3_600_000);
const dk = (d: Date) => d.toISOString().slice(0, 10);
const ACTIVE = { mode: "active" as const, effectiveFrom: null };

async function user(tag: string) {
  const id = `sim-${tag}-${run}`;
  ids.push(id);
  await prisma.user.create({ data: { id, email: `${id}@test.local`, passwordHash: "x", isVerified: true, wallet: { create: { coins: 100 } } } });
  return id;
}
const rw = (key: RewardKey, u: string, sourceId: string, now: Date, extra: Record<string, unknown> = {}) =>
  runInTransaction((tx) => applyReputationReward(tx, key, u, { sourceType: "Sim", sourceId, conditionsMet: true, dayKey: dk(now), ...extra }, { ...ACTIVE, now }));
const inc = (family: PenaltyFamily, u: string, sourceId: string, now: Date) =>
  runInTransaction((tx) => recordReliabilityIncident(tx, family, u, { sourceType: "Sim", sourceId, classification: "CLEAR_BREACH" }, { ...ACTIVE, now }));

type Row = { week: number; reliability: number; participation: number; popularity: number; level: string };
async function snapshot(u: string, week: number, now: Date): Promise<Row> {
  const s = await prisma.reputationState.findUnique({ where: { userId: u } });
  const lvl = await getReliabilityLevel(prisma, u, now);
  return { week, reliability: s?.reliability ?? 0, participation: s?.participation ?? 0, popularity: s?.popularity ?? 0, level: lvl.label };
}
const table = (title: string, rows: Row[]) =>
  `### ${title}\n\n| Semaine | Fiabilité | Participation | Popularité | Niveau |\n|---|---:|---:|---:|---|\n` +
  rows.map((r) => `| ${r.week} | ${r.reliability} | ${r.participation} | ${r.popularity} | ${r.level} |`).join("\n") + "\n";

const report: string[] = [];

afterAll(async () => {
  if (process.env.REPUTATION_SIM_OUT) writeFileSync(process.env.REPUTATION_SIM_OUT, report.join("\n"));
  if (!process.env.TEST_DATABASE_URL) return;
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
});

describe("simulations multi-semaines", () => {
  test("membre DISCRET et respectueux : 10 semaines, atteint « Exemplaire » sans jamais écrire beaucoup", async () => {
    const u = await user("discreet");
    const rows: Row[] = [];
    for (let w = 0; w < 10; w++) {
      const d = w * 7;
      await rw("LETTER_REPLY", u, `lr-${w}-a`, at(d + 1), { partnerId: `p${w % 3}` });
      await rw("LETTER_REPLY", u, `lr-${w}-b`, at(d + 3), { partnerId: `p${w % 3}` });
      await rw("REFUGE_COMPLETED", u, `rf-${w}`, at(d + 4));
      if (w % 2 === 0) await rw("SALON_COMPLETED", u, `sa-${w}`, at(d + 5));
      rows.push(await snapshot(u, w + 1, at(d + 6)));
    }
    report.push(table("Membre discret et respectueux (≈ 4 actions par semaine)", rows));
    expect(rows[0]!.level).toBe("Nouveau membre");
    expect(rows[9]!.level).toBe("Exemplaire");
    expect(rows[9]!.reliability).toBeLessThanOrEqual(10 * 60); // plafond hebdomadaire
  });

  test("membre TRÈS ACTIF qui tente de tout cumuler : les plafonds s'appliquent chaque semaine", async () => {
    const u = await user("active");
    const rows: Row[] = [];
    for (let w = 0; w < 6; w++) {
      for (let day = 0; day < 7; day++) {
        const now = at(w * 7 + day, 1);
        for (let i = 0; i < 40; i++) await rw("ELECTION_VOTE", u, `v-${w}-${day}-${i}`, now);
        for (let i = 0; i < 12; i++) await rw("LETTER_REPLY", u, `lr-${w}-${day}-${i}`, now, { partnerId: `q${i % 4}` });
        for (let i = 0; i < 6; i++) await rw("REFUGE_COMPLETED", u, `rf-${w}-${day}-${i}`, now);
        for (let i = 0; i < 6; i++) await rw("SALON_COMPLETED", u, `sc-${w}-${day}-${i}`, now);
        for (let i = 0; i < 8; i++) await rw("SALON_ACTIVE_DAY", u, `sd-${w}-${day}-${i}`, now);
      }
      rows.push(await snapshot(u, w + 1, at(w * 7 + 6)));
    }
    report.push(table("Membre très actif (tente de maximiser chaque jour)", rows));
    for (let w = 1; w < rows.length; w++) {
      expect(rows[w]!.reliability - rows[w - 1]!.reliability).toBeLessThanOrEqual(60);
      expect(rows[w]!.participation - rows[w - 1]!.participation).toBeLessThanOrEqual(100);
    }
    expect(rows[0]!.reliability).toBeLessThanOrEqual(60);
    expect(rows[0]!.participation).toBeLessThanOrEqual(100);
  }, 120_000);

  test("membre POPULAIRE (beaucoup de sollicitations reçues, peu de réponses) : la popularité ne dépend pas du volume", async () => {
    const u = await user("popular");
    const rows: Row[] = [];
    for (let w = 0; w < 6; w++) {
      // 300 sollicitations reçues par semaine : n'ont AUCUN effet sur la participation ni la fiabilité de ce membre
      if (w % 2 === 0) await rw("LETTER_REPLY", u, `lr-${w}`, at(w * 7 + 2), { partnerId: "x" });
      rows.push(await snapshot(u, w + 1, at(w * 7 + 6)));
    }
    report.push(table("Membre populaire (très sollicité, répond peu)", rows));
    expect(rows[5]!.participation).toBe(6); // 3 réponses × 2
    expect(rows[5]!.popularity).toBe(0); // axe indépendant, non alimenté par ces règles
  });

  test("membre PEU SOLLICITÉ : 4 interlocuteurs nouveaux, bonus de diversité chez ceux qui en ont besoin", async () => {
    const member = await user("quiet");
    const metrics = (age: number): DiversityMetrics => ({
      accountAgeDays: age, accountAgeHours: age * 24, distinctSendersReceived30d: age < 30 ? 0 : 40, exposures30d: 10, positiveSignals30d: 1,
      activeRecently: true, daysSinceReset: null, verified: true, profileComplete: true, banned: false,
    });
    const txt = [
      "Bonjour, j'ai beaucoup aimé ta présentation et ta passion pour le théâtre, tu joues depuis longtemps ?",
      "Merci, je joue depuis huit ans dans une troupe amateur, et toi tu as une passion particulière en ce moment ?",
      "Oui la cuisine japonaise, j'apprends à faire des ramen maison le dimanche, c'est plus compliqué que prévu.",
      "Ça me donne faim, tu pourrais me donner ta meilleure recette de bouillon pour que j'essaie aussi ?",
    ];
    const th = (a: string, b: string): ThreadMessage[] => [
      { fromId: a, text: txt[0]!, sentAt: at(0, 1) }, { fromId: b, text: txt[1]!, sentAt: at(0, 3) },
    ];
    const rows: Row[] = [];
    const eligible: string[] = [];
    for (let i = 0; i < 4; i++) eligible.push(await user(`quiet-new${i}`));
    const veteran = await user("quiet-vet");
    let granted = 0;
    for (let w = 0; w < 4; w++) {
      const p = eligible[w]!;
      const g = await runInTransaction((tx) => applyDiversityBonus(tx, member, { partnerId: p, stage: 1, thread: th(member, p), partner: metrics(5) }, { ...ACTIVE, now: at(w * 7 + 1) }));
      granted += g.granted;
      rows.push(await snapshot(member, w + 1, at(w * 7 + 6)));
    }
    const vet = await runInTransaction((tx) => applyDiversityBonus(tx, member, { partnerId: veteran, stage: 1, thread: th(member, veteran), partner: metrics(900) }, { ...ACTIVE, now: at(30) }));
    report.push(table("Membre peu sollicité (échanges réels avec des membres qui en ont besoin)", rows));
    report.push(`Interlocuteur non éligible (compte ancien, déjà très sollicité : 40 expéditeurs distincts) : bonus accordé = ${vet.granted} (${vet.reason}).\n`);
    expect(granted).toBe(20);
    expect(vet.granted).toBe(0);
  });

  test("membre ABUSIF : pénalités plafonnées, puis récupération quand la fenêtre de 60 jours glisse", async () => {
    const u = await user("abusive");
    const rows: Row[] = [];
    // semaines 1-4 : un abandon tous les deux jours, quatre familles ; semaines 5+ : comportement correct
    const families: PenaltyFamily[] = ["MATCH_BREAK_AFTER_QUESTIONS", "SALON_ABANDONED", "CORRESPONDENCE_ABANDONED", "BOTTLE_ABANDONED"];
    for (let w = 0; w < 14; w++) {
      if (w < 4) for (let k = 0; k < 4; k++) await inc(families[(w + k) % 4]!, u, `x-${w}-${k}`, at(w * 7 + k * 2));
      if (w >= 4) await rw("REFUGE_COMPLETED", u, `ok-${w}`, at(w * 7 + 2));
      rows.push(await snapshot(u, w + 1, at(w * 7 + 6)));
    }
    report.push(table("Membre abusif (16 abandons en 4 semaines, puis comportement correct)", rows));
    const min = Math.min(...rows.map((r) => r.reliability));
    expect(min).toBeGreaterThanOrEqual(-24);
    expect(rows[13]!.reliability).toBeGreaterThan(min);
    // la participation n'a pas été touchée par les pénalités (hors récompenses Refuge : 5 × 10 semaines)
    expect(rows[3]!.participation).toBe(0);
  });

  test("FERME DE COMPTES : échanges entre deux comptes complices et textes recopiés", async () => {
    const a = await user("farm-a");
    const b = await user("farm-b");
    const fp = textFingerprint("Salut, comment ça va aujourd'hui ? Moi ça va très bien, merci de demander, et toi donc ?");
    const outcomes: string[] = [];
    for (let d = 0; d < 21; d++) {
      const r = await rw("FIRST_LETTER", a, `fl-${d}`, at(d, 1), { fingerprint: fp });
      outcomes.push(r.reason);
      for (let i = 0; i < 10; i++) await rw("LETTER_REPLY", a, `fr-${d}-${i}`, at(d, 2), { partnerId: b });
    }
    const s = await prisma.reputationState.findUniqueOrThrow({ where: { userId: a } });
    const granted = outcomes.filter((o) => o === "GRANTED").length;
    // 3 réponses par semaine avec un même interlocuteur → 9 sur 3 semaines (18 points) ; un seul premier message recopié sur 30 jours
    report.push(
      `### Ferme de comptes (2 comptes complices, 21 jours, 10 tentatives de réponse par jour)\n\n` +
        `- Premier message identique répété : ${granted} accordé sur 21 tentatives.\n` +
        `- Réponses avec le même interlocuteur : points de fiabilité = ${s.reliability}, participation = ${s.participation} (plafond : 3 réponses/semaine/interlocuteur).\n`,
    );
    expect(granted).toBe(1);
    expect(s.reliability).toBe(3 * 3 * 2);
  });

  test("membre qui REVIENT après plus de trois mois : remise à zéro, réévaluation, puis niveau normal", async () => {
    const u = await user("return");
    for (let w = 0; w < 6; w++) {
      await rw("REFUGE_COMPLETED", u, `a-${w}`, at(w * 7 + 1));
      await rw("SALON_COMPLETED", u, `b-${w}`, at(w * 7 + 2));
    }
    const before = await snapshot(u, 6, at(41));
    const back = new Date(at(41).getTime() + 100 * DAY);
    const r = await registerParticipationActivity({ userId: u, at: back, thresholdMonths: 3, thresholdDays: null });
    const afterReset = await snapshot(u, 0, back);
    for (let i = 0; i < 5; i++) await rw("REFUGE_DAY_HONORED", u, `back-${i}`, new Date(back.getTime() + i * DAY));
    const later = await snapshot(u, 1, new Date(back.getTime() + 5 * DAY));
    report.push(
      table("Retour après plus de trois mois d'inactivité (semaine 6 → retour → 5 engagements)", [before, afterReset, later]),
    );
    expect(r.reset).toBe(true);
    expect(afterReset).toMatchObject({ reliability: 0, participation: 0, level: "Fiabilité à réévaluer" });
    expect(later.level).not.toBe("Fiabilité à réévaluer");
  });
});

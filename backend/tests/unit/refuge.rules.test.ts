import { describe, expect, it } from "vitest";
import {
  ABSENCE_SCORE_PENALTY, DAILY_ASSIDUITY_COINS, FINAL_BONUS_ASSIDUITY, FINAL_BONUS_PERFECT, LATE_VALIDATION_GRACE_MS, MAX_COINS_PER_ADVENTURE,
  capBonus, computeFinalSettlement, dayBit, evaluateDayV2, hasConsulted, isLateValidation, type DayFacts, type FinalDayRow,
} from "../../src/modules/refuge/refuge.rules";

const END = new Date("2026-11-27T12:00:00Z");
const at = (hoursBeforeEnd: number) => new Date(END.getTime() - hoursBeforeEnd * 3600000);
const facts = (over: Partial<DayFacts>): DayFacts => ({ choiceAt: null, guessAt: null, matches: null, consulted: false, windowEnd: END, ...over });

describe("Refuge v2 — jour (évaluation pure)", () => {
  it("les deux ont joué : 10 pièces chacun quel que soit le score, jamais de pénalité, mauvaise réponse comprise", () => {
    for (const [m, status] of [[0, "FAILED"], [1, "PARTIAL"], [2, "PERFECT"]] as const) {
      const e = evaluateDayV2(facts({ choiceAt: at(20), guessAt: at(10), matches: m }));
      expect(e.status).toBe(status);
      expect(e.companion).toEqual({ assiduous: true, coins: 10, points: 0 });
      expect(e.sponsor).toEqual({ assiduous: true, coins: 10, points: 0 });
      expect(e.payAtClosure).toEqual({ companion: 0, sponsor: 0 });
    }
  });
  it("actions disponibles ≥ 6 h et pas de réponse : −5 points, 0 pièce, même si le Refuge a été consulté", () => {
    for (const consulted of [false, true]) {
      const e = evaluateDayV2(facts({ choiceAt: at(6), consulted })); // exactement 6 h : pénalisable
      expect(e.sponsor).toEqual({ assiduous: false, coins: 0, points: -5 });
      expect(e.companion.coins).toBe(10);
      expect(e.payAtClosure.sponsor).toBe(0);
    }
  });
  it("validation tardive (< 6 h) : consultation → +10 et assiduité, sans pénalité ; sinon ni gain ni pénalité", () => {
    const consulted = evaluateDayV2(facts({ choiceAt: at(5.99), consulted: true }));
    expect(consulted.sponsor).toEqual({ assiduous: true, coins: 10, points: 0 });
    expect(consulted.payAtClosure.sponsor).toBe(10);
    const none = evaluateDayV2(facts({ choiceAt: at(1) }));
    expect(none.sponsor).toEqual({ assiduous: false, coins: 0, points: 0 });
    expect(none.payAtClosure.sponsor).toBe(0);
  });
  it("compagnon absent : parrain/marraine consultant → +10 et assiduité ; compagnon −5 points", () => {
    const e = evaluateDayV2(facts({ consulted: true }));
    expect(e.status).toBe("INCOMPLETE_ADOPTE_MISSING");
    expect(e.companion).toEqual({ assiduous: false, coins: 0, points: -5 });
    expect(e.sponsor).toEqual({ assiduous: true, coins: 10, points: 0 });
    expect(e.payAtClosure).toEqual({ companion: 0, sponsor: 10 });
  });
  it("personne : −5 points chacun, aucune pièce", () => {
    const e = evaluateDayV2(facts({}));
    expect(e.status).toBe("NOT_PLAYED");
    expect(e.companion).toEqual({ assiduous: false, coins: 0, points: -5 });
    expect(e.sponsor).toEqual({ assiduous: false, coins: 0, points: -5 });
  });
  it("jamais de pénalité en pièces : aucun montant négatif dans aucun cas", () => {
    for (const choiceAt of [null, at(20), at(3)]) for (const guessAt of [null, at(2)]) for (const consulted of [false, true]) {
      if (!choiceAt && guessAt) continue;
      const e = evaluateDayV2(facts({ choiceAt, guessAt, matches: 1, consulted }));
      expect(e.companion.coins).toBeGreaterThanOrEqual(0);
      expect(e.sponsor.coins).toBeGreaterThanOrEqual(0);
      expect(e.companion.points === 0 || e.companion.points === -ABSENCE_SCORE_PENALTY).toBe(true);
    }
  });
  it("constantes et seuil de grâce", () => {
    expect([DAILY_ASSIDUITY_COINS, ABSENCE_SCORE_PENALTY, FINAL_BONUS_ASSIDUITY, FINAL_BONUS_PERFECT, MAX_COINS_PER_ADVENTURE]).toEqual([10, 5, 50, 100, 170]);
    expect(LATE_VALIDATION_GRACE_MS).toBe(6 * 3600000);
    expect(isLateValidation(at(6), END)).toBe(false);
    expect(isLateValidation(new Date(END.getTime() - LATE_VALIDATION_GRACE_MS + 1), END)).toBe(true);
  });
  it("bits de consultation par jour", () => {
    expect([1, 2, 3, 7].map(dayBit)).toEqual([1, 2, 4, 64]);
    expect(dayBit(0)).toBe(0);
    expect(dayBit(8)).toBe(0);
    expect(hasConsulted(0b101, 1)).toBe(true);
    expect(hasConsulted(0b101, 2)).toBe(false);
    expect(hasConsulted(0b101, 9)).toBe(false);
  });
});

const row = (d: number, over: Partial<FinalDayRow> = {}): FinalDayRow => ({ dayNumber: d, status: "PERFECT", matchCount: 2, adopteAssiduous: true, adoptantAssiduous: true, adopteScoreDelta: 0, adoptantScoreDelta: 0, ...over });
const week = (f: (d: number) => Partial<FinalDayRow> = () => ({})) => Array.from({ length: 7 }, (_, i) => row(i + 1, f(i + 1)));

describe("Refuge v2 — règlement final (pur)", () => {
  it("14/14 : 100 chacun, maximum 170 par personne", () => {
    const f = computeFinalSettlement(week());
    expect(f).toMatchObject({ perfectCourse: true, correctActions: 14, perfectDays: 7, companionBonus: 100, sponsorBonus: 100, companionDays: 7, sponsorDays: 7 });
    expect(f.companionDailyCoins + f.companionBonus).toBe(170);
  });
  it("7/7 d'assiduité sans 14/14 : 50 (non cumulable avec 100)", () => {
    const f = computeFinalSettlement(week((d) => (d === 4 ? { status: "PARTIAL", matchCount: 1 } : {})));
    expect(f.perfectCourse).toBe(false);
    expect([f.companionBonus, f.sponsorBonus]).toEqual([50, 50]);
    expect(f.correctActions).toBe(13);
  });
  it("assiduité individuelle incomplète : aucun bonus pour cette personne seulement", () => {
    const f = computeFinalSettlement(week((d) => (d === 2 ? { status: "INCOMPLETE_ADOPTE_MISSING", matchCount: null, adopteAssiduous: false, adopteScoreDelta: -5 } : {})));
    expect(f.companionBonus).toBe(0);
    expect(f.sponsorBonus).toBe(50);
    expect(f.companionDays).toBe(6);
    expect(f.companionPoints).toBe(-5);
  });
  it("sept jours d'absence : −35 points, aucun bonus", () => {
    const f = computeFinalSettlement(week(() => ({ status: "NOT_PLAYED", matchCount: null, adopteAssiduous: false, adoptantAssiduous: false, adopteScoreDelta: -5, adoptantScoreDelta: -5 })));
    expect([f.companionPoints, f.sponsorPoints, f.companionBonus, f.sponsorBonus]).toEqual([-35, -35, 0, 0]);
  });
  it("jours manquants : traités comme absents, jamais d'erreur", () => {
    const f = computeFinalSettlement([row(1)]);
    expect(f.companionDays).toBe(1);
    expect(f.companionBonus).toBe(0);
  });
  it("plafond de sécurité à 170 pièces", () => {
    expect(capBonus(70, 100)).toBe(100);
    expect(capBonus(70, 200)).toBe(100);
    expect(capBonus(170, 50)).toBe(0);
  });
});

import { buildFinalReport } from "../../src/modules/refuge/refuge.rules";
const SYMBOLS = { PERFECT: "❤️", PARTIAL: "♡", FAILED: "❌", OPEN: "🤍", NOT_PLAYED: "—", INCOMPLETE_ADOPTE_MISSING: "⚠️", INCOMPLETE_ADOPTANT_MISSING: "⚠️" };
describe("Refuge v2 — bilan final vu par un participant", () => {
  it("parcours parfait : sept cœurs, 14/14, 170 pièces, aucune pénalité, mêmes chiffres pour les deux", () => {
    const rows = week();
    for (const role of ["adopte", "adoptant"] as const) {
      const r = buildFinalReport(rows, role, 100, SYMBOLS);
      expect(r.days.map((d) => d.symbol)).toEqual(Array(7).fill("❤️"));
      expect(r).toMatchObject({ participationDays: 7, perfectDays: 7, correctActions: 14, perfectCourse: true, dailyCoins: 70, finalBonus: 100, bonusTier: "perfect", totalCoins: 170, penaltyPoints: 0 });
    }
  });
  it("chaque participant voit SES pièces, SON assiduité et SES points", () => {
    const rows = week((d) => (d === 3 ? { status: "INCOMPLETE_ADOPTE_MISSING", matchCount: null, adopteAssiduous: false, adopteScoreDelta: -5 } : {}));
    const comp = buildFinalReport(rows, "adopte", 0, SYMBOLS);
    const spon = buildFinalReport(rows, "adoptant", 50, SYMBOLS);
    expect(comp.days[2]).toMatchObject({ assiduous: false, coins: 0, points: -5, symbol: "⚠️", matches: null });
    expect(spon.days[2]).toMatchObject({ assiduous: true, coins: 10, points: 0 });
    expect([comp.participationDays, comp.totalCoins, comp.penaltyPoints, comp.bonusTier]).toEqual([6, 60, -5, null]);
    expect([spon.participationDays, spon.totalCoins, spon.penaltyPoints, spon.bonusTier]).toEqual([7, 120, 0, "assiduity"]);
  });
  it("jours absents des données : traités comme ouverts, jamais d'erreur ; aucune identité dans le bilan", () => {
    const r = buildFinalReport([row(1)], "adopte", 0, SYMBOLS);
    expect(r.days).toHaveLength(7);
    expect(r.days[6]).toMatchObject({ status: "OPEN", symbol: "🤍", assiduous: false, coins: 0 });
    expect(JSON.stringify(r)).not.toMatch(/pseudo|userId|email/i);
  });
});

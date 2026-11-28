import { describe, expect, it } from "vitest";
import {
  DEFAULT_RULES_MODE,
  FREE_INCIDENTS,
  INACTIVITY_CALENDAR_MONTHS,
  LEVEL_LABELS,
  PENALTY_CAP_PER_FAMILY,
  PENALTY_CAP_TOTAL,
  PENALTY_FAMILIES,
  PENALTY_RATIO_THRESHOLD,
  PENALTY_VALUES,
  PENALTY_WINDOW_DAYS,
  REAL_ACTIVITY_RULE_KEYS,
  REWARD_KEYS,
  REWARD_RULES,
  RULESET_VERSION,
  WEEKLY_AXIS_GAIN_CAP,
  addCalendarMonthsUTC,
  computeReliabilityLevel,
  decidePenalty,
  incidentExclusion,
  isCalendarInactivityResetDue,
  isRealActivityRule,
  isSubstantiveText,
  kindFor,
  normalizeText,
  parseInactivityMonths,
  rewardEffects,
  startOfUtcWeek,
  textFingerprint,
  wilsonLowerBound,
  type RewardKey,
} from "../../src/policies/reputationRules";

/** Barème proposé : la table ci-dessous est la transcription EXACTE de la demande (fiabilité, participation). */
const SPEC: Array<[RewardKey, number, number]> = [
  ["RECIPROCAL_SMILE", 0, 1],
  ["QUESTIONS_COMPLETED", 0, 2],
  ["CORRESPONDENCE_ENGAGED", 5, 2],
  ["FIRST_LETTER", 0, 2],
  ["LETTER_REPLY", 2, 2],
  ["CORRESPONDENCE_SUSTAINED", 5, 3],
  ["BOTTLE_REPLY", 0, 2],
  ["BOTTLE_SUSTAINED", 5, 3],
  ["SALON_ACTIVE_DAY", 0, 2],
  ["SALON_COMPLETED", 10, 5],
  ["REFUGE_DAY_HONORED", 2, 2],
  ["REFUGE_COMPLETED", 10, 5],
  ["DUEL_COMPLETED", 3, 2],
  ["ELECTION_VOTE", 0, 1],
  ["JOURNAL_PARTICIPATION", 0, 2],
];

describe("barème proposé (versionné, centralisé, NON actif)", () => {
  it("reproduit exactement les valeurs demandées", () => {
    expect(REWARD_KEYS).toHaveLength(SPEC.length);
    for (const [key, rel, part] of SPEC) {
      expect([key, REWARD_RULES[key].reliability, REWARD_RULES[key].participation]).toEqual([key, rel, part]);
    }
  });

  it("est versionné et désactivé par défaut", () => {
    expect(RULESET_VERSION).toBe(2);
    expect(DEFAULT_RULES_MODE).toBe("off");
  });

  it("chaque action correspond à une fonctionnalité EXISTANTE, sauf le journal (aucune action de membre)", () => {
    for (const key of REWARD_KEYS) {
      const r = REWARD_RULES[key];
      expect(r.feature.length, key).toBeGreaterThan(3);
      expect(r.objective.length, key).toBeGreaterThan(20);
      expect(r.available, key).toBe(key !== "JOURNAL_PARTICIPATION");
    }
    expect(REWARD_RULES.JOURNAL_PARTICIPATION.feature).toMatch(/AUCUNE/);
  });

  it("chaque règle est plafonnée (jamais de gain illimité) et les plafonds sont positifs", () => {
    for (const key of REWARD_KEYS) {
      const caps = REWARD_RULES[key].caps;
      expect(Object.keys(caps).length, key).toBeGreaterThan(0);
      for (const v of Object.values(caps)) expect(v, key).toBeGreaterThan(0);
    }
  });

  it("aucune différence Gratuit / Plus : le barème ne contient et ne reçoit aucune notion d'abonnement", () => {
    expect(JSON.stringify(REWARD_RULES)).not.toMatch(/premium|abonn|\bPlus\b/); // (« plus » en minuscule est le mot français)
    // Les votes d'élection ont le même plafond pour tous, même si la limite de votes de Plus est plus haute.
    expect(REWARD_RULES.ELECTION_VOTE.caps.perDay).toBe(5);
  });

  it("types d'événements : un type par (règle, axe), uniques, valides, et effets uniquement positifs", () => {
    const kinds = new Set<string>();
    for (const key of REWARD_KEYS) {
      for (const e of rewardEffects(REWARD_RULES[key])) {
        const k = kindFor(key, e.axis);
        expect(k).toMatch(/^[A-Z][A-Z0-9_]{2,63}$/);
        expect(kinds.has(k)).toBe(false);
        kinds.add(k);
        expect(e.delta).toBeGreaterThan(0);
      }
    }
    expect(kindFor("LETTER_REPLY", "RELIABILITY")).not.toBe(kindFor("LETTER_REPLY", "PARTICIPATION"));
  });

  it("aucune récompense cumulative disproportionnée : le gain hebdomadaire maximal d'une règle reste sous le plafond de l'axe", () => {
    for (const key of REWARD_KEYS) {
      const r = REWARD_RULES[key];
      if (!r.available || !r.caps.perWeek) continue;
      expect(r.reliability * r.caps.perWeek, key).toBeLessThanOrEqual(WEEKLY_AXIS_GAIN_CAP.RELIABILITY);
      expect(r.participation * r.caps.perWeek, key).toBeLessThanOrEqual(WEEKLY_AXIS_GAIN_CAP.PARTICIPATION);
    }
  });

  it("on récompense bien plus qu'on ne pénalise : le plafond de pénalités (60 jours) est inférieur au gain hebdomadaire permis", () => {
    expect(PENALTY_CAP_TOTAL).toBeLessThan(WEEKLY_AXIS_GAIN_CAP.RELIABILITY);
    expect(PENALTY_CAP_PER_FAMILY).toBeLessThanOrEqual(PENALTY_CAP_TOTAL);
    // et la plus lourde pénalité unitaire est inférieure à une seule récompense de session terminée + un jour de refuge
    expect(Math.max(...Object.values(PENALTY_VALUES))).toBeLessThanOrEqual(REWARD_RULES.SALON_COMPLETED.reliability);
  });
});

describe("pénalités exceptionnelles", () => {
  it("valeurs demandées et fenêtre glissante de 60 jours, deux incidents tolérés", () => {
    expect(PENALTY_VALUES).toEqual({
      MATCH_BREAK_AFTER_QUESTIONS: 8,
      SALON_ABANDONED: 4,
      CORRESPONDENCE_ABANDONED: 3,
      BOTTLE_ABANDONED: 3,
      REFUGE_NEGLECTED: 3,
      DUEL_ABANDONED: 2,
    });
    expect(PENALTY_FAMILIES).toHaveLength(6);
    expect(PENALTY_WINDOW_DAYS).toBe(60);
    expect(FREE_INCIDENTS).toBe(2);
  });

  const ctx = (over: Partial<Parameters<typeof decidePenalty>[0]> = {}) => ({
    family: "MATCH_BREAK_AFTER_QUESTIONS" as const,
    incidentsInWindow: 3,
    respectedInWindow: 0,
    penaltyFamilySoFar: 0,
    penaltyTotalSoFar: 0,
    ...over,
  });

  it("les deux premiers incidents ne coûtent rien ; le troisième, répétitif, est pénalisé", () => {
    expect(decidePenalty(ctx({ incidentsInWindow: 1 }))).toMatchObject({ penalize: false, delta: 0, reason: "TOLERATED_INCIDENT" });
    expect(decidePenalty(ctx({ incidentsInWindow: 2 }))).toMatchObject({ penalize: false, delta: 0 });
    expect(decidePenalty(ctx({ incidentsInWindow: 3 }))).toMatchObject({ penalize: true, delta: -8, reason: "REPEATED_BREACH" });
  });

  it("30 engagements respectés et 3 difficultés ≠ 3 engagements abandonnés sur 3", () => {
    const veteran = decidePenalty(ctx({ incidentsInWindow: 3, respectedInWindow: 30 }));
    expect(veteran.penalize).toBe(false);
    expect(veteran.reason).toBe("ISOLATED_AMONG_RESPECTED_COMMITMENTS");
    expect(veteran.ratio).toBeCloseTo(3 / 33, 5);
    expect(decidePenalty(ctx({ incidentsInWindow: 3, respectedInWindow: 3 })).penalize).toBe(true);
  });

  it("seuil de proportion exact : 3 incidents / 7 respectés = 30 % pénalise, 3 / 8 non", () => {
    expect(PENALTY_RATIO_THRESHOLD).toBe(0.3);
    expect(decidePenalty(ctx({ incidentsInWindow: 3, respectedInWindow: 7 })).penalize).toBe(true);
    expect(decidePenalty(ctx({ incidentsInWindow: 3, respectedInWindow: 8 })).penalize).toBe(false);
  });

  it("plafonds : par famille et au total, avec montant réduit au lieu d'un dépassement", () => {
    expect(decidePenalty(ctx({ penaltyFamilySoFar: 8 })).delta).toBe(-4); // reste 4 sur 12
    expect(decidePenalty(ctx({ penaltyFamilySoFar: 12 }))).toMatchObject({ penalize: false, reason: "PENALTY_CAP_REACHED" });
    expect(decidePenalty(ctx({ family: "SALON_ABANDONED", penaltyTotalSoFar: 22 })).delta).toBe(-2);
    expect(decidePenalty(ctx({ penaltyTotalSoFar: 24 })).penalize).toBe(false);
  });

  it("chaque famille applique sa propre valeur", () => {
    for (const family of PENALTY_FAMILIES) {
      expect(decidePenalty(ctx({ family })).delta).toBe(-PENALTY_VALUES[family]);
    }
  });

  it("n'est JAMAIS retenu comme incident : refus, incompatibilité, blocage, signalement, vacances, sécurité, antériorité, doute", () => {
    const cases: Array<[Parameters<typeof incidentExclusion>[1], string]> = [
      [{ refusal: true }, "REFUSAL"],
      [{ incompatibility: true }, "INCOMPATIBILITY"],
      [{ blocked: true }, "BLOCKED"],
      [{ reportOnly: true }, "REPORT_ONLY"],
      [{ vacation: true }, "VACATION_PROTECTED"],
      [{ safety: true }, "SAFETY"],
      [{ beforeEffectiveDate: true }, "BEFORE_EFFECTIVE_DATE"],
    ];
    for (const [ex, reason] of cases) expect(incidentExclusion("CLEAR_BREACH", ex)).toBe(reason);
    expect(incidentExclusion("UNKNOWN")).toBe("INDISTINGUISHABLE_FROM_LEGITIMATE");
    expect(incidentExclusion("LEGITIMATE")).toBe("LEGITIMATE");
    expect(incidentExclusion("CLEAR_BREACH")).toBeNull();
    // la sécurité l'emporte sur tout le reste, l'antériorité d'abord
    expect(incidentExclusion("CLEAR_BREACH", { safety: true, vacation: true })).toBe("SAFETY");
    expect(incidentExclusion("CLEAR_BREACH", { beforeEffectiveDate: true, safety: true })).toBe("BEFORE_EFFECTIVE_DATE");
  });
});

describe("niveaux de fiabilité", () => {
  const lvl = (respected: number, incidents: number, over: Partial<Parameters<typeof computeReliabilityLevel>[0]> = {}) =>
    computeReliabilityLevel({ respected, incidents, reliabilityPoints: 100, recentPenalty: 0, reassessment: false, ...over });

  it("libellés demandés", () => {
    expect(Object.values(LEVEL_LABELS).sort()).toEqual(
      ["Exemplaire", "Très fiable", "Fiable", "Fiabilité fragile", "Peu fiable", "Nouveau membre", "Fiabilité à réévaluer"].sort(),
    );
  });

  it("peu d'observations : « nouveau membre », ou « à réévaluer » après une remise à zéro (jamais « peu fiable »)", () => {
    expect(lvl(0, 0)).toBe("NEW_MEMBER");
    expect(lvl(2, 2)).toBe("NEW_MEMBER");
    expect(lvl(0, 4, { reassessment: true })).toBe("REASSESSMENT");
    expect(lvl(4, 0, { reassessment: true })).toBe("REASSESSMENT");
    expect(lvl(5, 0, { reassessment: true })).not.toBe("REASSESSMENT");
  });

  it("un membre discret mais respectueux peut être exemplaire (aucune dépendance à la quantité de messages)", () => {
    expect(lvl(15, 0, { reliabilityPoints: 60 })).toBe("EXEMPLARY");
    expect(lvl(10, 0, { reliabilityPoints: 50 })).toBe("VERY_RELIABLE");
    expect(lvl(5, 0, { reliabilityPoints: 25 })).toBe("RELIABLE");
  });

  it("le volume compte : même proportion, plus d'observations → borne plus haute", () => {
    expect(wilsonLowerBound(5, 5)).toBeLessThan(wilsonLowerBound(10, 10));
    expect(wilsonLowerBound(10, 10)).toBeLessThan(wilsonLowerBound(30, 30));
    expect(wilsonLowerBound(0, 0)).toBe(0);
    expect(wilsonLowerBound(9, 10)).toBeLessThan(wilsonLowerBound(90, 100));
  });

  it("30 engagements respectés et 3 difficultés : très fiable ; 3 abandons sur 3 : jamais « exemplaire »", () => {
    expect(lvl(30, 3)).toBe("VERY_RELIABLE");
    expect(lvl(0, 3)).toBe("NEW_MEMBER"); // trois abandons sur trois engagements : pas assez d'observations pour conclure
    expect(lvl(3, 3)).toBe("FRAGILE"); // 50 % sur 6 observations : fragile, jamais « peu fiable » sans répétition documentée
    expect(["FRAGILE", "RELIABLE"]).toContain(lvl(5, 3));
  });

  it("une pénalité récente empêche « exemplaire » ; un cumul négatif empêche les niveaux supérieurs", () => {
    expect(lvl(20, 0, { recentPenalty: 3 })).toBe("VERY_RELIABLE");
    expect(lvl(12, 0, { reliabilityPoints: -4 })).toBe("FRAGILE");
  });

  it("« peu fiable » exige une répétition (≥ 4 incidents) ET une pénalité appliquée, jamais le seul score", () => {
    expect(lvl(1, 7, { recentPenalty: 8, reliabilityPoints: -10 })).toBe("UNRELIABLE");
    expect(lvl(1, 7, { recentPenalty: 0, reliabilityPoints: -10 })).toBe("FRAGILE");
    expect(lvl(1, 3, { recentPenalty: 8, reliabilityPoints: -10 })).not.toBe("UNRELIABLE");
  });
});

describe("activité réelle et trois mois calendaires (non activé)", () => {
  it("la connexion et la consultation ne comptent pas ; seules les actions du barème disponibles comptent", () => {
    expect(isRealActivityRule("LETTER_REPLY")).toBe(true);
    expect(isRealActivityRule("ELECTION_VOTE")).toBe(true);
    expect(isRealActivityRule("LOGIN")).toBe(false);
    expect(isRealActivityRule("CONSULT_PROFILE")).toBe(false);
    expect(isRealActivityRule("JOURNAL_PARTICIPATION")).toBe(false); // règle indisponible
    expect(REAL_ACTIVITY_RULE_KEYS).not.toContain("JOURNAL_PARTICIPATION");
    expect(REAL_ACTIVITY_RULE_KEYS.length).toBe(REWARD_KEYS.length - 1);
  });

  it("mois calendaires UTC : fin de mois ramenée au dernier jour, années bissextiles, heure conservée", () => {
    const iso = (d: Date) => d.toISOString();
    expect(iso(addCalendarMonthsUTC(new Date("2026-08-31T10:30:00Z"), 3))).toBe("2026-11-30T10:30:00.000Z");
    expect(iso(addCalendarMonthsUTC(new Date("2026-11-30T00:00:00Z"), 3))).toBe("2027-02-28T00:00:00.000Z");
    expect(iso(addCalendarMonthsUTC(new Date("2027-11-30T00:00:00Z"), 3))).toBe("2028-02-29T00:00:00.000Z");
    expect(iso(addCalendarMonthsUTC(new Date("2026-12-15T08:00:00Z"), 3))).toBe("2027-03-15T08:00:00.000Z");
    expect(INACTIVITY_CALENDAR_MONTHS).toBe(3);
  });

  it("trois mois calendaires ≠ 90 jours : mai → août = 92 jours", () => {
    const last = new Date("2026-05-15T12:00:00Z");
    const state = { lastActivityAt: last, lastResetAt: null };
    const at = (iso: string) => new Date(iso);
    expect(isCalendarInactivityResetDue(state, at("2026-08-14T12:00:00Z"), 3)).toBe(false); // 91 jours : pas encore
    expect(isCalendarInactivityResetDue(state, at("2026-08-15T11:59:59Z"), 3)).toBe(false);
    expect(isCalendarInactivityResetDue(state, at("2026-08-15T12:00:00Z"), 3)).toBe(true);
  });

  it("mêmes garanties qu'en jours : désactivée sans seuil, jamais déduite d'une activité inconnue, une seule fois par période", () => {
    const now = new Date("2027-06-01T00:00:00Z");
    expect(isCalendarInactivityResetDue({ lastActivityAt: new Date("2020-01-01T00:00:00Z"), lastResetAt: null }, now, null)).toBe(false);
    expect(isCalendarInactivityResetDue({ lastActivityAt: null, lastResetAt: null }, now, 3)).toBe(false);
    const act = new Date("2026-12-01T00:00:00Z");
    expect(isCalendarInactivityResetDue({ lastActivityAt: act, lastResetAt: null }, now, 3)).toBe(true);
    expect(isCalendarInactivityResetDue({ lastActivityAt: act, lastResetAt: now }, now, 3)).toBe(false);
  });

  it("lecture du seuil configuré", () => {
    expect(parseInactivityMonths(undefined)).toBeNull();
    expect(parseInactivityMonths("")).toBeNull();
    expect(parseInactivityMonths(0)).toBeNull();
    expect(parseInactivityMonths(37)).toBeNull();
    expect(parseInactivityMonths("3")).toBe(3);
  });
});

describe("messages artificiels", () => {
  it("un message substantiel est assez long, varié et composé de vrais mots", () => {
    expect(isSubstantiveText("ok")).toBe(false);
    expect(isSubstantiveText("a".repeat(80))).toBe(false);
    expect(isSubstantiveText("ok ok ok ok ok ok ok ok ok ok ok ok ok ok")).toBe(false);
    expect(isSubstantiveText("salut salut salut salut salut salut salut salut")).toBe(false);
    expect(isSubstantiveText("Bonjour, j'ai beaucoup aimé ton histoire de voyage en Bretagne, raconte-m'en plus !")).toBe(true);
  });

  it("l'empreinte ignore casse, accents et ponctuation, et distingue deux textes différents", () => {
    expect(normalizeText("Éléphant, ÇA va ?!")).toBe("elephant ca va");
    expect(textFingerprint("Bonjour, ça va très bien !")).toBe(textFingerprint("bonjour ca va tres bien"));
    expect(textFingerprint("Bonjour, ça va très bien !")).not.toBe(textFingerprint("Bonsoir, ça va très mal !"));
  });

  it("semaines et jours en UTC : la semaine commence le lundi", () => {
    expect(startOfUtcWeek(new Date("2026-12-02T15:00:00Z")).toISOString()).toBe("2026-11-30T00:00:00.000Z");
    expect(startOfUtcWeek(new Date("2026-11-30T00:00:00Z")).toISOString()).toBe("2026-11-30T00:00:00.000Z");
    expect(startOfUtcWeek(new Date("2026-12-06T23:59:59Z")).toISOString()).toBe("2026-11-30T00:00:00.000Z");
  });
});

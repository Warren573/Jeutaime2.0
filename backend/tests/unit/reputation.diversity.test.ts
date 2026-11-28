import { describe, expect, it } from "vitest";
import {
  DEFAULT_DISCOVERY_PARAMS,
  DISCOVERY_SUGGESTIONS,
  DIVERSITY,
  decideDiversityBonus,
  diversityReasons,
  isDiversityTarget,
  isGenuineContinuation,
  isGenuineFirstExchange,
  pickDiscoverySuggestion,
  rankProfilesForDiscovery,
  seededUnit,
  smoothedAppreciation,
  substantiveMessages,
  type DiscoveryCandidate,
  type DiversityMetrics,
  type ThreadMessage,
} from "../../src/policies/reputationDiversity";

const established = (over: Partial<DiversityMetrics> = {}): DiversityMetrics => ({
  accountAgeDays: 400, distinctSendersReceived30d: 25, exposures30d: 200, positiveSignals30d: 40, activeRecently: true,
  daysSinceReset: null, verified: true, profileComplete: true, banned: false, accountAgeHours: 400 * 24, ...over,
});

const t = (h: number, d = 1) => new Date(Date.UTC(2026, 11, d, h, 0, 0));
const msg = (fromId: string, text: string, at: Date): ThreadMessage => ({ fromId, text, sentAt: at });
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

describe("règle de diversité : valeurs demandées", () => {
  it("+5 / +5, maximum 10 par binôme, 30 par semaine (à valider)", () => {
    expect(DIVERSITY.FIRST_EXCHANGE_POINTS).toBe(5);
    expect(DIVERSITY.CONTINUED_POINTS).toBe(5);
    expect(DIVERSITY.PER_PAIR_CAP).toBe(10);
    expect(DIVERSITY.WEEKLY_CAP).toBe(30);
  });

  it("calcul du bonus : plafond par binôme et plafond hebdomadaire, jamais de dépassement", () => {
    expect(decideDiversityBonus({ stage: 1, pairSoFar: 0, weekSoFar: 0 })).toEqual({ points: 5, reason: "GRANTED" });
    expect(decideDiversityBonus({ stage: 2, pairSoFar: 5, weekSoFar: 5 })).toEqual({ points: 5, reason: "GRANTED" });
    expect(decideDiversityBonus({ stage: 2, pairSoFar: 10, weekSoFar: 10 })).toEqual({ points: 0, reason: "PAIR_CAP" });
    expect(decideDiversityBonus({ stage: 2, pairSoFar: 8, weekSoFar: 8 }).points).toBe(2);
    expect(decideDiversityBonus({ stage: 1, pairSoFar: 0, weekSoFar: 28 }).points).toBe(2);
    expect(decideDiversityBonus({ stage: 1, pairSoFar: 0, weekSoFar: 30 })).toEqual({ points: 0, reason: "WEEKLY_CAP" });
  });
});

describe("qui est une cible de diversité (calcul INTERNE, jamais exposé)", () => {
  it("détecte nouveaux membres, peu sollicités, actifs rarement sélectionnés, membres de retour", () => {
    expect(diversityReasons(established({ accountAgeDays: 5, accountAgeHours: 120 }))).toContain("NEW_MEMBER");
    expect(diversityReasons(established({ distinctSendersReceived30d: 1 }))).toContain("LOW_RECEIVED");
    expect(diversityReasons(established({ exposures30d: 100, positiveSignals30d: 2 }))).toContain("RARELY_SELECTED");
    expect(diversityReasons(established({ daysSinceReset: 10 }))).toContain("RETURNING");
  });

  it("un membre établi, sollicité et apprécié n'est pas une cible", () => {
    expect(isDiversityTarget(established())).toBe(false);
  });

  it("jamais une cible : compte non vérifié, profil incomplet, banni, compte créé il y a moins de 24 h", () => {
    const fresh = { accountAgeDays: 0, distinctSendersReceived30d: 0 };
    expect(isDiversityTarget(established({ ...fresh, accountAgeHours: 30 }))).toBe(true);
    expect(isDiversityTarget(established({ ...fresh, accountAgeHours: 3 }))).toBe(false);
    expect(isDiversityTarget(established({ ...fresh, accountAgeHours: 30, verified: false }))).toBe(false);
    expect(isDiversityTarget(established({ ...fresh, accountAgeHours: 30, profileComplete: false }))).toBe(false);
    expect(isDiversityTarget(established({ ...fresh, accountAgeHours: 30, banned: true }))).toBe(false);
  });

  it("un membre peu présenté n'est pas considéré comme peu apprécié (lissage)", () => {
    const prior = smoothedAppreciation(0, 0);
    expect(prior).toBeCloseTo(0.1, 5);
    // 0 signal sur 1 exposition reste proche de la moyenne ; 0 sur 200 est réellement bas.
    expect(smoothedAppreciation(0, 1)).toBeGreaterThan(0.09);
    expect(smoothedAppreciation(0, 200)).toBeLessThan(0.02);
    expect(smoothedAppreciation(0, 1)).toBeGreaterThan(smoothedAppreciation(0, 200) * 4);
    // pas de peu d'expositions + peu de signaux ≠ « rarement sélectionné »
    expect(diversityReasons(established({ exposures30d: 3, positiveSignals30d: 0 }))).not.toContain("RARELY_SELECTED");
  });
});

describe("échange réciproque véritable", () => {
  it("un message sans réponse, un simple sourire ou une invitation ne suffisent pas", () => {
    expect(isGenuineFirstExchange([], A, B)).toBe(false);
    expect(isGenuineFirstExchange([msg(A, TXT[0]!, t(10))], A, B)).toBe(false);
    expect(isGenuineFirstExchange([msg(A, TXT[0]!, t(10)), msg(A, TXT[2]!, t(11))], A, B)).toBe(false);
  });

  it("deux messages substantiels de membres différents, espacés, suffisent", () => {
    expect(isGenuineFirstExchange([msg(A, TXT[0]!, t(10)), msg(B, TXT[1]!, t(12))], A, B)).toBe(true);
    expect(isGenuineFirstExchange([msg(B, TXT[1]!, t(12)), msg(A, TXT[0]!, t(10))], A, B)).toBe(true); // ordre d'arrivée sans importance
  });

  it("messages artificiels ignorés : trop courts, répétitifs, copiés-collés, réponse instantanée", () => {
    expect(isGenuineFirstExchange([msg(A, TXT[0]!, t(10)), msg(B, "ok", t(12))], A, B)).toBe(false);
    expect(isGenuineFirstExchange([msg(A, TXT[0]!, t(10)), msg(B, "merci merci merci merci merci merci merci merci merci", t(12))], A, B)).toBe(false);
    expect(isGenuineFirstExchange([msg(A, TXT[0]!, t(10)), msg(B, TXT[0]!.toUpperCase(), t(12))], A, B)).toBe(false); // même texte recopié
    const quick = [msg(A, TXT[0]!, new Date(Date.UTC(2026, 11, 1, 10, 0, 0))), msg(B, TXT[1]!, new Date(Date.UTC(2026, 11, 1, 10, 0, 40)))];
    expect(isGenuineFirstExchange(quick, A, B)).toBe(false);
    expect(substantiveMessages([msg(A, TXT[0]!, t(10)), msg(A, TXT[0]!, t(11))])).toHaveLength(1);
  });

  it("l'échange se poursuit réellement : 3 messages de chaque côté, sur au moins 2 jours", () => {
    const two = [msg(A, TXT[0]!, t(10)), msg(B, TXT[1]!, t(12))];
    expect(isGenuineContinuation(two, A, B)).toBe(false);
    const sameDay = [
      msg(A, TXT[0]!, t(8)), msg(B, TXT[1]!, t(9)), msg(A, TXT[2]!, t(10)), msg(B, TXT[3]!, t(11)), msg(A, TXT[4]!, t(12)), msg(B, TXT[5]!, t(13)),
    ];
    expect(isGenuineContinuation(sameDay, A, B)).toBe(false); // un seul jour
    const spread = [
      msg(A, TXT[0]!, t(8, 1)), msg(B, TXT[1]!, t(9, 1)), msg(A, TXT[2]!, t(10, 2)), msg(B, TXT[3]!, t(11, 2)), msg(A, TXT[4]!, t(12, 3)), msg(B, TXT[5]!, t(13, 3)),
    ];
    expect(isGenuineContinuation(spread, A, B)).toBe(true);
    expect(isGenuineFirstExchange(spread, A, A)).toBe(false); // jamais avec soi-même
  });
});

describe("répartition de la visibilité (sélection des profils)", () => {
  const cand = (id: string, over: Partial<DiscoveryCandidate> = {}): DiscoveryCandidate => ({
    id, level: "RELIABLE", participationRecent: 40, exposures30d: 300, accountAgeDays: 300, daysSinceReset: null, distinctSendersReceived30d: 20, ...over,
  });

  it("ne fait que RÉ-ORDONNER : permutation exacte de l'ensemble déjà filtré (aucun ajout, aucun retrait)", () => {
    for (let n = 0; n < 40; n++) {
      const set = Array.from({ length: 5 + (n % 30) }, (_, i) =>
        cand(`c${n}-${i}`, { exposures30d: (i * 37) % 400, accountAgeDays: (i * 13) % 500, level: (["EXEMPLARY", "RELIABLE", "FRAGILE", "NEW_MEMBER", "UNRELIABLE"] as const)[i % 5] }),
      );
      const out = rankProfilesForDiscovery(set, "viewer", "2026-12-01");
      expect([...out].sort()).toEqual(set.map((c) => c.id).sort());
    }
    expect(rankProfilesForDiscovery([], "v", "d")).toEqual([]);
  });

  it("est déterministe pour un même spectateur et un même jour (pagination stable) et varie d'un jour à l'autre", () => {
    const set = Array.from({ length: 30 }, (_, i) => cand(`p${i}`, { exposures30d: i * 10 }));
    const a = rankProfilesForDiscovery(set, "v1", "2026-12-01");
    expect(rankProfilesForDiscovery(set, "v1", "2026-12-01")).toEqual(a);
    expect(rankProfilesForDiscovery(set, "v1", "2026-12-02")).not.toEqual(a);
    expect(rankProfilesForDiscovery(set, "v2", "2026-12-01")).not.toEqual(a);
  });

  it("une position sur quatre est réservée aux profils peu exposés (nouveaux, peu sollicités, de retour…)", () => {
    const veterans = Array.from({ length: 20 }, (_, i) => cand(`vet${i}`, { level: "EXEMPLARY", exposures30d: 500 + i, participationRecent: 90 }));
    const fresh = Array.from({ length: 20 }, (_, i) => cand(`new${i}`, { level: "NEW_MEMBER", exposures30d: i, accountAgeDays: 3 + i, distinctSendersReceived30d: 0 }));
    const out = rankProfilesForDiscovery([...veterans, ...fresh], "viewer", "2026-12-01");
    for (const pos of [4, 8, 12, 16, 20]) expect(out[pos - 1]!.startsWith("new"), `position ${pos}`).toBe(true);
    // les positions hors voie de répartition suivent la fiabilité : les 3 premières sont des profils très fiables
    expect(out.slice(0, 3).every((id) => id.startsWith("vet"))).toBe(true);
    expect(DEFAULT_DISCOVERY_PARAMS.fairnessEvery).toBe(4);
  });

  it("le niveau pèse sans écraser : « nouveau membre » et « à réévaluer » ne partent pas désavantagés ; « peu fiable » passe après", () => {
    const set = [
      ...Array.from({ length: 10 }, (_, i) => cand(`n${i}`, { level: "NEW_MEMBER", exposures30d: 300 })),
      ...Array.from({ length: 10 }, (_, i) => cand(`r${i}`, { level: "RELIABLE", exposures30d: 300 })),
      ...Array.from({ length: 5 }, (_, i) => cand(`u${i}`, { level: "UNRELIABLE", exposures30d: 300 })),
    ];
    const out = rankProfilesForDiscovery(set, "viewer", "2026-12-01", { fairnessEvery: 1000 });
    const top = out.slice(0, 10);
    expect(top.filter((id) => id.startsWith("n")).length).toBeGreaterThanOrEqual(3);
    expect(top.filter((id) => id.startsWith("r")).length).toBeGreaterThanOrEqual(3);
    expect(out.slice(-5).every((id) => id.startsWith("u"))).toBe(true);
  });

  it("aucune donnée d'abonnement n'entre dans le calcul (la structure des candidats n'en contient pas)", () => {
    const sample = JSON.stringify(cand("x"));
    expect(sample).not.toMatch(/premium|abonn|coins|pièces|\bPlus\b/i);
  });

  it("le hachage déterministe est uniforme sur [0,1)", () => {
    const vals = Array.from({ length: 2000 }, (_, i) => seededUnit(`k${i}`));
    expect(Math.min(...vals)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...vals)).toBeLessThan(1);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    expect(mean).toBeGreaterThan(0.45);
    expect(mean).toBeLessThan(0.55);
  });
});

describe("suggestions discrètes (aucune interface ici)", () => {
  it("trois textes généraux, sans stigmatisation, sans nom, sans badge ni pop-up", () => {
    expect(DISCOVERY_SUGGESTIONS).toEqual([
      "Diversifier tes échanges te rapporte des points de participation.",
      "Fais connaissance avec de nouveaux membres.",
      "Pense aussi aux profils que tu n'as pas encore découverts.",
    ]);
    for (const s of DISCOVERY_SUGGESTIONS) expect(s).not.toMatch(/peu populaire|manque|badge|pop-?up|culpab|obligat|dernier|solitaire|ignor/i);
  });

  it("occasionnelles : au plus une par semaine, et seulement certains jours", () => {
    const base = new Date("2026-12-01T09:00:00Z");
    expect(pickDiscoverySuggestion({ viewerId: "v", now: base, lastShownAt: new Date(base.getTime() - 3 * 86_400_000) })).toBeNull();
    let shown = 0;
    for (let d = 0; d < 300; d++) {
      const now = new Date(base.getTime() + d * 86_400_000);
      const s = pickDiscoverySuggestion({ viewerId: "v", now, lastShownAt: null });
      if (s) { shown++; expect(DISCOVERY_SUGGESTIONS).toContain(s); }
    }
    expect(shown).toBeGreaterThan(60);
    expect(shown).toBeLessThan(140);
    // déterministe
    expect(pickDiscoverySuggestion({ viewerId: "v", now: base, lastShownAt: null })).toBe(pickDiscoverySuggestion({ viewerId: "v", now: base, lastShownAt: null }));
  });
});

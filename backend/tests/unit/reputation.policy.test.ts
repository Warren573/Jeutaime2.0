import { describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import { BadRequestError, ForbiddenError } from "../../src/core/errors";
import {
  AXES,
  AXIS_FIELD,
  MAX_ABS_DELTA,
  assertCanAdjustReputation,
  buildDedupeKey,
  getKindDefinition,
  isInactivityResetDue,
  normalizeReason,
  parseInactivityThresholdDays,
  parseLocalDay,
  registerReputationKind,
  validateEventInput,
  type EventInput,
} from "../../src/policies/reputation";

/**
 * Règles PURES du moteur de confiance. Aucune base, aucune horloge implicite.
 * Aucun barème n'est testé ici : le barème n'existe pas encore (hors périmètre de cette PR).
 */
const base = (over: Partial<EventInput> = {}): EventInput => ({
  userId: "u1",
  axis: "RELIABILITY",
  kind: "ADMIN_ADJUST",
  delta: 1,
  dedupeKey: "k1",
  actorId: "admin-1",
  ...over,
});

describe("séparation des axes", () => {
  it("expose exactement trois axes, chacun sur sa propre colonne, et aucun axe « pièces »", () => {
    expect([...AXES]).toEqual(["RELIABILITY", "PARTICIPATION", "POPULARITY"]);
    expect(new Set(Object.values(AXIS_FIELD)).size).toBe(3);
    expect(Object.values(AXIS_FIELD)).not.toContain("coins");
  });

  it("un type fonctionnel n'appartient qu'à UN axe : un autre axe est refusé", () => {
    registerReputationKind("UNIT_RELIABLE_THING", { axis: "RELIABILITY", delta: "ANY" });
    expect(() => validateEventInput(base({ kind: "UNIT_RELIABLE_THING", axis: "PARTICIPATION", actorId: null }))).toThrow(BadRequestError);
    expect(() => validateEventInput(base({ kind: "UNIT_RELIABLE_THING", axis: "POPULARITY", actorId: null }))).toThrow(BadRequestError);
    expect(() => validateEventInput(base({ kind: "UNIT_RELIABLE_THING", axis: "RELIABILITY", actorId: null }))).not.toThrow();
  });

  it("un type fonctionnel ne peut être ni « ANY », ni réservé, ni redéfini différemment", () => {
    expect(() => registerReputationKind("UNIT_BAD_ANY", { axis: "ANY", delta: "ANY" })).toThrow();
    expect(() => registerReputationKind("UNIT_BAD_RESERVED", { axis: "RELIABILITY", delta: "ANY", reserved: true })).toThrow();
    expect(() => registerReputationKind("lowercase", { axis: "RELIABILITY", delta: "ANY" })).toThrow();
    registerReputationKind("UNIT_ONCE", { axis: "POPULARITY", delta: "NON_NEGATIVE" });
    expect(() => registerReputationKind("UNIT_ONCE", { axis: "POPULARITY", delta: "NON_NEGATIVE" })).not.toThrow(); // idempotent
    expect(() => registerReputationKind("UNIT_ONCE", { axis: "RELIABILITY", delta: "NON_NEGATIVE" })).toThrow();
  });
});

describe("validation d'un événement", () => {
  it("refuse type inconnu, type réservé, delta non entier ou hors borne, clé vide, membre absent", () => {
    expect(() => validateEventInput(base({ kind: "NOPE_UNKNOWN" }))).toThrow(BadRequestError);
    expect(() => validateEventInput(base({ kind: "REVERSAL" }))).toThrow(BadRequestError);
    expect(() => validateEventInput(base({ kind: "INACTIVITY_RESET", delta: 0 }))).toThrow(BadRequestError);
    expect(() => validateEventInput(base({ delta: 1.5 }))).toThrow(BadRequestError);
    expect(() => validateEventInput(base({ delta: Number.NaN }))).toThrow(BadRequestError);
    expect(() => validateEventInput(base({ delta: MAX_ABS_DELTA + 1 }))).toThrow(BadRequestError);
    expect(() => validateEventInput(base({ delta: -MAX_ABS_DELTA - 1 }))).toThrow(BadRequestError);
    expect(() => validateEventInput(base({ dedupeKey: "   " }))).toThrow(BadRequestError);
    expect(() => validateEventInput(base({ dedupeKey: "x".repeat(241) }))).toThrow(BadRequestError);
    expect(() => validateEventInput(base({ userId: "" }))).toThrow(BadRequestError);
    expect(() => validateEventInput(base({ delta: MAX_ABS_DELTA }))).not.toThrow();
  });

  it("un ajustement manuel exige un administrateur à l'origine", () => {
    expect(() => validateEventInput(base({ actorId: null }))).toThrow(BadRequestError);
  });

  it("respecte le signe imposé par le type", () => {
    registerReputationKind("UNIT_NEG_ONLY", { axis: "RELIABILITY", delta: "NON_POSITIVE" });
    registerReputationKind("UNIT_POS_ONLY", { axis: "PARTICIPATION", delta: "NON_NEGATIVE" });
    expect(() => validateEventInput(base({ kind: "UNIT_NEG_ONLY", delta: 3, actorId: null }))).toThrow(BadRequestError);
    expect(() => validateEventInput(base({ kind: "UNIT_NEG_ONLY", delta: -3, actorId: null }))).not.toThrow();
    expect(() => validateEventInput(base({ kind: "UNIT_POS_ONLY", axis: "PARTICIPATION", delta: -1, actorId: null }))).toThrow(BadRequestError);
  });

  it("les types système existent et sont réservés au moteur quand c'est le cas", () => {
    expect(getKindDefinition("ADMIN_ADJUST")?.requiresActor).toBe(true);
    expect(getKindDefinition("REVERSAL")?.reserved).toBe(true);
    expect(getKindDefinition("INACTIVITY_RESET")?.delta).toBe("ZERO");
  });

  it("la clé d'idempotence identifie le FAIT et le membre, jamais la requête", () => {
    expect(buildDedupeKey("K", "Match", "m1", "u1")).toBe("K:Match:m1:u1");
    expect(buildDedupeKey("K", "Match", "m1", "u1")).toBe(buildDedupeKey("K", "Match", "m1", "u1"));
    expect(buildDedupeKey("K", "Match", "m1", "u2")).not.toBe(buildDedupeKey("K", "Match", "m1", "u1"));
  });
});

describe("droits d'ajustement", () => {
  it("ADMIN et OWNER seulement ; MODERATOR et USER refusés", () => {
    expect(() => assertCanAdjustReputation(Role.ADMIN)).not.toThrow();
    expect(() => assertCanAdjustReputation(Role.OWNER)).not.toThrow();
    expect(() => assertCanAdjustReputation(Role.MODERATOR)).toThrow(ForbiddenError);
    expect(() => assertCanAdjustReputation(Role.USER)).toThrow(ForbiddenError);
    expect(() => assertCanAdjustReputation("autre")).toThrow(ForbiddenError);
  });
  it("motif obligatoire (3 à 2000 caractères)", () => {
    expect(normalizeReason("  ok motif  ")).toBe("ok motif");
    expect(() => normalizeReason("ab")).toThrow(BadRequestError);
    expect(() => normalizeReason("x".repeat(2001))).toThrow(BadRequestError);
  });
});

describe("inactivité : seuil et échéance", () => {
  const now = new Date("2026-12-01T12:00:00Z");
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

  it("sans seuil configuré (état par défaut) : désactivée", () => {
    expect(parseInactivityThresholdDays(undefined)).toBeNull();
    expect(parseInactivityThresholdDays(null)).toBeNull();
    expect(parseInactivityThresholdDays("")).toBeNull();
    expect(parseInactivityThresholdDays(0)).toBeNull();
    expect(parseInactivityThresholdDays(-5)).toBeNull();
    expect(parseInactivityThresholdDays(1.5)).toBeNull();
    expect(parseInactivityThresholdDays(99999)).toBeNull();
    expect(parseInactivityThresholdDays("90")).toBe(90);
    expect(isInactivityResetDue({ lastActivityAt: daysAgo(10_000), lastResetAt: null }, now, null)).toBe(false);
  });

  it("jamais due si la dernière activité est INCONNUE (aucune déduction rétroactive)", () => {
    expect(isInactivityResetDue({ lastActivityAt: null, lastResetAt: null }, now, 90)).toBe(false);
  });

  it("due exactement au seuil, pas avant (89 / 90 / 91 jours, en UTC)", () => {
    expect(isInactivityResetDue({ lastActivityAt: daysAgo(89), lastResetAt: null }, now, 90)).toBe(false);
    expect(isInactivityResetDue({ lastActivityAt: daysAgo(90), lastResetAt: null }, now, 90)).toBe(true);
    expect(isInactivityResetDue({ lastActivityAt: daysAgo(91), lastResetAt: null }, now, 90)).toBe(true);
  });

  it("idempotente : plus due une fois la remise à zéro faite, jusqu'à une nouvelle activité", () => {
    const act = daysAgo(120);
    expect(isInactivityResetDue({ lastActivityAt: act, lastResetAt: null }, now, 90)).toBe(true);
    expect(isInactivityResetDue({ lastActivityAt: act, lastResetAt: now }, now, 90)).toBe(false);
    // nouvelle activité puis nouvelle absence : à nouveau possible
    const later = new Date(now.getTime() + 200 * 86_400_000);
    const act2 = new Date(now.getTime() + 10 * 86_400_000);
    expect(isInactivityResetDue({ lastActivityAt: act2, lastResetAt: now }, later, 90)).toBe(true);
  });

  it("le mode vacances n'est pas un paramètre : la règle l'ignore", () => {
    // La signature n'accepte aucune information de vacances : une remise à zéro est due même en vacances.
    expect(isInactivityResetDue.length).toBe(3);
  });
});

describe("accueil quotidien : date locale", () => {
  const now = new Date("2026-12-01T23:30:00Z");
  it("accepte la date locale du membre (tous fuseaux, tolérance d'un jour)", () => {
    expect(parseLocalDay("2026-12-01", now)).toBe("2026-12-01");
    expect(parseLocalDay("2026-12-02", now)).toBe("2026-12-02"); // Nouvelle-Zélande, déjà lendemain
    expect(parseLocalDay("2026-11-30", now)).toBe("2026-11-30");
  });
  it("refuse format, date impossible ou incohérente", () => {
    for (const bad of ["", "2026-1-1", "2026/12/01", "2026-13-01", "2026-02-30", "abc", "2027-12-01", "2026-11-20"]) {
      expect(() => parseLocalDay(bad, now), bad).toThrow(BadRequestError);
    }
  });
});

import { describe, it, expect } from "vitest";
import { TWO_FACTOR_GRACE_DAYS, evaluateTwoFactor } from "../../src/policies/twoFactorEnforcement";

const DAY = 24 * 60 * 60 * 1000;
const START = new Date("2026-12-01T00:00:00.000Z");
const at = (days: number) => new Date(START.getTime() + days * DAY);
const evalFor = (over: Partial<Parameters<typeof evaluateTwoFactor>[0]> & { now: Date }) =>
  evaluateTwoFactor({
    role: "ADMIN",
    twoFactorEnabledAt: null,
    privilegedRoleSince: null,
    enforcementStart: START,
    ...over,
  });

describe("double authentification obligatoire — règle pure", () => {
  it("le délai de transition est de 14 jours", () => {
    expect(TWO_FACTOR_GRACE_DAYS).toBe(14);
  });

  it.each(["USER", "MODERATOR"])("%s : jamais obligatoire, quelles que soient les dates", (role) => {
    for (const now of [at(-10), at(0), at(14), at(400)]) {
      expect(evalFor({ role, now })).toMatchObject({ state: "not_required", mandatory: false, roleRequiresTwoFactor: false });
    }
  });

  it.each(["ADMIN", "OWNER"])("%s : sans date d'activation, rien n'est bloqué", (role) => {
    const r = evaluateTwoFactor({
      role,
      twoFactorEnabledAt: null,
      privilegedRoleSince: null,
      enforcementStart: undefined,
      now: at(900),
    });
    expect(r).toMatchObject({ state: "not_active", mandatory: false, deadline: null });
  });

  it.each(["ADMIN", "OWNER"])("%s existant : avant l'activation, pas encore obligatoire", (role) => {
    expect(evalFor({ role, now: new Date(START.getTime() - 1) })).toMatchObject({ state: "not_active", mandatory: false });
  });

  it.each(["ADMIN", "OWNER"])("%s existant : 14 jours à compter de l'activation, puis blocage", (role) => {
    expect(evalFor({ role, now: at(0) })).toMatchObject({ state: "grace", daysLeft: 14, mandatory: true });
    expect(evalFor({ role, now: at(7) })).toMatchObject({ state: "grace", daysLeft: 7 });
    expect(evalFor({ role, now: new Date(at(14).getTime() - 1) })).toMatchObject({ state: "grace", daysLeft: 1 });
    expect(evalFor({ role, now: at(14) })).toMatchObject({ state: "blocked", daysLeft: 0 });
    expect(evalFor({ role, now: at(60) })).toMatchObject({ state: "blocked" });
    expect(evalFor({ role, now: at(14) }).deadline).toEqual(at(14));
  });

  it("nouvel ADMIN promu après l'activation : aucun délai, bloqué tant qu'il n'a pas configuré", () => {
    const since = at(3);
    expect(evalFor({ privilegedRoleSince: since, now: since })).toMatchObject({ state: "blocked" });
    expect(evalFor({ privilegedRoleSince: since, now: at(4) })).toMatchObject({ state: "blocked" });
  });

  it("ADMIN promu avant l'activation mais après la mise en place : bloqué dès l'activation, sans délai", () => {
    const since = at(-5);
    expect(evalFor({ privilegedRoleSince: since, now: at(-1) })).toMatchObject({ state: "not_active" });
    expect(evalFor({ privilegedRoleSince: since, now: at(0) })).toMatchObject({ state: "blocked" });
  });

  it("une double authentification active protège à tout moment et rend la désactivation interdite après l'activation", () => {
    const enabled = new Date("2026-11-20T00:00:00.000Z");
    expect(evalFor({ twoFactorEnabledAt: enabled, now: at(-3) })).toMatchObject({ state: "protected", mandatory: false });
    expect(evalFor({ twoFactorEnabledAt: enabled, now: at(30) })).toMatchObject({ state: "protected", mandatory: true });
    expect(evalFor({ role: "OWNER", twoFactorEnabledAt: enabled, now: at(30) })).toMatchObject({ state: "protected" });
  });
});

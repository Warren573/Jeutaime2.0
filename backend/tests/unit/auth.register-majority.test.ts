import { describe, it, expect, afterEach, vi } from "vitest";
import { RegisterSchema } from "../../src/modules/auth/auth.schemas";

const base = { email: "probe@example.com", password: "Abcdefg1!", pseudo: "probe_user", gender: "HOMME", city: "Paris" };

function birthDateAccepted(now: string, birthDate: string): boolean {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(now));
  const result = RegisterSchema.safeParse({ ...base, birthDate });
  return result.success || !result.error.issues.some((i) => i.path.join(".") === "birthDate");
}

afterEach(() => vi.useRealTimers());

// Cas réels mesurés avec l'ancien calcul « (maintenant − naissance) / 365,25 ≥ 18 ».
describe("RegisterSchema.birthDate — 18 ans révolus au calendrier exact", () => {
  it("accepts a person whose 18th birthday is today (was refused)", () => {
    expect(birthDateAccepted("2026-11-27T00:00:00Z", "2008-11-27")).toBe(true);
    expect(birthDateAccepted("2026-11-27T23:59:00Z", "2008-11-27")).toBe(true);
  });

  it("refuses a person who turns 18 tomorrow", () => {
    expect(birthDateAccepted("2026-11-27T12:00:00Z", "2008-11-28")).toBe(false);
  });

  it.each([
    ["2028-02-29T12:00:00Z", "2010-03-01"],
    ["2028-03-01T12:00:00Z", "2010-03-02"],
  ])("refuses a minor one day before their 18th birthday across a leap day (now %s, born %s) — was accepted", (now, born) => {
    expect(birthDateAccepted(now, born)).toBe(false);
  });

  it("handles a 29 February birthday (18th birthday on 1 March)", () => {
    expect(birthDateAccepted("2026-02-28T12:00:00Z", "2008-02-29")).toBe(false);
    expect(birthDateAccepted("2026-03-01T12:00:00Z", "2008-02-29")).toBe(true);
  });

  it("still accepts an ordinary adult and refuses an ordinary minor", () => {
    expect(birthDateAccepted("2026-11-27T12:00:00Z", "1990-05-20")).toBe(true);
    expect(birthDateAccepted("2026-11-27T12:00:00Z", "2015-01-01")).toBe(false);
  });

  it("refuses an impossible date", () => {
    expect(birthDateAccepted("2026-11-27T12:00:00Z", "2000-13-45")).toBe(false);
  });
});

import { describe, it, expect, beforeEach, vi } from "vitest";
import { BadRequestError } from "../../src/core/errors";
import { isAtLeastYearsOld } from "../../src/core/utils/dateUtils";

vi.mock("../../src/config/prisma", () => ({
  prisma: {
    profile: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "../../src/config/prisma";
import { UpdateProfileSchema } from "../../src/modules/profiles/profiles.schemas";
import { updateMyProfile } from "../../src/modules/profiles/profiles.service";

/** Date AAAA-MM-JJ (UTC) située `years` ans et `dayOffset` jours avant aujourd'hui. */
function ymd(years: number, dayOffset = 0): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear() - years, now.getUTCMonth(), now.getUTCDate() + dayOffset));
  return d.toISOString().slice(0, 10);
}

describe("isAtLeastYearsOld", () => {
  const now = new Date("2026-11-27T12:00:00.000Z");

  it("accepts exactly 18 years (birthday today) and refuses the day before", () => {
    expect(isAtLeastYearsOld(new Date("2008-11-27T00:00:00.000Z"), 18, now)).toBe(true);
    expect(isAtLeastYearsOld(new Date("2008-11-28T00:00:00.000Z"), 18, now)).toBe(false);
  });

  it("handles a 29 February birthday (18th birthday falls on 1 March)", () => {
    expect(isAtLeastYearsOld(new Date("2008-02-29T00:00:00.000Z"), 18, new Date("2026-02-28T12:00:00Z"))).toBe(false);
    expect(isAtLeastYearsOld(new Date("2008-02-29T00:00:00.000Z"), 18, new Date("2026-03-01T12:00:00Z"))).toBe(true);
  });

  it("refuses invalid and future dates", () => {
    expect(isAtLeastYearsOld(new Date("nope"), 18, now)).toBe(false);
    expect(isAtLeastYearsOld(new Date("2999-01-01T00:00:00.000Z"), 18, now)).toBe(false);
  });
});

describe("UpdateProfileSchema.birthDate — majorité vérifiée à toute modification", () => {
  it.each([
    ["un enfant de 11 ans", ymd(11)],
    ["un mineur de 16 ans", ymd(16)],
    ["17 ans et 364 jours (18 ans demain)", ymd(18, 1)],
    ["une date dans le futur", "2999-01-01"],
    ["une date au format ISO complet d'un mineur", `${ymd(15)}T00:00:00.000Z`],
  ])("refuses %s", (_label, value) => {
    expect(UpdateProfileSchema.safeParse({ birthDate: value }).success).toBe(false);
  });

  it.each([
    ["null", null],
    ["0 (époque Unix)", 0],
    ["un nombre", 1_000_000_000_000],
    ["une chaîne vide", ""],
    ["du texte", "pas-une-date"],
    ["un mois impossible", "2000-13-45"],
  ])("refuses the bypass value %s", (_label, value) => {
    expect(UpdateProfileSchema.safeParse({ birthDate: value }).success).toBe(false);
  });

  it("accepts exactly 18 years (birthday today) and an adult", () => {
    expect(UpdateProfileSchema.safeParse({ birthDate: ymd(18) }).success).toBe(true);
    const adult = UpdateProfileSchema.safeParse({ birthDate: "1990-05-20" });
    expect(adult.success).toBe(true);
    expect(adult.success && adult.data.birthDate?.toISOString()).toBe("1990-05-20T00:00:00.000Z");
  });

  it("does not require birthDate: other profile edits stay possible", () => {
    expect(UpdateProfileSchema.safeParse({ bio: "Bonjour" }).success).toBe(true);
    expect(UpdateProfileSchema.safeParse({}).success).toBe(true);
  });
});

describe("updateMyProfile — seconde barrière côté service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.profile.findUnique as any).mockResolvedValue({ id: "profile-1" });
    (prisma.profile.update as any).mockResolvedValue({ id: "profile-1" });
  });

  it("refuses a minor birthDate and writes nothing", async () => {
    await expect(updateMyProfile("u1", { birthDate: new Date(`${ymd(16)}T00:00:00.000Z`) } as any)).rejects.toBeInstanceOf(BadRequestError);
    expect(prisma.profile.update).not.toHaveBeenCalled();
  });

  it("refuses an invalid Date and writes nothing", async () => {
    await expect(updateMyProfile("u1", { birthDate: new Date("nope") } as any)).rejects.toBeInstanceOf(BadRequestError);
    expect(prisma.profile.update).not.toHaveBeenCalled();
  });

  it("stores an adult birthDate", async () => {
    await updateMyProfile("u1", { birthDate: new Date("1990-05-20T00:00:00.000Z") } as any);
    const args = (prisma.profile.update as any).mock.calls[0][0];
    expect(args.data.birthDate).toEqual(new Date("1990-05-20T00:00:00.000Z"));
  });

  it("never touches birthDate when the edit does not contain one (existing dates are not rewritten)", async () => {
    await updateMyProfile("u1", { bio: "Salut" } as any);
    const args = (prisma.profile.update as any).mock.calls[0][0];
    expect(args.data).not.toHaveProperty("birthDate");
    expect(args.data.bio).toBe("Salut");
  });
});

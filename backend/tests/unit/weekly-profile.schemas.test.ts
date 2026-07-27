import { describe, it, expect } from "vitest";
import { VoteWeeklyProfileSchema } from "../../src/modules/weekly-profile/weekly-profile.schemas";

describe("VoteWeeklyProfileSchema", () => {
  const base = { duelId: "duel-1", chosenId: "user-a" };

  it("payload valide → OK", () => {
    const res = VoteWeeklyProfileSchema.parse(base);
    expect(res).toEqual(base);
  });

  it("duelId manquant → rejeté", () => {
    expect(() => VoteWeeklyProfileSchema.parse({ chosenId: "user-a" })).toThrow();
  });

  it("chosenId manquant → rejeté", () => {
    expect(() => VoteWeeklyProfileSchema.parse({ duelId: "duel-1" })).toThrow();
  });

  it("champ inconnu (ex. candidateAId falsifié côté client) → rejeté (schema strict)", () => {
    expect(() => VoteWeeklyProfileSchema.parse({ ...base, candidateAId: "fraude", candidateBId: "fraude2" })).toThrow();
  });

  it("id vide → rejeté", () => {
    expect(() => VoteWeeklyProfileSchema.parse({ ...base, chosenId: "" })).toThrow();
  });
});

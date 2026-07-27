import { describe, it, expect } from "vitest";
import { VoteWeeklyProfileSchema } from "../../src/modules/weekly-profile/weekly-profile.schemas";

describe("VoteWeeklyProfileSchema", () => {
  const base = { candidateAId: "user-a", candidateBId: "user-b", chosenId: "user-a" };

  it("duel valide → OK", () => {
    const res = VoteWeeklyProfileSchema.parse(base);
    expect(res).toEqual(base);
  });

  it("candidateAId manquant → rejeté", () => {
    expect(() => VoteWeeklyProfileSchema.parse({ candidateBId: "user-b", chosenId: "user-b" })).toThrow();
  });

  it("candidateBId manquant → rejeté", () => {
    expect(() => VoteWeeklyProfileSchema.parse({ candidateAId: "user-a", chosenId: "user-a" })).toThrow();
  });

  it("chosenId manquant → rejeté", () => {
    expect(() => VoteWeeklyProfileSchema.parse({ candidateAId: "user-a", candidateBId: "user-b" })).toThrow();
  });

  it("champ inconnu → rejeté (schema strict)", () => {
    expect(() => VoteWeeklyProfileSchema.parse({ ...base, extra: "nope" })).toThrow();
  });

  it("id vide → rejeté", () => {
    expect(() => VoteWeeklyProfileSchema.parse({ ...base, chosenId: "" })).toThrow();
  });
});

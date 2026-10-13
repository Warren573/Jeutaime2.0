import { describe, expect, it } from "vitest";
import { assertCanSendLetter } from "../../src/policies/letterAlternation";
import { getPhotoLevel } from "../../src/policies/photoUnlock";
import { SendLetterSchema } from "../../src/modules/letters/letters.schemas";
import { SubmitAnswersSchema } from "../../src/modules/matches/questions.schemas";

describe("P0 encounter rules — baseline regressions", () => {
  it("requires three answers for the questions game", () => {
    const answer = (i: number) => ({ profileQuestionId: "q" + i, answer: "option" });
    expect(SubmitAnswersSchema.safeParse({ answers: [answer(1), answer(2)] }).success).toBe(false);
    expect(SubmitAnswersSchema.safeParse({ answers: [answer(1), answer(2), answer(3)] }).success).toBe(true);
  });
  it("prevents sending two consecutive letters from the same participant", () => {
    expect(() => assertCanSendLetter({ lastLetterBy: "alice", senderId: "alice", initiatorId: "alice" })).toThrow();
    expect(() => assertCanSendLetter({ lastLetterBy: "alice", senderId: "bob", initiatorId: "alice" })).not.toThrow();
  });
  it("keeps photos locked until ten total letters for a free viewer", () => {
    expect(getPhotoLevel({ totalLetters: 9, viewerIsPremium: false })).toBe(0);
    expect(getPhotoLevel({ totalLetters: 10, viewerIsPremium: false })).toBe(3);
  });
  it("verifies the current server letter length contract", () => {
    expect(SendLetterSchema.safeParse({ content: "a".repeat(3000) }).success).toBe(true);
    expect(SendLetterSchema.safeParse({ content: "a".repeat(3001) }).success).toBe(false);
  });
});

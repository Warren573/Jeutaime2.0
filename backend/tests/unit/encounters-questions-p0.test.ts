import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  match: { findUnique: vi.fn(), update: vi.fn() },
  matchQuestionAttempt: { findMany: vi.fn(), createMany: vi.fn() },
  profile: { findUnique: vi.fn() },
  profileQuestion: { findMany: vi.fn() },
}));
vi.mock("../../src/config/prisma", () => ({ prisma: db }));
import { submitMatchAnswers } from "../../src/modules/matches/questions.service";

const answers = [1, 2, 3].map((n) => ({
  profileQuestionId: "question-" + n,
  answer: n === 1 ? "yes" : "no",
}));
beforeEach(() => {
  vi.clearAllMocks();
  db.match.findUnique.mockResolvedValue({
    id: "match-1", userAId: "alice", userBId: "bob",
    status: "ACTIVE", questionsValidated: false,
  });
  db.profile.findUnique.mockResolvedValue({ id: "bob-profile" });
  db.profileQuestion.findMany.mockResolvedValue(
    [1, 2, 3].map((n) => ({ id: "question-" + n, answer: "yes" })),
  );
  db.matchQuestionAttempt.createMany.mockResolvedValue({ count: 3 });
  db.match.update.mockResolvedValue({});
});
describe("P0 questions game resolution", () => {
  it("waits for the other participant after first submission", async () => {
    db.matchQuestionAttempt.findMany.mockResolvedValue([]);
    const result = await submitMatchAnswers("match-1", "alice", { answers });
    expect(result.waitingForOther).toBe(true);
    expect(result.questionsValidated).toBe(false);
    expect(db.match.update).not.toHaveBeenCalled();
  });
  it("validates if both participants score at least one correct answer", async () => {
    db.matchQuestionAttempt.findMany.mockImplementation(async ({ where }: any) =>
      where.responderId === "alice" ? [] : [
        { isCorrect: true }, { isCorrect: false }, { isCorrect: false },
      ]);
    const result = await submitMatchAnswers("match-1", "alice", { answers });
    expect(result.questionsValidated).toBe(true);
    expect(result.matchBroken).toBe(false);
    expect(db.match.update).toHaveBeenCalledWith({
      where: { id: "match-1" }, data: { questionsValidated: true },
    });
  });
  it("breaks the match when the other participant has zero correct answers", async () => {
    db.matchQuestionAttempt.findMany.mockImplementation(async ({ where }: any) =>
      where.responderId === "alice" ? [] : [
        { isCorrect: false }, { isCorrect: false }, { isCorrect: false },
      ]);
    const result = await submitMatchAnswers("match-1", "alice", { answers });
    expect(result.matchBroken).toBe(true);
    expect(result.questionsValidated).toBe(false);
    expect(db.match.update).toHaveBeenCalledWith({
      where: { id: "match-1" }, data: { status: "BROKEN" },
    });
  });
  it("rejects answers submitted by a third party", async () => {
    await expect(submitMatchAnswers("match-1", "intruder", { answers })).rejects.toThrow();
    expect(db.matchQuestionAttempt.createMany).not.toHaveBeenCalled();
  });
});

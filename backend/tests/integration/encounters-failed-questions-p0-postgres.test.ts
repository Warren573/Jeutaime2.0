import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "../../src/config/prisma";
import { submitMatchAnswers } from "../../src/modules/matches/questions.service";
import { sendLetter } from "../../src/modules/letters/letters.service";

const enabled = process.env.NODE_ENV === "test" &&
  !!process.env.TEST_DATABASE_URL &&
  process.env.DATABASE_URL === process.env.TEST_DATABASE_URL;

describe.skipIf(!enabled)("Questions failure on isolated PostgreSQL", () => {
  const suffix = randomUUID().replace(/-/g, "");
  const ids = ["a", "b"].map(x => "questions-fail-" + x + "-" + suffix);
  let matchId = "";
  afterAll(async () => {
    if (matchId) {
      await prisma.matchQuestionAttempt.deleteMany({ where: { matchId } });
      await prisma.match.deleteMany({ where: { id: matchId } });
    }
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it("breaks the match and forbids correspondence when one player scores zero", async () => {
    await prisma.user.createMany({ data: ids.map(id => ({
      id, email: id + "@example.invalid", passwordHash: "test",
    })) });
    const profiles = [];
    for (const id of ids) {
      const profile = await prisma.profile.create({ data: {
        userId: id, pseudo: id, birthDate: new Date("1990-01-01"),
        gender: "HOMME", interestedIn: [], city: "Paris",
        interests: [], lookingFor: [], identityTags: [], qualities: [], defaults: [],
      } });
      profiles.push(profile);
      await prisma.profileQuestion.createMany({ data: [1, 2, 3].map(n => ({
        profileId: profile.id, questionId: "q" + n,
        questionText: "Question " + n, answer: "oui", wrongAnswers: ["non", "jamais"],
      })) });
    }
    const match = await prisma.match.create({ data: {
      userAId: ids[0], userBId: ids[1], initiatorId: ids[0], status: "ACTIVE",
    } });
    matchId = match.id;
    const answer = async (profileId: string, correct: boolean) => ({
      answers: (await prisma.profileQuestion.findMany({ where: { profileId } }))
        .map((q, i) => ({ profileQuestionId: q.id, answer: correct && i === 0 ? "oui" : "non" })),
    });
    await submitMatchAnswers(matchId, ids[0], await answer(profiles[1].id, true));
    const result = await submitMatchAnswers(matchId, ids[1], await answer(profiles[0].id, false));
    expect(result.matchBroken).toBe(true);
    expect((await prisma.match.findUnique({ where: { id: matchId } }))?.status).toBe("BROKEN");
    await expect(sendLetter(matchId, ids[0], { content: "Bonjour" })).rejects.toThrow();
    expect(await prisma.letter.count({ where: { matchId } })).toBe(0);
  });
});

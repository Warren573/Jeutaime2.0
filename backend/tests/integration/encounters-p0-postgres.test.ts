import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "../../src/config/prisma";
import { sendLetter } from "../../src/modules/letters/letters.service";
import { submitMatchAnswers } from "../../src/modules/matches/questions.service";

const enabled = process.env.NODE_ENV === "test" &&
  !!process.env.TEST_DATABASE_URL &&
  process.env.DATABASE_URL === process.env.TEST_DATABASE_URL;

describe.skipIf(!enabled)("P0 encounters — isolated PostgreSQL", () => {
  const suffix = randomUUID().replace(/-/g, "");
  const a = "enc-a-" + suffix;
  const b = "enc-b-" + suffix;
  let matchId = "";
  afterAll(async () => {
    if (matchId) await prisma.match.deleteMany({ where: { id: matchId } });
    await prisma.user.deleteMany({ where: { id: { in: [a, b] } } });
    await prisma.$disconnect();
  });

  it("enforces questions before correspondence and alternates letters", async () => {
    await prisma.user.createMany({ data: [
      { id: a, email: a + "@example.invalid", passwordHash: "integration-test" },
      { id: b, email: b + "@example.invalid", passwordHash: "integration-test" },
    ] });
    const match = await prisma.match.create({
      data: { userAId: a, userBId: b, initiatorId: a, status: "ACTIVE" },
    });
    matchId = match.id;
    await expect(sendLetter(matchId, a, { content: "Bonjour" })).rejects.toThrow();
    expect(await prisma.letter.count({ where: { matchId } })).toBe(0);

    const qa = await prisma.profile.create({ data: {
      userId: a, pseudo: "enc-a-" + suffix, birthDate: new Date("1990-01-01"),
      gender: "HOMME", interestedIn: ["FEMME"], city: "Paris",
    } });
    const qb = await prisma.profile.create({ data: {
      userId: b, pseudo: "enc-b-" + suffix, birthDate: new Date("1990-01-01"),
      gender: "FEMME", interestedIn: ["HOMME"], city: "Paris",
    } });
    for (const [profileId, prefix] of [[qa.id, "qa"], [qb.id, "qb"]] as const) {
      await prisma.profileQuestion.createMany({ data: [1, 2, 3].map((n) => ({
        profileId, questionId: prefix + n, questionText: "Question " + n,
        answer: "oui", wrongAnswers: ["non", "jamais"],
      })) });
    }
    const toAnswers = async (profileId: string) => {
      const questions = await prisma.profileQuestion.findMany({ where: { profileId }, orderBy: { questionId: "asc" } });
      return { answers: questions.map((q, i) => ({ profileQuestionId: q.id, answer: i === 0 ? "oui" : "non" })) };
    };
    const first = await submitMatchAnswers(matchId, a, await toAnswers(qb.id));
    expect(first.waitingForOther).toBe(true);
    const second = await submitMatchAnswers(matchId, b, await toAnswers(qa.id));
    expect(second.questionsValidated).toBe(true);
    const letter1 = await sendLetter(matchId, a, { content: "Première lettre" });
    expect(letter1.fromUserId).toBe(a);
    await expect(sendLetter(matchId, a, { content: "Deuxième consécutive" })).rejects.toThrow();
    const letter2 = await sendLetter(matchId, b, { content: "Réponse" });
    expect(letter2.fromUserId).toBe(b);
    expect(await prisma.letter.count({ where: { matchId } })).toBe(2);
  });
});

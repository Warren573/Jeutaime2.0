import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "../../src/config/prisma";
import { sendLetter } from "../../src/modules/letters/letters.service";
import { submitMatchAnswers } from "../../src/modules/matches/questions.service";
import { sendReaction } from "../../src/modules/reactions/reactions.service";
import { acceptMatch } from "../../src/modules/matches/matches.service";

const enabled = process.env.NODE_ENV === "test" &&
  !!process.env.TEST_DATABASE_URL &&
  process.env.DATABASE_URL === process.env.TEST_DATABASE_URL;

describe.skipIf(!enabled)("P0 encounters — isolated PostgreSQL", () => {
  const suffix = randomUUID().replace(/-/g, "");
  const a = "enc-a-" + suffix;
  const b = "enc-b-" + suffix;
  let matchId = "";
  afterAll(async () => {
    if (matchId) {
      await prisma.letter.deleteMany({ where: { matchId } });
      await prisma.matchQuestionAttempt.deleteMany({ where: { matchId } });
      await prisma.match.deleteMany({ where: { id: matchId } });
    }
    await prisma.reaction.deleteMany({ where: { OR: [{ fromId: a }, { fromId: b }] } });
    await prisma.user.deleteMany({ where: { id: { in: [a, b] } } });
    await prisma.$disconnect();
  });


  it("creates a pending match only after mutual smiles on real PostgreSQL", async () => {
    const x = "smile-a-" + suffix;
    const y = "smile-b-" + suffix;
    await prisma.user.createMany({ data: [
      { id: x, email: x + "@example.invalid", passwordHash: "test" },
      { id: y, email: y + "@example.invalid", passwordHash: "test" },
    ] });
    try {
      const first = await sendReaction(x, { toId: y, type: "SMILE" });
      expect(first.matchCreated).toBe(false);
      const second = await sendReaction(y, { toId: x, type: "SMILE" });
      expect(second.matchCreated).toBe(true);
      const actual = await prisma.match.findUnique({ where: { id: second.matchId! } });
      expect(actual?.status).toBe("PENDING");
      expect(actual?.questionsValidated).toBe(false);
      await expect(acceptMatch(second.matchId!, y)).rejects.toThrow();
      const accepted = await acceptMatch(second.matchId!, x);
      expect(accepted.status).toBe("ACTIVE");
      expect(accepted.questionsValidated).toBe(false);
      await prisma.match.deleteMany({ where: { id: second.matchId } });
    } finally {
      await prisma.reaction.deleteMany({ where: { OR: [{ fromId: x }, { fromId: y }] } });
      await prisma.user.deleteMany({ where: { id: { in: [x, y] } } });
    }
  });
  it("enforces questions before correspondence and alternates letters", async () => {
    await prisma.user.createMany({ data: [
      { id: a, email: a + "@example.invalid", passwordHash: "integration-test" },
      { id: b, email: b + "@example.invalid", passwordHash: "integration-test" },
    ] });
    const firstSmile = await sendReaction(a, { toId: b, type: "SMILE" });
    expect(firstSmile.matchCreated).toBe(false);
    const secondSmile = await sendReaction(b, { toId: a, type: "SMILE" });
    expect(secondSmile.matchCreated).toBe(true);
    matchId = secondSmile.matchId!;
    const pending = await prisma.match.findUnique({ where: { id: matchId } });
    expect(pending?.status).toBe("PENDING");
    await acceptMatch(matchId, a);
    expect((await prisma.match.findUnique({ where: { id: matchId } }))?.status).toBe("ACTIVE");
    await expect(sendLetter(matchId, a, { content: "Bonjour" })).rejects.toThrow();
    expect(await prisma.letter.count({ where: { matchId } })).toBe(0);

    const qa = await prisma.profile.create({ data: {
      userId: a, pseudo: "enc-a-" + suffix, birthDate: new Date("1990-01-01"),
      gender: "HOMME", interestedIn: ["FEMME"], city: "Paris", interests: [], lookingFor: [], identityTags: [], qualities: [], defaults: [],
    } });
    const qb = await prisma.profile.create({ data: {
      userId: b, pseudo: "enc-b-" + suffix, birthDate: new Date("1990-01-01"),
      gender: "FEMME", interestedIn: ["HOMME"], city: "Paris", interests: [], lookingFor: [], identityTags: [], qualities: [], defaults: [],
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

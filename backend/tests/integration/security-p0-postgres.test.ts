import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "../../src/config/prisma";
import { listLetters, markLetterRead } from "../../src/modules/letters/letters.service";
import { listMine } from "../../src/modules/reports/reports.service";

const enabled = !!process.env.TEST_DATABASE_URL &&
  process.env.DATABASE_URL === process.env.TEST_DATABASE_URL &&
  process.env.NODE_ENV === "test";

describe.skipIf(!enabled)("P0 privacy with real PostgreSQL", () => {
  const suffix = randomUUID().replace(/-/g, "");
  const ids = [`p0a-${suffix}`, `p0b-${suffix}`, `p0c-${suffix}`].sort();
  let matchId: string;
  let letterId: string;
  beforeAll(async () => {
    for (const id of ids) {
      await prisma.user.create({ data: { id, email: `${id}@example.invalid`, passwordHash: "test-only" } });
    }
    const match = await prisma.match.create({
      data: { userAId: ids[0], userBId: ids[1], initiatorId: ids[0], status: "ACTIVE", questionsValidated: true },
    });
    matchId = match.id;
    const letter = await prisma.letter.create({
      data: { matchId, fromUserId: ids[0], toUserId: ids[1], content: "Private integration test" },
    });
    letterId = letter.id;
  });
  afterAll(async () => {
    if (letterId) await prisma.letter.deleteMany({ where: { id: letterId } });
    if (matchId) await prisma.match.deleteMany({ where: { id: matchId } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });
  it("participants can read letters, third parties cannot", async () => {
    const result = await listLetters(matchId, ids[0], { page: 1, pageSize: 20 } as any);
    expect(result.data.some(letter => letter.id === letterId)).toBe(true);
    await expect(listLetters(matchId, ids[2], { page: 1, pageSize: 20 } as any))
      .rejects.toThrow("Tu ne fais pas partie de ce match");
  });
  it("only letter recipient can mark it read", async () => {
    await expect(markLetterRead(letterId, ids[2])).rejects.toThrow("Seul le destinataire");
    await expect(markLetterRead(letterId, ids[0])).rejects.toThrow("Seul le destinataire");
    const result = await markLetterRead(letterId, ids[1]);
    expect(result.status).toBe("READ");
  });
  it("report list is restricted to requesting reporter", async () => {
    const result = await listMine(ids[2], { page: 1, pageSize: 20 } as any);
    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
  });
});

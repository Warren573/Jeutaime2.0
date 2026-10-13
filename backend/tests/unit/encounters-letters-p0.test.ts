import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(),
    match: { findUnique: vi.fn(), update: vi.fn() },
    block: { findFirst: vi.fn() },
    letter: { create: vi.fn() },
  };
  return { tx, $transaction: vi.fn() };
});
vi.mock("../../src/config/prisma", () => ({ prisma: db }));
vi.mock("../../src/events", () => ({ emitLetterSent: vi.fn() }));
import { sendLetter } from "../../src/modules/letters/letters.service";

const baseMatch = {
  id: "match-1", userAId: "alice", userBId: "bob", initiatorId: "alice",
  status: "ACTIVE", questionsValidated: true, lastLetterBy: null,
  lastLetterAt: null, letterCountA: 0, letterCountB: 0,
};
beforeEach(() => {
  vi.clearAllMocks();
  db.$transaction.mockImplementation((fn: any) => fn(db.tx));
  db.tx.match.findUnique.mockResolvedValue({ ...baseMatch });
  db.tx.block.findFirst.mockResolvedValue(null);
  db.tx.letter.create.mockResolvedValue({ id: "letter-1" });
  db.tx.match.update.mockResolvedValue({ letterCountA: 1, letterCountB: 0, lastLetterBy: "alice", lastLetterAt: new Date() });
});
describe("P0 letters behind questions gate", () => {
  it("allows first letter after questions are validated", async () => {
    await expect(sendLetter("match-1", "alice", { content: "Bonjour" })).resolves.toMatchObject({ id: "letter-1" });
    expect(db.tx.letter.create).toHaveBeenCalledOnce();
  });
  it("refuses sending before questions are validated", async () => {
    db.tx.match.findUnique.mockResolvedValue({ ...baseMatch, questionsValidated: false });
    await expect(sendLetter("match-1", "alice", { content: "Bonjour" })).rejects.toThrow();
    expect(db.tx.letter.create).not.toHaveBeenCalled();
  });
  it("refuses sending after a broken match", async () => {
    db.tx.match.findUnique.mockResolvedValue({ ...baseMatch, status: "BROKEN" });
    await expect(sendLetter("match-1", "alice", { content: "Bonjour" })).rejects.toThrow();
    expect(db.tx.letter.create).not.toHaveBeenCalled();
  });
  it("refuses consecutive letters by the same sender", async () => {
    db.tx.match.findUnique.mockResolvedValue({ ...baseMatch, lastLetterBy: "alice" });
    await expect(sendLetter("match-1", "alice", { content: "Encore moi" })).rejects.toThrow();
    expect(db.tx.letter.create).not.toHaveBeenCalled();
  });
  it("refuses letters from non-participants", async () => {
    await expect(sendLetter("match-1", "intruder", { content: "Salut" })).rejects.toThrow();
    expect(db.tx.letter.create).not.toHaveBeenCalled();
  });
});

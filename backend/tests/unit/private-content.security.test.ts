import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  match: { findUnique: vi.fn() },
  letter: { findUnique: vi.fn(), count: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  report: { findMany: vi.fn(), count: vi.fn() },
}));
vi.mock("../../src/config/prisma", () => ({ prisma: db }));
import { listLetters, markLetterRead } from "../../src/modules/letters/letters.service";
import { listMine } from "../../src/modules/reports/reports.service";

beforeEach(() => vi.clearAllMocks());

describe("private letter and report isolation", () => {
  it("forbids a third user reading a match's letters", async () => {
    db.match.findUnique.mockResolvedValue({ id: "match1", userAId: "alice", userBId: "bob" });
    await expect(listLetters("match1", "charlie", { page: 1, pageSize: 20 } as any))
      .rejects.toThrow("Tu ne fais pas partie de ce match");
    expect(db.letter.findMany).not.toHaveBeenCalled();
    expect(db.letter.count).not.toHaveBeenCalled();
  });

  it("forbids the sender or a third user marking another person's letter as read", async () => {
    db.letter.findUnique.mockResolvedValue({ id: "letter1", toUserId: "bob", status: "SENT", readAt: null });
    for (const outsider of ["alice", "charlie"]) {
      await expect(markLetterRead("letter1", outsider))
        .rejects.toThrow("Seul le destinataire");
    }
    expect(db.letter.update).not.toHaveBeenCalled();
  });

  it("scopes report queries to the requesting reporter", async () => {
    db.report.findMany.mockResolvedValue([]);
    db.report.count.mockResolvedValue(0);
    await listMine("alice", { page: 1, pageSize: 20 } as any);
    expect(db.report.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { reporterId: "alice" },
    }));
    expect(db.report.count).toHaveBeenCalledWith({ where: { reporterId: "alice" } });
  });
});

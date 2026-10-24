import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  block: { findFirst: vi.fn() },
  reaction: { upsert: vi.fn(), findFirst: vi.fn() },
  match: { findUnique: vi.fn(), count: vi.fn(), create: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("../../src/config/prisma", () => ({ prisma: db }));
vi.mock("../../src/modules/auth/accountLifecycle.service", () => ({
  isAccountDeactivated: vi.fn().mockResolvedValue(false),
}));
vi.mock("../../src/events", () => ({ emitMatchCreated: vi.fn() }));
import { sendReaction } from "../../src/modules/reactions/reactions.service";

beforeEach(() => {
  vi.clearAllMocks();
  db.user.findUnique.mockResolvedValue({ id: "bob", isBanned: false, premiumTier: "FREE", premiumUntil: null });
  db.block.findFirst.mockResolvedValue(null);
  db.reaction.upsert.mockResolvedValue({ id: "reaction-1", createdAt: new Date("2026-10-13T10:00:00Z") });
  db.match.findUnique.mockResolvedValue(null);
  db.match.count.mockResolvedValue(0);
  db.$transaction.mockImplementation(async (callback: any) => callback({ match: { create: db.match.create } }));
  db.match.create.mockResolvedValue({ id: "match-1" });
});
describe("P0 mutual smiles", () => {
  it("does not create a match after just one smile", async () => {
    db.reaction.findFirst.mockResolvedValue(null);
    const result = await sendReaction("alice", { toId: "bob", type: "SMILE" });
    expect(result.matchCreated).toBe(false);
    expect(db.match.create).not.toHaveBeenCalled();
  });
  it("creates a pending match after mutual smiles", async () => {
    db.reaction.findFirst.mockResolvedValue({ id: "reverse-smile" });
    const result = await sendReaction("alice", { toId: "bob", type: "SMILE" });
    expect(result.matchCreated).toBe(true);
    expect(db.match.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userAId: "alice", userBId: "bob", initiatorId: "alice", status: "PENDING",
      }),
    }));
  });
  it("does not create a match for a grimace", async () => {
    const result = await sendReaction("alice", { toId: "bob", type: "GRIMACE" });
    expect(result.matchCreated).toBe(false);
    expect(db.reaction.findFirst).not.toHaveBeenCalled();
  });
  it("rejects self-reactions", async () => {
    await expect(sendReaction("alice", { toId: "alice", type: "SMILE" })).rejects.toThrow();
    expect(db.reaction.upsert).not.toHaveBeenCalled();
  });
});

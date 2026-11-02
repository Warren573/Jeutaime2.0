import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../../src/config/prisma";
import { claimBottleWithReply, countUnreadMessages } from "../../src/modules/bottles/bottles.service";

vi.mock("../../src/config/prisma", () => ({
  prisma: {
    anonymousMessage: { findFirst: vi.fn(), create: vi.fn() },
    bottleReceipt: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn(), count: vi.fn() },
    messageInABottle: { findUnique: vi.fn(), updateMany: vi.fn(), count: vi.fn(), findMany: vi.fn() },
    user: { findUnique: vi.fn() },
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(prisma)),
  },
}));
vi.mock("../../src/policies/premium", () => ({ isPremiumActive: vi.fn(() => false) }));

const senderId = "user-a";
const accepterId = "user-b";
const bottleId = "bottle-1";
const key = "00000000-0000-4000-8000-000000000001";
const msg = { id: "reply-1", bottleId, senderId: accepterId, content: "Première réponse", idempotencyKey: key, createdAt: new Date() };

function available() {
  vi.mocked(prisma.anonymousMessage.findFirst).mockResolvedValue(null);
  vi.mocked(prisma.bottleReceipt.findUnique).mockResolvedValue({ status: "PENDING" } as any);
  vi.mocked(prisma.messageInABottle.findUnique).mockResolvedValue({
    id: bottleId, senderId, acceptedById: null, status: "FLOATING", expiresAt: new Date(Date.now() + 86400000),
  } as any);
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ premiumTier: "FREE", premiumUntil: null } as any);
  vi.mocked(prisma.messageInABottle.count).mockResolvedValue(0);
  vi.mocked(prisma.messageInABottle.updateMany).mockResolvedValue({ count: 1 });
  vi.mocked(prisma.anonymousMessage.create).mockResolvedValue(msg as any);
  vi.mocked(prisma.bottleReceipt.update).mockResolvedValue({} as any);
  vi.mocked(prisma.bottleReceipt.updateMany).mockResolvedValue({ count: 2 });
}

describe("Bottles: first reply claims, merely reading does not", () => {
  beforeEach(() => { vi.clearAllMocks(); available(); });

  it("claims only when a reply is persisted and marks all other receipts taken", async () => {
    const result = await claimBottleWithReply(bottleId, accepterId, "Première réponse", key);
    expect(result.idempotentReplay).toBe(false);
    expect(prisma.messageInABottle.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: bottleId, status: "FLOATING", acceptedById: null }),
      data: expect.objectContaining({ acceptedById: accepterId, status: "ACCEPTED" }),
    }));
    expect(prisma.anonymousMessage.create).toHaveBeenCalledTimes(1);
    expect(prisma.bottleReceipt.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "TAKEN" }),
    }));
  });

  it("rejects a concurrent reply when another user already claimed it", async () => {
    vi.mocked(prisma.messageInABottle.updateMany).mockResolvedValue({ count: 0 });
    await expect(claimBottleWithReply(bottleId, accepterId, "Trop tard", key)).rejects.toThrow();
    expect(prisma.anonymousMessage.create).not.toHaveBeenCalled();
  });

  it("replays the same idempotency key without claiming twice", async () => {
    vi.mocked(prisma.anonymousMessage.findFirst).mockResolvedValue(msg as any);
    const result = await claimBottleWithReply(bottleId, accepterId, "Première réponse", key);
    expect(result.idempotentReplay).toBe(true);
    expect(prisma.messageInABottle.updateMany).not.toHaveBeenCalled();
  });

  it("rejects expired bottles", async () => {
    vi.mocked(prisma.messageInABottle.findUnique).mockResolvedValue({ id: bottleId, senderId, status: "FLOATING", acceptedById: null, expiresAt: new Date(Date.now() - 60000) } as any);
    await expect(claimBottleWithReply(bottleId, accepterId, "Trop tard", key)).rejects.toThrow();
    expect(prisma.anonymousMessage.create).not.toHaveBeenCalled();
  });
});

describe("Bottles: postcard indicator reflects whose turn it is", () => {
  it("clears immediately after sending a reply, not merely after opening it", async () => {
    vi.mocked(prisma.bottleReceipt.count).mockResolvedValue(0);
    vi.mocked(prisma.messageInABottle.findMany).mockResolvedValue([
      { senderId, acceptedById: accepterId, messages: [{ senderId: accepterId }] },
    ] as any);
    expect(await countUnreadMessages(senderId)).toBe(1);
    expect(await countUnreadMessages(accepterId)).toBe(0);
    vi.mocked(prisma.messageInABottle.findMany).mockResolvedValue([
      { senderId, acceptedById: accepterId, messages: [{ senderId }] },
    ] as any);
    expect(await countUnreadMessages(senderId)).toBe(0);
    expect(await countUnreadMessages(accepterId)).toBe(1);
  });
});

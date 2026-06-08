import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock Prisma BEFORE importing service
vi.mock("../../src/config/prisma", () => {
  return {
    prisma: {
      messageInABottle: {
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
      },
      bottleReceipt: {
        createMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      anonymousMessage: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      bottleSuspension: {
        upsert: vi.fn(),
      },
      user: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      profile: {
        findUnique: vi.fn(),
      },
      $transaction: vi.fn(),
    },
  };
});

// Now import service AFTER mocking
import * as bottlesService from "../../src/modules/bottles/bottles.service";
import { prisma } from "../../src/config/prisma";
import { addDays } from "date-fns";

describe("BottleService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createBottle", () => {
    it("should create bottle with 30-day expiration and senderCity", async () => {
      const now = new Date();
      const mockBottle = {
        id: "bottle1",
        senderId: "user1",
        message: "Hello!",
        senderCity: "Paris",
        targetGender: "FEMME",
        ageMin: 25,
        ageMax: 35,
        status: "FLOATING",
        acceptedById: null,
        acceptedAt: null,
        createdAt: now,
        expiresAt: addDays(now, 30),
      };

      const mockProfile = { city: "Paris" };

      vi.mocked(prisma.profile.findUnique).mockResolvedValue(mockProfile as any);
      vi.mocked(prisma.messageInABottle.create).mockResolvedValue(mockBottle as any);
      vi.mocked(prisma.messageInABottle.count).mockResolvedValue(0);
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      vi.mocked(prisma.bottleReceipt.createMany).mockResolvedValue({ count: 0 });

      const result = await bottlesService.createBottle(
        "user1",
        "Hello!",
        "FEMME",
        25,
        35,
      );

      expect(result.id).toBe("bottle1");
      expect(result.senderCity).toBe("Paris");
      expect(result.expiresAt).toEqual(addDays(now, 30));
      expect(prisma.messageInABottle.create).toHaveBeenCalledWith({
        data: {
          senderId: "user1",
          message: "Hello!",
          senderCity: "Paris",
          targetGender: "FEMME",
          ageMin: 25,
          ageMax: 35,
          expiresAt: expect.any(Date),
        },
      });
    });

    it("should create receipts for compatible recipients", async () => {
      const mockBottle = {
        id: "bottle1",
        senderId: "user1",
        message: "Hello!",
        senderCity: "Paris",
        targetGender: "FEMME",
        ageMin: 25,
        ageMax: 35,
        status: "FLOATING",
        acceptedById: null,
        acceptedAt: null,
        createdAt: new Date(),
        expiresAt: addDays(new Date(), 30),
      };

      const mockUsers = [
        { id: "user2", bottleSuspension: null },
        { id: "user3", bottleSuspension: null },
      ];

      const mockProfile = { city: "Paris" };

      vi.mocked(prisma.profile.findUnique).mockResolvedValue(mockProfile as any);
      vi.mocked(prisma.messageInABottle.create).mockResolvedValue(mockBottle as any);
      vi.mocked(prisma.messageInABottle.count).mockResolvedValue(0);
      vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any);
      vi.mocked(prisma.bottleReceipt.createMany).mockResolvedValue({ count: 2 });

      await bottlesService.createBottle(
        "user1",
        "Hello!",
        "FEMME",
        25,
        35,
      );

      expect(prisma.bottleReceipt.createMany).toHaveBeenCalledWith({
        data: [
          { bottleId: "bottle1", recipientId: "user2" },
          { bottleId: "bottle1", recipientId: "user3" },
        ],
      });
    });
  });

  describe("refuseBottle", () => {
    it("should refuse bottle and republish to new compatibles (max 3)", async () => {
      const mockReceipt = {
        id: "receipt1",
        bottleId: "bottle1",
        recipientId: "user2",
        status: "REFUSED",
        createdAt: new Date(),
        actionAt: new Date(),
      };

      const mockBottle = {
        id: "bottle1",
        senderId: "user1",
        message: "Hello!",
        senderCity: "Paris",
        targetGender: "FEMME",
        ageMin: 25,
        ageMax: 35,
        status: "FLOATING",
        acceptedById: null,
        acceptedAt: null,
        createdAt: new Date(),
        expiresAt: addDays(new Date(), 30),
      };

      const mockExistingReceipts = [
        { recipientId: "user2" },
        { recipientId: "user3" },
      ];

      const mockNewCompatibles = [
        { id: "user4" },
        { id: "user5" },
        { id: "user6" },
        { id: "user7" },
      ];

      vi.mocked(prisma.bottleReceipt.update).mockResolvedValue(mockReceipt as any);
      vi.mocked(prisma.messageInABottle.findUnique).mockResolvedValue(mockBottle as any);
      vi.mocked(prisma.bottleReceipt.findMany).mockResolvedValue(mockExistingReceipts as any);
      vi.mocked(prisma.user.findMany).mockResolvedValue(mockNewCompatibles as any);
      vi.mocked(prisma.bottleReceipt.createMany).mockResolvedValue({ count: 3 });

      const result = await bottlesService.refuseBottle("bottle1", "user2");

      expect(result.status).toBe("REFUSED");
      // Verify createMany was called for new targets (max 3)
      expect(prisma.bottleReceipt.createMany).toHaveBeenCalledWith({
        data: [
          { bottleId: "bottle1", recipientId: "user4" },
          { bottleId: "bottle1", recipientId: "user5" },
          { bottleId: "bottle1", recipientId: "user6" },
        ],
      });
    });
  });

  describe("getMessages", () => {
    it("should retrieve messages in chronological order", async () => {
      const mockMessages = [
        {
          id: "msg1",
          bottleId: "bottle1",
          senderId: "user2",
          content: "First message",
          createdAt: new Date("2026-01-01"),
        },
        {
          id: "msg2",
          bottleId: "bottle1",
          senderId: "user1",
          content: "Reply",
          createdAt: new Date("2026-01-02"),
        },
      ];

      vi.mocked(prisma.anonymousMessage.findMany).mockResolvedValue(mockMessages as any);

      const result = await bottlesService.getMessages("bottle1");

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("msg1");
      expect(result[1].id).toBe("msg2");
      expect(prisma.anonymousMessage.findMany).toHaveBeenCalledWith({
        where: { bottleId: "bottle1" },
        orderBy: { createdAt: "asc" },
      });
    });
  });

  describe("postMessage", () => {
    it("should create anonymous message", async () => {
      const mockMessage = {
        id: "msg1",
        bottleId: "bottle1",
        senderId: "user2",
        content: "Hello from acceptor!",
        createdAt: new Date(),
      };

      vi.mocked(prisma.anonymousMessage.create).mockResolvedValue(mockMessage as any);

      const result = await bottlesService.postMessage(
        "bottle1",
        "user2",
        "Hello from acceptor!",
      );

      expect(result.id).toBe("msg1");
      expect(result.content).toBe("Hello from acceptor!");
      expect(prisma.anonymousMessage.create).toHaveBeenCalledWith({
        data: {
          bottleId: "bottle1",
          senderId: "user2",
          content: "Hello from acceptor!",
        },
      });
    });
  });

  describe("reportAndSuspend", () => {
    it("should increment report count and update suspension", async () => {
      const mockSuspension = {
        id: "susp1",
        userId: "user1",
        reason: "Inappropriate content",
        reportCount: 2,
        startedAt: new Date(),
        endsAt: addDays(new Date(), 7),
      };

      vi.mocked(prisma.bottleSuspension.upsert).mockResolvedValue(mockSuspension as any);

      await bottlesService.reportAndSuspend(
        "bottle1",
        "user1",
        "Inappropriate content",
      );

      expect(prisma.bottleSuspension.upsert).toHaveBeenCalledWith({
        where: { userId: "user1" },
        update: {
          reportCount: { increment: 1 },
          reason: "Inappropriate content",
        },
        create: {
          userId: "user1",
          reason: "Inappropriate content",
          reportCount: 1,
          startedAt: expect.any(Date),
          endsAt: expect.any(Date),
        },
      });
    });
  });
});

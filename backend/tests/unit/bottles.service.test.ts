import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock Prisma BEFORE importing service
vi.mock("../../src/config/prisma", () => {
  const mocks = {
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
      findFirst: vi.fn(),
    },
    bottleSuspension: {
      upsert: vi.fn(),
    },
    bottleRevealRequest: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    profile: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((fn: any) => fn(mocks)),
  };
  return {
    prisma: mocks,
  };
});

// Mock isPremiumActive
vi.mock("../../src/policies/premium", () => ({
  isPremiumActive: vi.fn(() => false),
}));

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
      const mockBottle = {
        id: "bottle1",
        senderId: "user1",
        acceptedById: "user2",
        message: "Initial message",
        createdAt: new Date("2026-01-01"),
      };

      const mockMessages = [
        {
          id: "msg1",
          bottleId: "bottle1",
          senderId: "user2",
          content: "First message",
          createdAt: new Date("2026-01-02"),
        },
        {
          id: "msg2",
          bottleId: "bottle1",
          senderId: "user1",
          content: "Reply",
          createdAt: new Date("2026-01-03"),
        },
      ];

      vi.mocked(prisma.messageInABottle.findUnique).mockResolvedValue(mockBottle as any);
      vi.mocked(prisma.anonymousMessage.findMany).mockResolvedValue(mockMessages as any);

      const result = await bottlesService.getMessages("bottle1", "user1");

      expect(result.messages).toHaveLength(3); // initial + 2 anonymous
      expect(result.messages[0].source).toBe("INITIAL_BOTTLE");
      expect(result.messages[0].isMine).toBe(true);
      expect(result.messages[1].source).toBe("ANONYMOUS_MESSAGE");
      expect(result.messages[1].isMine).toBe(false);
      expect(result.messages[2].source).toBe("ANONYMOUS_MESSAGE");
      expect(result.messages[2].isMine).toBe(true);
      expect(prisma.anonymousMessage.findMany).toHaveBeenCalledWith({
        where: { bottleId: "bottle1" },
        orderBy: { createdAt: "asc" },
      });
    });
  });

  describe("postMessage", () => {
    it("should create anonymous message with idempotency key", async () => {
      const mockBottle = {
        id: "bottle1",
        senderId: "user1",
        acceptedById: "user2",
        status: "ACCEPTED",
        message: "Initial message",
        createdAt: new Date(),
      };

      const mockMessage = {
        id: "msg1",
        bottleId: "bottle1",
        senderId: "user2",
        content: "Hello from acceptor!",
        idempotencyKey: "uuid-key-1",
        createdAt: new Date(),
      };

      // Mock no existing message (first time)
      vi.mocked(prisma.anonymousMessage.findFirst).mockResolvedValueOnce(null as any);

      // Mock the bottle lookup
      vi.mocked(prisma.messageInABottle.findUnique).mockResolvedValue(mockBottle as any);

      // Mock the last message check (no previous messages, so user1 is the last sender)
      vi.mocked(prisma.anonymousMessage.findFirst).mockResolvedValueOnce(null as any);

      // Mock the message creation
      vi.mocked(prisma.anonymousMessage.create).mockResolvedValue(mockMessage as any);

      const result = await bottlesService.postMessage(
        "bottle1",
        "user2",
        "Hello from acceptor!",
        "uuid-key-1",
      );

      expect(result.message.id).toBe("msg1");
      expect(result.message.content).toBe("Hello from acceptor!");
      expect(result.idempotentReplay).toBe(false);
      expect(prisma.anonymousMessage.create).toHaveBeenCalledWith({
        data: {
          bottleId: "bottle1",
          senderId: "user2",
          content: "Hello from acceptor!",
          idempotencyKey: "uuid-key-1",
        },
      });
    });

    it("should return existing message on idempotent replay", async () => {
      const idempotencyKey = "uuid-key-existing";
      const existingMessage = {
        id: "msg-existing",
        bottleId: "bottle1",
        senderId: "user2",
        content: "Existing message",
        idempotencyKey,
        createdAt: new Date(),
      };

      // Mock finding the existing message
      vi.mocked(prisma.anonymousMessage.findFirst).mockResolvedValue(existingMessage as any);

      const result = await bottlesService.postMessage(
        "bottle1",
        "user2",
        "Retry content",
        idempotencyKey,
      );

      expect(result.message.id).toBe("msg-existing");
      expect(result.idempotentReplay).toBe(true);
      // Should NOT call create
      expect(prisma.anonymousMessage.create).not.toHaveBeenCalled();
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

  describe("requestReveal", () => {
    it("should create a new reveal request when none exists", async () => {
      const mockBottle = {
        id: "bottle1",
        senderId: "user1",
        acceptedById: "user2",
        status: "ACCEPTED",
      };

      const mockRequest = {
        id: "req1",
        bottleId: "bottle1",
        requestedById: "user1",
        respondentId: "user2",
        status: "PENDING",
        createdAt: new Date(),
        respondedAt: null,
      };

      vi.mocked(prisma.messageInABottle.findUnique).mockResolvedValue(mockBottle as any);
      vi.mocked(prisma.bottleRevealRequest.findUnique).mockResolvedValue(null as any);
      vi.mocked(prisma.bottleRevealRequest.create).mockResolvedValue(mockRequest as any);

      const result = await bottlesService.requestReveal("bottle1", "user1");

      expect(result.id).toBe("req1");
      expect(result.status).toBe("PENDING");
      expect(prisma.bottleRevealRequest.create).toHaveBeenCalledWith({
        data: {
          bottleId: "bottle1",
          requestedById: "user1",
          respondentId: "user2",
        },
      });
    });

    it("should return existing pending request", async () => {
      const mockBottle = {
        id: "bottle1",
        senderId: "user1",
        acceptedById: "user2",
        status: "ACCEPTED",
      };

      const existingRequest = {
        id: "req1",
        bottleId: "bottle1",
        requestedById: "user1",
        respondentId: "user2",
        status: "PENDING",
        createdAt: new Date(),
        respondedAt: null,
      };

      vi.mocked(prisma.messageInABottle.findUnique).mockResolvedValue(mockBottle as any);
      vi.mocked(prisma.bottleRevealRequest.findUnique).mockResolvedValue(existingRequest as any);

      const result = await bottlesService.requestReveal("bottle1", "user1");

      expect(result.id).toBe("req1");
      expect(result.status).toBe("PENDING");
      expect(prisma.bottleRevealRequest.create).not.toHaveBeenCalled();
    });

    it("should throw error if request already exists with REFUSED status", async () => {
      const mockBottle = {
        id: "bottle1",
        senderId: "user1",
        acceptedById: "user2",
        status: "ACCEPTED",
      };

      const refusedRequest = {
        id: "req1",
        bottleId: "bottle1",
        requestedById: "user1",
        respondentId: "user2",
        status: "REFUSED",
        createdAt: new Date(),
        respondedAt: new Date(),
      };

      vi.mocked(prisma.messageInABottle.findUnique).mockResolvedValue(mockBottle as any);
      vi.mocked(prisma.bottleRevealRequest.findUnique).mockResolvedValue(refusedRequest as any);

      try {
        await bottlesService.requestReveal("bottle1", "user1");
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.code).toBe("REVEAL_REQUEST_ALREADY_EXISTS");
        expect(error.message).toContain("Reveal request already exists");
      }
    });

    it("should throw error if bottle not found", async () => {
      vi.mocked(prisma.messageInABottle.findUnique).mockResolvedValue(null as any);

      try {
        await bottlesService.requestReveal("bottle1", "user1");
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).toContain("Bottle not found");
      }
    });

    it("should throw error if user is not a participant", async () => {
      const mockBottle = {
        id: "bottle1",
        senderId: "user1",
        acceptedById: "user2",
        status: "ACCEPTED",
      };

      vi.mocked(prisma.messageInABottle.findUnique).mockResolvedValue(mockBottle as any);

      try {
        await bottlesService.requestReveal("bottle1", "user3");
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).toContain("Unauthorized");
      }
    });
  });
});

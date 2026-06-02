import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@config/prisma";
import {
  consumeOffering,
  getCurrentStage,
} from "@modules/offerings/offerings.service";
import { ConsumptionMode } from "@prisma/client";
import { ForbiddenError, NotFoundError } from "@core/errors";

describe("Offerings Consumption MVP", () => {
  let testOfferingId: string;
  let sharedOfferingId: string;
  let user1Id: string;
  let user2Id: string;
  let user3Id: string;

  beforeAll(async () => {
    // Create test users
    const u1 = await prisma.user.create({
      data: {
        email: `test_consumer_1_${Date.now()}@test.com`,
        passwordHash: "hash",
        isVerified: true,
      },
    });
    user1Id = u1.id;

    const u2 = await prisma.user.create({
      data: {
        email: `test_consumer_2_${Date.now()}@test.com`,
        passwordHash: "hash",
        isVerified: true,
      },
    });
    user2Id = u2.id;

    const u3 = await prisma.user.create({
      data: {
        email: `test_consumer_3_${Date.now()}@test.com`,
        passwordHash: "hash",
        isVerified: true,
      },
    });
    user3Id = u3.id;

    // Verify catalog has PRIVATE and SHARED offerings
    const privateOffering = await prisma.offeringCatalog.findFirst({
      where: { consumptionMode: ConsumptionMode.PRIVATE },
    });
    const sharedOffering = await prisma.offeringCatalog.findFirst({
      where: { consumptionMode: ConsumptionMode.SHARED },
    });

    if (!privateOffering || !sharedOffering) {
      throw new Error("Test offerings not seeded (PRIVATE/SHARED)");
    }

    testOfferingId = privateOffering.id;
    sharedOfferingId = sharedOffering.id;
  });

  afterAll(async () => {
    // Cleanup test users and offerings
    await prisma.offeringSent.deleteMany({
      where: { fromUserId: { in: [user1Id, user2Id, user3Id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [user1Id, user2Id, user3Id] } },
    });
  });

  describe("getCurrentStage", () => {
    it("should calculate stage as consumptionCount + 1 (capped at 3)", () => {
      expect(getCurrentStage(0)).toBe(1);
      expect(getCurrentStage(1)).toBe(2);
      expect(getCurrentStage(2)).toBe(3);
      expect(getCurrentStage(3)).toBe(3);
      expect(getCurrentStage(4)).toBe(3);
    });
  });

  describe("SHARED offering consumption", () => {
    it("should allow any user in salon to consume SHARED offering", async () => {
      // Create SHARED offering sent to user1
      const sent = await prisma.offeringSent.create({
        data: {
          offeringId: sharedOfferingId,
          fromUserId: user2Id,
          toUserId: user1Id,
          salonId: null,
        },
      });

      // User2 (not recipient) should be able to consume
      const result1 = await consumeOffering(sent.id, user2Id);
      expect(result1.consumptionCount).toBe(1);
      expect(result1.currentStage).toBe(2);
      expect(result1.lastConsumedBy).toBe(user2Id);

      // User3 (random user) should also be able to consume
      const result2 = await consumeOffering(sent.id, user3Id);
      expect(result2.consumptionCount).toBe(2);
      expect(result2.currentStage).toBe(3);
      expect(result2.lastConsumedBy).toBe(user3Id);

      // Another consumption should max out at stage 3 (disappear)
      const result3 = await consumeOffering(sent.id, user1Id);
      expect(result3.consumptionCount).toBe(3);
      expect(result3.currentStage).toBe(3);

      // Fourth consumption should fail (fully consumed)
      await expect(consumeOffering(sent.id, user2Id)).rejects.toThrow(ForbiddenError);
    });

    it("should track lastConsumedBy correctly for SHARED offerings", async () => {
      const sent = await prisma.offeringSent.create({
        data: {
          offeringId: sharedOfferingId,
          fromUserId: user1Id,
          toUserId: user2Id,
          salonId: null,
        },
      });

      await consumeOffering(sent.id, user1Id);
      let check = await prisma.offeringSent.findUnique({ where: { id: sent.id } });
      expect(check?.lastConsumedBy).toBe(user1Id);

      await consumeOffering(sent.id, user3Id);
      check = await prisma.offeringSent.findUnique({ where: { id: sent.id } });
      expect(check?.lastConsumedBy).toBe(user3Id);
    });
  });

  describe("PRIVATE offering consumption", () => {
    it("should only allow recipient to consume PRIVATE offering", async () => {
      // Create PRIVATE offering sent to user1
      const sent = await prisma.offeringSent.create({
        data: {
          offeringId: testOfferingId,
          fromUserId: user2Id,
          toUserId: user1Id,
          salonId: null,
        },
      });

      // Recipient (user1) should succeed
      const result = await consumeOffering(sent.id, user1Id);
      expect(result.consumptionCount).toBe(1);

      // Non-recipient (user2) should fail with 403
      await expect(consumeOffering(sent.id, user2Id)).rejects.toThrow(ForbiddenError);

      // Non-recipient (user3) should fail with 403
      await expect(consumeOffering(sent.id, user3Id)).rejects.toThrow(ForbiddenError);
    });

    it("should enforce PRIVATE mode on all consumption stages", async () => {
      const sent = await prisma.offeringSent.create({
        data: {
          offeringId: testOfferingId,
          fromUserId: user1Id,
          toUserId: user2Id,
          salonId: null,
        },
      });

      // Recipient consumes through all 3 stages
      await consumeOffering(sent.id, user2Id); // stage 2
      await consumeOffering(sent.id, user2Id); // stage 3
      await consumeOffering(sent.id, user2Id); // stay stage 3

      // Non-recipient still blocked on stage 3
      await expect(consumeOffering(sent.id, user1Id)).rejects.toThrow(ForbiddenError);
    });
  });

  describe("Expiration checks", () => {
    it("should prevent consumption of expired offerings", async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 1000); // 1 sec ago

      const sent = await prisma.offeringSent.create({
        data: {
          offeringId: sharedOfferingId,
          fromUserId: user1Id,
          toUserId: user2Id,
          salonId: null,
          expiresAt: pastDate,
        },
      });

      // Should fail: expired
      await expect(consumeOffering(sent.id, user1Id)).rejects.toThrow(ForbiddenError);
    });

    it("should allow consumption of non-expired offerings", async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 60000); // 1 min from now

      const sent = await prisma.offeringSent.create({
        data: {
          offeringId: sharedOfferingId,
          fromUserId: user1Id,
          toUserId: user2Id,
          salonId: null,
          expiresAt: futureDate,
        },
      });

      const result = await consumeOffering(sent.id, user1Id);
      expect(result.consumptionCount).toBe(1);
    });

    it("should allow consumption of offerings with no expiry", async () => {
      const sent = await prisma.offeringSent.create({
        data: {
          offeringId: sharedOfferingId,
          fromUserId: user1Id,
          toUserId: user2Id,
          salonId: null,
          expiresAt: null,
        },
      });

      const result = await consumeOffering(sent.id, user1Id);
      expect(result.consumptionCount).toBe(1);
    });
  });

  describe("Race condition mitigation", () => {
    it("should handle concurrent consumptions atomically", async () => {
      const sent = await prisma.offeringSent.create({
        data: {
          offeringId: sharedOfferingId,
          fromUserId: user1Id,
          toUserId: user2Id,
          salonId: null,
        },
      });

      // Simulate 2 concurrent consumptions
      const [result1, result2] = await Promise.all([
        consumeOffering(sent.id, user2Id),
        consumeOffering(sent.id, user3Id),
      ]);

      // Both should succeed with sequential counts
      expect(result1.consumptionCount + result2.consumptionCount).toBe(3);
      expect(
        (result1.consumptionCount === 1 && result2.consumptionCount === 2) ||
        (result1.consumptionCount === 2 && result2.consumptionCount === 1)
      ).toBe(true);

      // Verify final state
      const final = await prisma.offeringSent.findUnique({ where: { id: sent.id } });
      expect(final?.consumptionCount).toBe(2);
    });
  });

  describe("Error cases", () => {
    it("should throw NotFoundError for non-existent offering", async () => {
      await expect(consumeOffering("nonexistent_id", user1Id)).rejects.toThrow(NotFoundError);
    });

    it("should throw ForbiddenError when fully consumed (stage 3)", async () => {
      const sent = await prisma.offeringSent.create({
        data: {
          offeringId: sharedOfferingId,
          fromUserId: user1Id,
          toUserId: user2Id,
          salonId: null,
          consumptionCount: 3,
        },
      });

      await expect(consumeOffering(sent.id, user1Id)).rejects.toThrow(ForbiddenError);
    });
  });
});

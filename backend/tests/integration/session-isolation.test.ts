import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@config/prisma";
import * as salonSessionsService from "@modules/salon-sessions/salonSessions.service";
import { ConsumptionMode, OfferingCategory } from "@prisma/client";
import { BadRequestError } from "@core/errors";

describe("Session Isolation - Drink/Eat Actions", () => {
  let salon: any;
  let session1: any;
  let session2: any;
  let userA: any;
  let userB: any;
  let userC: any;
  let boissonOfferingId: string = "";

  beforeAll(async () => {
    // Create test users
    userA = await prisma.user.create({
      data: {
        email: `test_isolation_a_${Date.now()}@test.com`,
        passwordHash: "hash",
        isVerified: true,
        profile: {
          create: {
            pseudo: `TestA_${Date.now()}`,
            birthDate: new Date("1990-01-01"),
            gender: "HOMME",
            city: "Paris",
          },
        },
      },
    });

    userB = await prisma.user.create({
      data: {
        email: `test_isolation_b_${Date.now()}@test.com`,
        passwordHash: "hash",
        isVerified: true,
        profile: {
          create: {
            pseudo: `TestB_${Date.now()}`,
            birthDate: new Date("1990-01-01"),
            gender: "FEMME",
            city: "Paris",
          },
        },
      },
    });

    userC = await prisma.user.create({
      data: {
        email: `test_isolation_c_${Date.now()}@test.com`,
        passwordHash: "hash",
        isVerified: true,
        profile: {
          create: {
            pseudo: `TestC_${Date.now()}`,
            birthDate: new Date("1990-01-01"),
            gender: "FEMME",
            city: "Paris",
          },
        },
      },
    });

    // Get or create salon
    salon = await prisma.salon.findFirst({
      where: { kind: "METAL" },
    });
    if (!salon) {
      throw new Error("Test salon METAL not found");
    }

    // Get a BOISSON offering
    const boissonOffering = await prisma.offeringCatalog.findFirst({
      where: { category: OfferingCategory.BOISSON },
    });
    if (!boissonOffering) {
      throw new Error("Test BOISSON offering not found");
    }
    boissonOfferingId = boissonOffering.id;

    // Create Session 1 in METAL salon
    session1 = await prisma.salonSession.create({
      data: {
        salonKind: "METAL",
        status: "ACTIVE",
        expiresAt: new Date(Date.now() + 86400000), // 24h from now
      },
    });

    // Create Session 2 in METAL salon (SAME SALON, DIFFERENT SESSION)
    session2 = await prisma.salonSession.create({
      data: {
        salonKind: "METAL",
        status: "ACTIVE",
        expiresAt: new Date(Date.now() + 86400000), // 24h from now
      },
    });

    // Add participants to sessions
    await prisma.salonSessionParticipant.create({
      data: {
        sessionId: session1.id,
        userId: userA.id,
        status: "ACTIVE",
      },
    });

    await prisma.salonSessionParticipant.create({
      data: {
        sessionId: session1.id,
        userId: userB.id,
        status: "ACTIVE",
      },
    });

    await prisma.salonSessionParticipant.create({
      data: {
        sessionId: session2.id,
        userId: userB.id,
        status: "ACTIVE",
      },
    });

    await prisma.salonSessionParticipant.create({
      data: {
        sessionId: session2.id,
        userId: userC.id,
        status: "ACTIVE",
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    if (session1 || session2) {
      await prisma.salonSessionParticipant.deleteMany({
        where: {
          sessionId: { in: [session1?.id, session2?.id].filter(Boolean) },
        },
      });
      await prisma.salonSession.deleteMany({
        where: { id: { in: [session1?.id, session2?.id].filter(Boolean) } },
      });
    }
    if (userA || userB || userC) {
      await prisma.offeringSent.deleteMany({
        where: {
          fromUserId: { in: [userA?.id, userB?.id, userC?.id].filter(Boolean) },
        },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [userA?.id, userB?.id, userC?.id].filter(Boolean) } },
      });
    }
  });

  describe("performDrinkAction - Session Isolation", () => {
    it("should NOT consume offering from a DIFFERENT session in the same salon", async () => {
      // User A sends a BOISSON offering in Session 1 to User B
      const offeringInSession1 = await prisma.offeringSent.create({
        data: {
          offeringId: boissonOfferingId,
          fromUserId: userA.id,
          toUserId: userB.id,
          salonId: salon.id,
          consumptionMode: ConsumptionMode.SHARED,
        },
      });

      // User B is a participant in BOTH sessions
      // User B tries to drink in Session 2
      // The offering in Session 1 should NOT be available for consumption in Session 2

      const resultSession2 = await salonSessionsService.performDrinkAction(
        session2.id,
        userB.id
      );

      // CRITICAL: offeringConsumed should be FALSE because the offering is from Session 1
      expect(resultSession2.success).toBe(true);
      expect(resultSession2.offeringConsumed).toBe(false);

      // Verify the offering in Session 1 was NOT consumed
      const checkOffering = await prisma.offeringSent.findUnique({
        where: { id: offeringInSession1.id },
      });
      expect(checkOffering?.consumptionCount).toBe(0);
    });

    it("should only consume offering from the CURRENT session's participants", async () => {
      // User A (in Session 1) sends a BOISSON offering to User B (in both sessions)
      const offeringSession1 = await prisma.offeringSent.create({
        data: {
          offeringId: boissonOfferingId,
          fromUserId: userA.id,
          toUserId: userB.id,
          salonId: salon.id,
          consumptionMode: ConsumptionMode.SHARED,
        },
      });

      // User B tries to drink in Session 1 → should SUCCEED (same session)
      const result1 = await salonSessionsService.performDrinkAction(
        session1.id,
        userB.id
      );
      expect(result1.offeringConsumed).toBe(true);

      // Check that it WAS consumed
      const check1 = await prisma.offeringSent.findUnique({
        where: { id: offeringSession1.id },
      });
      expect(check1?.consumptionCount).toBe(1);
    });

    it("should enforce strict session boundary: User C in Session 2 cannot consume User A's offering from Session 1", async () => {
      // User A (in Session 1) sends a BOISSON offering to User C (in Session 2 only)
      const offeringSession1 = await prisma.offeringSent.create({
        data: {
          offeringId: boissonOfferingId,
          fromUserId: userA.id,
          toUserId: userC.id,
          salonId: salon.id,
          consumptionMode: ConsumptionMode.SHARED,
        },
      });

      // User C (only in Session 2) tries to drink in Session 2
      // User A is NOT a participant in Session 2, so the offering should NOT be available
      const result2 = await salonSessionsService.performDrinkAction(
        session2.id,
        userC.id
      );

      expect(result2.offeringConsumed).toBe(false);

      // Verify offering was NOT consumed
      const check = await prisma.offeringSent.findUnique({
        where: { id: offeringSession1.id },
      });
      expect(check?.consumptionCount).toBe(0);
    });
  });

  describe("performEatAction - Session Isolation", () => {
    it("should NOT consume offering from a DIFFERENT session in the same salon", async () => {
      // Get a NOURRITURE offering
      const nourritureOffering = await prisma.offeringCatalog.findFirst({
        where: { category: OfferingCategory.NOURRITURE },
      });
      if (!nourritureOffering) {
        throw new Error("Test NOURRITURE offering not found");
      }

      // User A sends a NOURRITURE offering in Session 1 to User B
      const offeringInSession1 = await prisma.offeringSent.create({
        data: {
          offeringId: nourritureOffering.id,
          fromUserId: userA.id,
          toUserId: userB.id,
          salonId: salon.id,
          consumptionMode: ConsumptionMode.SHARED,
        },
      });

      // User B tries to eat in Session 2
      const resultSession2 = await salonSessionsService.performEatAction(
        session2.id,
        userB.id
      );

      // CRITICAL: offeringConsumed should be FALSE
      expect(resultSession2.success).toBe(true);
      expect(resultSession2.offeringConsumed).toBe(false);

      // Verify offering was NOT consumed
      const checkOffering = await prisma.offeringSent.findUnique({
        where: { id: offeringInSession1.id },
      });
      expect(checkOffering?.consumptionCount).toBe(0);
    });
  });

  describe("Session Isolation Edge Cases", () => {
    it("should reject action if user is not a participant in the session", async () => {
      // User C is NOT in Session 1
      await expect(
        salonSessionsService.performDrinkAction(session1.id, userC.id)
      ).rejects.toThrow(BadRequestError);
    });

    it("should work correctly when offering sender is in the session", async () => {
      // Both User A and User B are in Session 1
      const offering = await prisma.offeringSent.create({
        data: {
          offeringId: boissonOfferingId,
          fromUserId: userA.id,
          toUserId: userB.id,
          salonId: salon.id,
          consumptionMode: ConsumptionMode.SHARED,
        },
      });

      // User B (receiver) in Session 1 can consume (same session)
      const result = await salonSessionsService.performDrinkAction(
        session1.id,
        userB.id
      );

      expect(result.offeringConsumed).toBe(true);

      // Verify it was consumed
      const check = await prisma.offeringSent.findUnique({
        where: { id: offering.id },
      });
      expect(check?.consumptionCount).toBe(1);
    });
  });
});

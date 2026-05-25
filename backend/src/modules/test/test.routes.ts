import { Router, Request, Response } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { prisma } from "../../config/prisma";

const router = Router();

/**
 * TEMPORARY DEV ENDPOINT ONLY
 * POST /api/test/reset-mutual-smile
 *
 * Creates or resets 2 virgin test accounts for mutual smile flow testing.
 * Returns credentials for login in the app.
 *
 * SECURITY: Remove this endpoint before production!
 */
router.post(
  "/reset-mutual-smile",
  asyncHandler(async (_req: Request, res: Response) => {
    // Safety check - only in dev/staging
    const env = process.env.NODE_ENV || "development";
    if (env === "production") {
      return res.status(403).json({ error: "Test endpoint disabled in production" });
    }

    const timestamp = Date.now();
    const userAId = `test-mutual-a-${timestamp}`;
    const userBId = `test-mutual-b-${timestamp}`;
    const emailA = `test.mutual.a.${timestamp}@jeutaime.test`;
    const emailB = `test.mutual.b.${timestamp}@jeutaime.test`;
    const passwordA = `test-a-${timestamp}`;
    const passwordB = `test-b-${timestamp}`;

    try {
      // Delete any existing test data between these IDs (safety cleanup)
      await prisma.reaction.deleteMany({
        where: {
          OR: [
            { fromId: userAId, toId: userBId },
            { fromId: userBId, toId: userAId },
          ],
        },
      });

      const [sortedA, sortedB] = userAId < userBId ? [userAId, userBId] : [userBId, userAId];
      await prisma.match.deleteMany({
        where: {
          userAId: sortedA,
          userBId: sortedB,
        },
      });

      // Delete existing users if they exist
      await prisma.user.deleteMany({
        where: {
          OR: [{ id: userAId }, { id: userBId }],
        },
      });

      // Create User A
      const userA = await prisma.user.create({
        data: {
          id: userAId,
          email: emailA,
          pseudo: `test_mutual_a_${timestamp}`,
          password: passwordA, // In real app this would be hashed
          isBanned: false,
          hasCompletedQuestionnaire: false,
          birthDate: new Date("1990-01-01"),
          gender: "AUTRE",
          interestedIn: ["AUTRE"],
          city: "Test",
          bio: "Test account A - mutual smile flow",
          lookingFor: ["relation"],
          physicalDesc: "moyenne",
          avatarConfig: {},
        },
      });

      // Create User B
      const userB = await prisma.user.create({
        data: {
          id: userBId,
          email: emailB,
          pseudo: `test_mutual_b_${timestamp}`,
          password: passwordB,
          isBanned: false,
          hasCompletedQuestionnaire: false,
          birthDate: new Date("1990-01-01"),
          gender: "AUTRE",
          interestedIn: ["AUTRE"],
          city: "Test",
          bio: "Test account B - mutual smile flow",
          lookingFor: ["relation"],
          physicalDesc: "moyenne",
          avatarConfig: {},
        },
      });

      // Verify virgin state
      const reactions = await prisma.reaction.count({
        where: {
          OR: [
            { fromId: userAId, toId: userBId },
            { fromId: userBId, toId: userAId },
          ],
        },
      });

      const matches = await prisma.match.count({
        where: {
          userAId: sortedA,
          userBId: sortedB,
        },
      });

      res.json({
        status: "success",
        virgin: reactions === 0 && matches === 0,
        accountA: {
          email: userA.email,
          pseudo: userA.pseudo,
          password: passwordA, // Only in dev!
          userId: userA.id,
        },
        accountB: {
          email: userB.email,
          pseudo: userB.pseudo,
          password: passwordB, // Only in dev!
          userId: userB.id,
        },
        test_flow: [
          "1. Login with accountA credentials",
          "2. Find and Smile accountB",
          "3. Logout",
          "4. Login with accountB credentials",
          "5. Find and Smile accountA",
          "6. Verify mutual smile → match created",
        ],
      });
    } catch (error) {
      console.error("[test/reset-mutual-smile] Error:", error);
      res.status(500).json({
        error: "Failed to create test accounts",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }),
);

export default router;

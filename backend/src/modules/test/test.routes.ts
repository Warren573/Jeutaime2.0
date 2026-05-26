import { Router, Request, Response } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { prisma } from "../../config/prisma";
import * as authService from "../auth/auth.service";

const router = Router();

/**
 * DEBUG: Verify test router is mounted
 */
router.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "test-router-mounted",
    timestamp: new Date().toISOString(),
    node_env: process.env.NODE_ENV || "development",
    message: "If you see this, /api/test routes are available",
  });
});

/**
 * TEMPORARY DEV ENDPOINT ONLY
 * GET /api/test/reset-mutual-smile
 * POST /api/test/reset-mutual-smile
 *
 * Creates or resets 2 virgin test accounts for mutual smile flow testing.
 * Returns credentials for login in the app.
 *
 * SECURITY: Remove this endpoint before production!
 */
const resetMutualSmileHandler = asyncHandler(async (_req: Request, res: Response) => {
  const nodeEnv = process.env.NODE_ENV || "development";
  const isRenderStaging = process.env.RENDER_SERVICE_NAME === "jeutaime-staging";
  const allowTestEndpoints = process.env.ALLOW_TEST_ENDPOINTS === "true";

  if (nodeEnv === "production" && !isRenderStaging && !allowTestEndpoints) {
    return res.status(403).json({ error: "Test endpoint disabled in production" });
  }

  // DEBUG: Database connection info
  const dbUrl = process.env.DATABASE_URL || "not-set";
  const dbHostMatch = dbUrl.match(/host=([^&]+)/);
  const dbHost = dbHostMatch ? dbHostMatch[1] : "unknown";
  const dbUrlHash = require("crypto").createHash("sha256").update(dbUrl).digest("hex").substring(0, 8);

  const timestamp = Date.now();
  const userAId = `test-mutual-a-${timestamp}`;
  const userBId = `test-mutual-b-${timestamp}`;
  const emailA = `test.mutual.a.${timestamp}@jeutaime.test`;
  const emailB = `test.mutual.b.${timestamp}@jeutaime.test`;
  const pseudoA = `test_mutual_a_${timestamp}`;
  const pseudoB = `test_mutual_b_${timestamp}`;
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

    // Create User A with profile
    const userA = await prisma.user.create({
      data: {
        id: userAId,
        email: emailA,
        passwordHash: passwordA,
        isVerified: true,
        role: "USER",
        profile: {
          create: {
            pseudo: pseudoA,
            birthDate: new Date("1990-01-01"),
            gender: "AUTRE",
            interestedIn: ["AUTRE"],
            city: "Test",
            bio: "Test account A - mutual smile flow",
            lookingFor: ["RELATION"],
            physicalDesc: "moyenne",
            avatarConfig: {},
          },
        },
      },
      include: { profile: true },
    });

    // Create User B with profile
    const userB = await prisma.user.create({
      data: {
        id: userBId,
        email: emailB,
        passwordHash: passwordB,
        isVerified: true,
        role: "USER",
        profile: {
          create: {
            pseudo: pseudoB,
            birthDate: new Date("1990-01-01"),
            gender: "AUTRE",
            interestedIn: ["AUTRE"],
            city: "Test",
            bio: "Test account B - mutual smile flow",
            lookingFor: ["RELATION"],
            physicalDesc: "moyenne",
            avatarConfig: {},
          },
        },
      },
      include: { profile: true },
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

    // DEBUG: Verify users exist immediately after creation
    const verifyUserA = await prisma.user.findUnique({ where: { id: userAId } });
    const verifyUserB = await prisma.user.findUnique({ where: { id: userBId } });

    console.log("[test/reset-mutual-smile] DEBUG:", {
      dbUrlHash,
      dbHost,
      createdUserIds: [userAId, userBId],
      userAExists: !!verifyUserA,
      userBExists: !!verifyUserB,
    });

    res.json({
      status: "success",
      virgin: reactions === 0 && matches === 0,
      accountA: {
        email: userA.email,
        pseudo: userA.profile?.pseudo,
        password: passwordA, // Only in dev!
        userId: userA.id,
      },
      accountB: {
        email: userB.email,
        pseudo: userB.profile?.pseudo,
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
      _debug: {
        dbUrlHash,
        dbHost,
        userAExists: !!verifyUserA,
        userBExists: !!verifyUserB,
        createdIds: [userAId, userBId],
      },
    });
  } catch (error) {
    console.error("[test/reset-mutual-smile] Error:", error);
    res.status(500).json({
      error: "Failed to create test accounts",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.get("/reset-mutual-smile", resetMutualSmileHandler);
router.post("/reset-mutual-smile", resetMutualSmileHandler);

/**
 * DIAGNOSTIC ENDPOINT
 * GET /api/test/find-user-by-email?email=...
 *
 * Diagnose database connectivity and user existence.
 * Helps verify if users created by reset-mutual-smile can be found by auth/login.
 */
const findUserByEmailHandler = asyncHandler(async (req: Request, res: Response) => {
  const nodeEnv = process.env.NODE_ENV || "development";
  const isRenderStaging = process.env.RENDER_SERVICE_NAME === "jeutaime-staging";
  const allowTestEndpoints = process.env.ALLOW_TEST_ENDPOINTS === "true";

  if (nodeEnv === "production" && !isRenderStaging && !allowTestEndpoints) {
    return res.status(403).json({ error: "Test endpoint disabled in production" });
  }

  const email = req.query.email as string;
  if (!email) {
    return res.status(400).json({ error: "email query parameter required" });
  }

  // DEBUG: Database connection info
  const dbUrl = process.env.DATABASE_URL || "not-set";
  const dbHostMatch = dbUrl.match(/host=([^&]+)/);
  const dbHost = dbHostMatch ? dbHostMatch[1] : "unknown";

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        isVerified: true,
        passwordHash: true,
        profile: {
          select: {
            id: true,
            pseudo: true,
          },
        },
      },
    });

    console.log("[test/find-user-by-email] DEBUG:", {
      dbHost,
      emailSearched: email,
      userFound: !!user,
      userId: user?.id,
    });

    res.json({
      status: "success",
      _debug: {
        dbHost,
        emailSearched: email,
        userFound: !!user,
        userId: user?.id || null,
        hasProfile: !!user?.profile,
        profilePseudo: user?.profile?.pseudo || null,
        isVerified: user?.isVerified || null,
        passwordHashExists: !!user?.passwordHash,
      },
    });
  } catch (error) {
    console.error("[test/find-user-by-email] Error:", error);
    res.status(500).json({
      error: "Failed to search user",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.get("/find-user-by-email", findUserByEmailHandler);

/**
 * CALL REAL LOGIN WITH FULL DIAGNOSTICS
 * GET /api/test/call-real-login?email=...&password=...
 *
 * Calls authService.loginWithDebug() and returns ALL diagnostic information
 * directly in the JSON response - visible in browser.
 */
const callRealLoginHandler = asyncHandler(async (req: Request, res: Response) => {
  const nodeEnv = process.env.NODE_ENV || "development";
  const isRenderStaging = process.env.RENDER_SERVICE_NAME === "jeutaime-staging";
  const allowTestEndpoints = process.env.ALLOW_TEST_ENDPOINTS === "true";

  if (nodeEnv === "production" && !isRenderStaging && !allowTestEndpoints) {
    return res.status(403).json({ error: "Test endpoint disabled in production" });
  }

  const email = req.query.email as string;
  const password = req.query.password as string;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password query parameters required" });
  }

  try {
    const result = await authService.loginWithDebug({ email, password });

    if (result.tokens) {
      return res.json({
        status: "success",
        data: result.tokens,
        _debug: result.debug,
      });
    } else {
      return res.status(401).json({
        status: "error",
        error: result.error,
        _debug: result.debug,
      });
    }
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: "Call real login failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.get("/call-real-login", callRealLoginHandler);

export default router;

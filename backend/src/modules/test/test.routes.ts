import { Router, Request, Response } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { hashPassword } from "../../core/utils/hash";
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
    // Hash passwords BEFORE creating users
    const passwordHashA = await hashPassword(passwordA);
    const passwordHashB = await hashPassword(passwordB);

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

    // Create User A with profile, settings, and wallet
    const userA = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          id: userAId,
          email: emailA,
          passwordHash: passwordHashA,
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

      await tx.userSettings.create({
        data: {
          userId: newUser.id,
          showInDiscovery: true,
          showPhotoByDefault: true,
        },
      });

      await tx.wallet.create({
        data: {
          userId: newUser.id,
          coins: 100,
        },
      });

      return newUser;
    });

    // Create User B with profile, settings, and wallet
    const userB = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          id: userBId,
          email: emailB,
          passwordHash: passwordHashB,
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

      await tx.userSettings.create({
        data: {
          userId: newUser.id,
          showInDiscovery: true,
          showPhotoByDefault: true,
        },
      });

      await tx.wallet.create({
        data: {
          userId: newUser.id,
          coins: 100,
        },
      });

      return newUser;
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

    // DEBUG: Verify users, settings, and wallets exist
    const verifyUserA = await prisma.user.findUnique({ where: { id: userAId } });
    const verifyUserB = await prisma.user.findUnique({ where: { id: userBId } });
    const settingsA = await prisma.userSettings.findUnique({ where: { userId: userAId } });
    const settingsB = await prisma.userSettings.findUnique({ where: { userId: userBId } });
    const walletA = await prisma.wallet.findUnique({ where: { userId: userAId } });
    const walletB = await prisma.wallet.findUnique({ where: { userId: userBId } });

    console.log("[test/reset-mutual-smile] DEBUG:", {
      dbUrlHash,
      dbHost,
      createdUserIds: [userAId, userBId],
      userAExists: !!verifyUserA,
      userBExists: !!verifyUserB,
      userAHasSettings: !!settingsA,
      userBHasSettings: !!settingsB,
      userAShowInDiscovery: settingsA?.showInDiscovery,
      userBShowInDiscovery: settingsB?.showInDiscovery,
      userAHasWallet: !!walletA,
      userBHasWallet: !!walletB,
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
        userAHasSettings: !!settingsA,
        userBHasSettings: !!settingsB,
        userAShowInDiscovery: settingsA?.showInDiscovery ?? false,
        userBShowInDiscovery: settingsB?.showInDiscovery ?? false,
        userAHasWallet: !!walletA,
        userBHasWallet: !!walletB,
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

/**
 * DIAGNOSTIC ENDPOINT
 * GET /api/test/discovery-debug?viewerId=...&targetId=...
 *
 * Debug why targetId is not visible to viewerId in discovery.
 * Returns all exclusion reasons.
 */
const discoveryDebugHandler = asyncHandler(async (req: Request, res: Response) => {
  const nodeEnv = process.env.NODE_ENV || "development";
  const isRenderStaging = process.env.RENDER_SERVICE_NAME === "jeutaime-staging";
  const allowTestEndpoints = process.env.ALLOW_TEST_ENDPOINTS === "true";

  if (nodeEnv === "production" && !isRenderStaging && !allowTestEndpoints) {
    return res.status(403).json({ error: "Test endpoint disabled in production" });
  }

  const viewerId = req.query.viewerId as string;
  const targetId = req.query.targetId as string;

  if (!viewerId || !targetId) {
    return res.status(400).json({ error: "viewerId and targetId query parameters required" });
  }

  try {
    // 1. Check if target exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        isBanned: true,
        profile: { select: { id: true } },
        settings: { select: { showInDiscovery: true } },
      },
    });

    const targetExists = !!targetUser;
    const targetHasProfile = !!targetUser?.profile;
    const targetHasSettings = !!targetUser?.settings;
    const targetShowInDiscovery = targetUser?.settings?.showInDiscovery ?? false;
    const targetIsBanned = targetUser?.isBanned ?? false;

    // 2. Check if excluded by block
    const block = await prisma.block.findMany({
      where: {
        OR: [
          { fromId: viewerId, toId: targetId },
          { fromId: targetId, toId: viewerId },
        ],
      },
    });
    const excludedByBlock = block.length > 0;

    // 3. Check if excluded by existing match
    const [a, b] = [viewerId, targetId].sort();
    const match = await prisma.match.findUnique({
      where: { userAId_userBId: { userAId: a, userBId: b } },
      select: { id: true, status: true },
    });
    const excludedByExistingMatch = !!match;

    // 4. Check if excluded by viewerId itself
    const excludedByViewerId = viewerId === targetId;

    // 5. Would it pass the discovery WHERE clause?
    const wouldPassDiscoveryWhere =
      targetExists &&
      targetHasProfile &&
      targetHasSettings &&
      targetShowInDiscovery &&
      !targetIsBanned &&
      !excludedByBlock &&
      !excludedByExistingMatch &&
      !excludedByViewerId;

    res.json({
      status: "success",
      _debug: {
        viewerId,
        targetId,
        targetExists,
        targetHasProfile,
        targetHasSettings,
        targetShowInDiscovery,
        targetIsBanned,
        excludedByBlock,
        excludedByExistingMatch: excludedByExistingMatch ? { status: match?.status } : false,
        excludedByViewerId,
        wouldPassDiscoveryWhere,
        reasons: [
          !targetExists && "target user does not exist",
          !targetHasProfile && "target has no profile",
          !targetHasSettings && "target has no settings",
          !targetShowInDiscovery && "target showInDiscovery=false",
          targetIsBanned && "target is banned",
          excludedByBlock && "excluded by block",
          excludedByExistingMatch && "excluded by existing match",
          excludedByViewerId && "viewer excluded self",
        ].filter(Boolean),
      },
    });
  } catch (error) {
    console.error("[test/discovery-debug] Error:", error);
    res.status(500).json({
      error: "Discovery debug failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.get("/discovery-debug", discoveryDebugHandler);

export default router;

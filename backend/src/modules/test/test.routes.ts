import { Router, Request, Response } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { hashPassword } from "../../core/utils/hash";
import * as authService from "../auth/auth.service";
import { execSync } from "child_process";

const router = Router();

// Capture build time at module load
const BUILD_TIME = new Date().toISOString();

function getCommitSha() {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }).trim().substring(0, 7);
  } catch {
    return "unknown";
  }
}

function getBranch() {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }).trim();
  } catch {
    return "unknown";
  }
}

function getDbUrlHash() {
  const dbUrl = process.env.DATABASE_URL || "not-set";
  return require("crypto").createHash("sha256").update(dbUrl).digest("hex").substring(0, 8);
}

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
 * VERSION ENDPOINT
 * GET /api/test/version
 *
 * Returns exact deployment version information:
 * - environment (staging, production, development)
 * - commit SHA (7 chars)
 * - branch
 * - buildTime (when this module loaded)
 * - dbUrlHash (first 8 chars of sha256 of DATABASE_URL)
 *
 * This proves which code version is running on the server.
 */
router.get("/version", (_req: Request, res: Response) => {
  const nodeEnv = process.env.NODE_ENV || "development";
  const renderService = process.env.RENDER_SERVICE_NAME || "none";

  let environment = "development";
  if (nodeEnv === "production") environment = "production";
  if (renderService === "jeutaime-staging") environment = "staging";

  res.json({
    environment,
    commit: getCommitSha(),
    branch: getBranch(),
    buildTime: BUILD_TIME,
    dbUrlHash: getDbUrlHash(),
    _debug: {
      nodeEnv,
      renderService,
    },
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

    // Find ALL existing test-mutual-* users (cleanup from previous runs)
    const existingTestUsers = await prisma.user.findMany({
      where: { id: { startsWith: "test-mutual-" } },
      select: { id: true },
    });
    const allTestUserIds = existingTestUsers.map((u) => u.id);

    console.log(`[test/reset-mutual-smile] Found ${allTestUserIds.length} existing test-mutual-* users, cleaning up...`);

    // Delete ALL related data in correct order (respecting FK constraints)
    if (allTestUserIds.length > 0) {
      // Delete relations that reference these users
      await prisma.reaction.deleteMany({
        where: {
          OR: [{ fromId: { in: allTestUserIds } }, { toId: { in: allTestUserIds } }],
        },
      });

      // Delete matches where either userA or userB is a test user
      await prisma.match.deleteMany({
        where: {
          OR: [{ userAId: { in: allTestUserIds } }, { userBId: { in: allTestUserIds } }],
        },
      });

      // Delete letters
      await prisma.letter.deleteMany({
        where: {
          OR: [{ fromUserId: { in: allTestUserIds } }, { toUserId: { in: allTestUserIds } }],
        },
      });

      // Delete blocks
      await prisma.block.deleteMany({
        where: {
          OR: [{ fromId: { in: allTestUserIds } }, { toId: { in: allTestUserIds } }],
        },
      });

      // Delete other user-related data
      await prisma.refreshToken.deleteMany({
        where: { userId: { in: allTestUserIds } },
      });

      await prisma.photo.deleteMany({
        where: { userId: { in: allTestUserIds } },
      });

      await prisma.pet.deleteMany({
        where: { userId: { in: allTestUserIds } },
      });

      // Delete wallet, settings, profile (these may cascade but be explicit)
      await prisma.wallet.deleteMany({
        where: { userId: { in: allTestUserIds } },
      });

      await prisma.userSettings.deleteMany({
        where: { userId: { in: allTestUserIds } },
      });

      await prisma.profile.deleteMany({
        where: { userId: { in: allTestUserIds } },
      });

      // Finally delete users
      await prisma.user.deleteMany({
        where: { id: { in: allTestUserIds } },
      });

      console.log(`[test/reset-mutual-smile] Cleaned up ${allTestUserIds.length} test-mutual-* users`);
    }

    // Pre-sort userIds for match queries (userAId < userBId alphabetically)
    const [sortedA, sortedB] = userAId < userBId ? [userAId, userBId] : [userBId, userAId];

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
        oldTestAccountsCleaned: allTestUserIds.length,
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

  const viewerId = req.query.viewerId as string | undefined;
  const targetId = req.query.targetId as string | undefined;

  if (!viewerId || !targetId) {
    return res.status(400).json({ error: "viewerId and targetId query parameters required" });
  }

  // After guard, we know they're strings (TypeScript won't infer from guard, so we cast)
  const vId = viewerId as string;
  const tId = targetId as string;

  try {
    // 1. Check if target exists
    const targetUser = await prisma.user.findUnique({
      where: { id: tId },
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
          { fromId: vId, toId: tId },
          { fromId: tId, toId: vId },
        ],
      },
    });
    const excludedByBlock = block.length > 0;

    // 3. Check if excluded by existing match
    const [a, b] = [vId, tId].sort() as [string, string];
    const match = await prisma.match.findUnique({
      where: { userAId_userBId: { userAId: a, userBId: b } },
      select: { id: true, status: true },
    });
    const excludedByExistingMatch = !!match;

    // 4. Check if excluded by viewerId itself
    const excludedByViewerId = vId === tId;

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
        viewerId: vId,
        targetId: tId,
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

/**
 * DANGEROUS STAGING CLEANUP ENDPOINT
 * POST /api/test/cleanup-staging-debug-data
 *
 * STAGING ONLY - Cleans up test data and broken matches.
 * - Deletes all test-mutual-* users and their data
 * - Deletes all profiles matching test_mutual_%
 * - Deletes all BROKEN/GHOSTED/BLOCKED matches (all users)
 * - Returns counts of deleted records
 */
const cleanupStagingHandler = asyncHandler(async (_req: Request, res: Response) => {
  const nodeEnv = process.env.NODE_ENV || "development";
  const isRenderStaging = process.env.RENDER_SERVICE_NAME === "jeutaime-staging";

  // SAFETY: Only allow in staging or development with explicit flag
  if (!isRenderStaging && nodeEnv !== "development") {
    return res.status(403).json({ error: "Cleanup endpoint only available in staging/development" });
  }

  const allowTestEndpoints = process.env.ALLOW_TEST_ENDPOINTS === "true";
  if (nodeEnv === "production" && !isRenderStaging && !allowTestEndpoints) {
    return res.status(403).json({ error: "Test endpoint disabled in production" });
  }

  // VERSION CHECK - This proves which commit is running
  const commitSha = (() => {
    try {
      const { execSync } = require("child_process");
      return execSync("git rev-parse HEAD", { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }).trim();
    } catch {
      return "unknown";
    }
  })();
  console.log(`🔍 [VERSION] cleanup endpoint called - commit: ${commitSha}`);

  try {
    const counts = {
      testMutualUsersDeleted: 0,
      testProfilesDeleted: 0,
      reactionsDeleted: 0,
      matchesDeleted: 0,
      lettersDeleted: 0,
      refreshTokensDeleted: 0,
      walletsDeleted: 0,
      settingsDeleted: 0,
      photosDeleted: 0,
      petsDeleted: 0,
      blocksDeleted: 0,
      brokenMatchesDeleted: 0,
      orphanDiscoveryProfilesDeleted: 0,
    };

    // 1. Find test-mutual-* users
    const testMutualUsers = await prisma.user.findMany({
      where: { id: { startsWith: "test-mutual-" } },
      select: { id: true },
    });
    const testMutualIds = testMutualUsers.map((u) => u.id);
    counts.testMutualUsersDeleted = testMutualIds.length;

    console.log(`[cleanup-staging] Found ${testMutualIds.length} test-mutual-* users`);

    // 2. Find test_mutual_% profiles (by pseudo pattern)
    const testProfiles = await prisma.profile.findMany({
      where: { pseudo: { startsWith: "test_mutual_" } },
      select: { userId: true },
    });
    const testProfileUserIds = testProfiles.map((p) => p.userId);
    counts.testProfilesDeleted = testProfiles.length;

    console.log(`[cleanup-staging] Found ${testProfiles.length} test_mutual_% profiles`);

    // 3. Find users with email containing ".test" (test email pattern)
    const testEmailUsers = await prisma.user.findMany({
      where: { email: { contains: ".test" } },
      select: { id: true },
    });
    const testEmailUserIds = testEmailUsers.map((u) => u.id);
    console.log(`[cleanup-staging] Found ${testEmailUserIds.length} users with .test email pattern`);

    // 4. CRITICAL: Known orphan profile IDs that MUST be deleted directly by ID
    const orphanProfileIds = [
      "cmp6wyz62000111ip6f7t8uge",
      "cmp6yvp0h000511ip6beq6xqr",
      "cmpdrwja80001iy9qc9sb1vkh",
    ];

    console.log(`[cleanup-staging] ORPHAN: Looking for profiles: ${orphanProfileIds.join(", ")}`);

    // Find orphan profiles by ID
    const orphanProfiles = await prisma.profile.findMany({
      where: { id: { in: orphanProfileIds } },
      select: { id: true, userId: true, pseudo: true },
    });

    console.log(`[cleanup-staging] ORPHAN: Found by ID: ${orphanProfiles.length} profiles`);
    console.log(`[cleanup-staging] ORPHAN: Details: ${JSON.stringify(orphanProfiles)}`);

    // Get userIds from found profiles
    const orphanProfileUserIds = orphanProfiles.map((p) => p.userId);
    counts.orphanDiscoveryProfilesDeleted = orphanProfiles.length;

    if (orphanProfileUserIds.length > 0) {
      console.log(
        `[cleanup-staging] ORPHAN: Will delete userIds: ${orphanProfileUserIds.join(", ")}`
      );

      // Delete all data related to these userIds
      const orphanReactionsDeleted = await prisma.reaction.deleteMany({
        where: {
          OR: [
            { fromId: { in: orphanProfileUserIds } },
            { toId: { in: orphanProfileUserIds } },
          ],
        },
      }).then((r) => r.count);

      const orphanMatchesDeleted = await prisma.match.deleteMany({
        where: {
          OR: [
            { userAId: { in: orphanProfileUserIds } },
            { userBId: { in: orphanProfileUserIds } },
          ],
        },
      }).then((r) => r.count);

      const orphanLettersDeleted = await prisma.letter.deleteMany({
        where: {
          OR: [
            { fromUserId: { in: orphanProfileUserIds } },
            { toUserId: { in: orphanProfileUserIds } },
          ],
        },
      }).then((r) => r.count);

      const orphanBlocksDeleted = await prisma.block.deleteMany({
        where: {
          OR: [
            { fromId: { in: orphanProfileUserIds } },
            { toId: { in: orphanProfileUserIds } },
          ],
        },
      }).then((r) => r.count);

      const orphanTokensDeleted = await prisma.refreshToken.deleteMany({
        where: { userId: { in: orphanProfileUserIds } },
      }).then((r) => r.count);

      const orphanPhotosDeleted = await prisma.photo.deleteMany({
        where: { userId: { in: orphanProfileUserIds } },
      }).then((r) => r.count);

      const orphanPetsDeleted = await prisma.pet.deleteMany({
        where: { userId: { in: orphanProfileUserIds } },
      }).then((r) => r.count);

      const orphanWalletsDeleted = await prisma.wallet.deleteMany({
        where: { userId: { in: orphanProfileUserIds } },
      }).then((r) => r.count);

      const orphanSettingsDeleted = await prisma.userSettings.deleteMany({
        where: { userId: { in: orphanProfileUserIds } },
      }).then((r) => r.count);

      console.log(
        `[cleanup-staging] ORPHAN: Deleted related data - reactions: ${orphanReactionsDeleted}, matches: ${orphanMatchesDeleted}, letters: ${orphanLettersDeleted}, blocks: ${orphanBlocksDeleted}, tokens: ${orphanTokensDeleted}, photos: ${orphanPhotosDeleted}, pets: ${orphanPetsDeleted}, wallets: ${orphanWalletsDeleted}, settings: ${orphanSettingsDeleted}`
      );

      // Delete profiles
      const profilesDeleted = await prisma.profile.deleteMany({
        where: { userId: { in: orphanProfileUserIds } },
      }).then((r) => r.count);

      console.log(
        `[cleanup-staging] ORPHAN: Deleted ${profilesDeleted} profiles by userId`
      );

      // Delete users
      const usersDeleted = await prisma.user.deleteMany({
        where: { id: { in: orphanProfileUserIds } },
      }).then((r) => r.count);

      console.log(
        `[cleanup-staging] ORPHAN: Deleted ${usersDeleted} users`
      );
    } else {
      console.log(
        `[cleanup-staging] ORPHAN: No orphan profiles found to delete`
      );
    }

    // All users to clean (test-mutual + test profiles + test emails + orphans)
    const allTestUserIds = [
      ...new Set([
        ...testMutualIds,
        ...testProfileUserIds,
        ...testEmailUserIds,
        ...orphanProfileUserIds,
      ]),
    ];

    if (allTestUserIds.length > 0) {
      // Delete test users and their data
      counts.reactionsDeleted = await prisma.reaction.deleteMany({
        where: {
          OR: [{ fromId: { in: allTestUserIds } }, { toId: { in: allTestUserIds } }],
        },
      }).then((r) => r.count);

      counts.matchesDeleted = await prisma.match.deleteMany({
        where: {
          OR: [{ userAId: { in: allTestUserIds } }, { userBId: { in: allTestUserIds } }],
        },
      }).then((r) => r.count);

      counts.lettersDeleted = await prisma.letter.deleteMany({
        where: {
          OR: [{ fromUserId: { in: allTestUserIds } }, { toUserId: { in: allTestUserIds } }],
        },
      }).then((r) => r.count);

      counts.blocksDeleted = await prisma.block.deleteMany({
        where: {
          OR: [{ fromId: { in: allTestUserIds } }, { toId: { in: allTestUserIds } }],
        },
      }).then((r) => r.count);

      counts.refreshTokensDeleted = await prisma.refreshToken.deleteMany({
        where: { userId: { in: allTestUserIds } },
      }).then((r) => r.count);

      counts.photosDeleted = await prisma.photo.deleteMany({
        where: { userId: { in: allTestUserIds } },
      }).then((r) => r.count);

      counts.petsDeleted = await prisma.pet.deleteMany({
        where: { userId: { in: allTestUserIds } },
      }).then((r) => r.count);

      counts.walletsDeleted = await prisma.wallet.deleteMany({
        where: { userId: { in: allTestUserIds } },
      }).then((r) => r.count);

      counts.settingsDeleted = await prisma.userSettings.deleteMany({
        where: { userId: { in: allTestUserIds } },
      }).then((r) => r.count);

      // Delete profiles and users
      await prisma.profile.deleteMany({
        where: { userId: { in: allTestUserIds } },
      });

      await prisma.user.deleteMany({
        where: { id: { in: allTestUserIds } },
      });
    }

    // CRITICAL: Delete orphan profiles DIRECTLY by ID (regardless of conditions)
    console.log(
      `[cleanup-staging] Deleting ${orphanProfileIds.length} orphan profile IDs directly...`
    );
    await prisma.profile.deleteMany({
      where: { id: { in: orphanProfileIds } },
    });

    // 3. Delete BROKEN/GHOSTED/BLOCKED matches (ALL users, for data integrity)
    counts.brokenMatchesDeleted = await prisma.match.deleteMany({
      where: { status: { in: ["BROKEN", "GHOSTED", "BLOCKED"] } },
    }).then((r) => r.count);

    console.log("[cleanup-staging] Cleanup complete:", counts);

    res.json({
      status: "success",
      message: "Staging data cleanup completed",
      counts,
      _version: {
        commitSha,
      },
    });
  } catch (error) {
    console.error("[cleanup-staging] Error:", error);
    res.status(500).json({
      error: "Cleanup failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.post("/cleanup-staging-debug-data", cleanupStagingHandler);

/**
 * DIAGNOSTIC ENDPOINT
 * GET /api/test/identify-orphan-profiles
 *
 * Identify mysterious profiles that are still visible in discovery.
 * Pass comma-separated profile IDs: ?profileIds=cmp6wyz62000111ip6f7t8uge,cmp6yvp0h000511ip6beq6xqr,...
 */
const identifyOrphanProfilesHandler = asyncHandler(async (req: Request, res: Response) => {
  const nodeEnv = process.env.NODE_ENV || "development";
  const isRenderStaging = process.env.RENDER_SERVICE_NAME === "jeutaime-staging";
  const allowTestEndpoints = process.env.ALLOW_TEST_ENDPOINTS === "true";

  if (nodeEnv === "production" && !isRenderStaging && !allowTestEndpoints) {
    return res.status(403).json({ error: "Test endpoint disabled in production" });
  }

  const profileIdsParam = req.query.profileIds as string | undefined;
  if (!profileIdsParam) {
    return res.status(400).json({ error: "profileIds query parameter required (comma-separated)" });
  }

  const profileIds = profileIdsParam.split(",").map((id) => id.trim());

  try {
    const profiles = await prisma.profile.findMany({
      where: { id: { in: profileIds } },
      select: {
        id: true,
        userId: true,
        pseudo: true,
        gender: true,
        city: true,
        birthDate: true,
        bio: true,
      },
    });

    const results = await Promise.all(
      profiles.map(async (profile) => {
        const user = await prisma.user.findUnique({
          where: { id: profile.userId },
          select: {
            id: true,
            email: true,
            isBanned: true,
            createdAt: true,
            settings: { select: { showInDiscovery: true } },
          },
        });

        // Check if user has reactions
        const reactions = await prisma.reaction.count({
          where: {
            OR: [{ fromId: profile.userId }, { toId: profile.userId }],
          },
        });

        // Check if user has matches
        const matches = await prisma.match.count({
          where: {
            OR: [{ userAId: profile.userId }, { userBId: profile.userId }],
          },
        });

        // Pattern analysis
        const isTestEmail = user?.email?.includes(".test") || false;
        const isTestBio = profile.bio?.toLowerCase().includes("test") || false;
        const isTestPseudo = profile.pseudo?.toLowerCase().includes("test") || false;
        const isTestUserId = (user?.id || "").toLowerCase().includes("test");

        const isTestAccount = isTestEmail || isTestBio || isTestPseudo || isTestUserId;

        const reason = isTestAccount
          ? [
              isTestEmail && "email has .test",
              isTestBio && "bio contains 'test'",
              isTestPseudo && "pseudo contains 'test'",
              isTestUserId && "userId contains 'test'",
            ]
              .filter(Boolean)
              .join(", ")
          : "no test patterns";

        return {
          profileId: profile.id,
          userId: user?.id,
          email: user?.email,
          pseudo: profile.pseudo,
          bio: profile.bio,
          city: profile.city,
          isBanned: user?.isBanned,
          showInDiscovery: user?.settings?.showInDiscovery,
          createdAt: user?.createdAt,
          reactionCount: reactions,
          matchCount: matches,
          isTestAccount,
          testReason: reason,
        };
      })
    );

    const testAccounts = results.filter((r) => r.isTestAccount);
    const realAccounts = results.filter((r) => !r.isTestAccount);

    res.json({
      status: "success",
      profilesFound: results.length,
      testAccountsFound: testAccounts.length,
      realAccountsFound: realAccounts.length,
      profiles: results,
      testUserIds: testAccounts.map((r) => r.userId),
      summary: {
        allTestPatterns: testAccounts.length === results.length,
        message:
          testAccounts.length === results.length
            ? "All profiles are test accounts - safe to delete"
            : realAccounts.length > 0
              ? "⚠️ MIXED: Some profiles are real accounts - investigate before deleting"
              : "No test patterns found - investigate before deleting",
      },
    });
  } catch (error) {
    console.error("[test/identify-orphan-profiles] Error:", error);
    res.status(500).json({
      error: "Identify orphan profiles failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.get("/identify-orphan-profiles", identifyOrphanProfilesHandler);

/**
 * COMPLETE TEST VERIFICATION ENDPOINT
 * GET /api/test/verify-mutual-smile-discovery
 *
 * Complete verification: cleanup → reset → check discovery counts
 * Returns: Discovery A count (should be 1), Discovery B count (should be 1)
 */
const verifyMutualSmileDiscoveryHandler = asyncHandler(async (_req: Request, res: Response) => {
  const nodeEnv = process.env.NODE_ENV || "development";
  const isRenderStaging = process.env.RENDER_SERVICE_NAME === "jeutaime-staging";
  const allowTestEndpoints = process.env.ALLOW_TEST_ENDPOINTS === "true";

  if (nodeEnv === "production" && !isRenderStaging && !allowTestEndpoints) {
    return res.status(403).json({ error: "Test endpoint disabled in production" });
  }

  try {
    // Step 1: Cleanup
    const cleanupCounts = {
      testMutualUsersDeleted: 0,
      testEmailUsersDeleted: 0,
      brokenMatchesDeleted: 0,
    };

    const testMutualUsers = await prisma.user.findMany({
      where: { id: { startsWith: "test-mutual-" } },
      select: { id: true },
    });
    const testMutualIds = testMutualUsers.map((u) => u.id);
    cleanupCounts.testMutualUsersDeleted = testMutualIds.length;

    const testProfiles = await prisma.profile.findMany({
      where: { pseudo: { startsWith: "test_mutual_" } },
      select: { userId: true },
    });
    const testProfileUserIds = testProfiles.map((p) => p.userId);

    const testEmailUsers = await prisma.user.findMany({
      where: { email: { contains: ".test" } },
      select: { id: true },
    });
    const testEmailUserIds = testEmailUsers.map((u) => u.id);
    cleanupCounts.testEmailUsersDeleted = testEmailUserIds.length;

    // Known orphan profile IDs (hardcoded)
    const orphanProfileIds = [
      "cmp6wyz62000111ip6f7t8uge",
      "cmp6yvp0h000511ip6beq6xqr",
      "cmpdrwja80001iy9qc9sb1vkh",
    ];

    const orphanProfiles = await prisma.profile.findMany({
      where: { id: { in: orphanProfileIds } },
      select: { id: true, userId: true },
    });
    const orphanProfileUserIds = orphanProfiles.map((p) => p.userId);

    const allTestUserIds = [
      ...new Set([
        ...testMutualIds,
        ...testProfileUserIds,
        ...testEmailUserIds,
        ...orphanProfileUserIds,
      ]),
    ];

    if (allTestUserIds.length > 0) {
      await prisma.reaction.deleteMany({
        where: {
          OR: [{ fromId: { in: allTestUserIds } }, { toId: { in: allTestUserIds } }],
        },
      });

      await prisma.match.deleteMany({
        where: {
          OR: [{ userAId: { in: allTestUserIds } }, { userBId: { in: allTestUserIds } }],
        },
      });

      await prisma.letter.deleteMany({
        where: {
          OR: [{ fromUserId: { in: allTestUserIds } }, { toUserId: { in: allTestUserIds } }],
        },
      });

      await prisma.block.deleteMany({
        where: {
          OR: [{ fromId: { in: allTestUserIds } }, { toId: { in: allTestUserIds } }],
        },
      });

      await prisma.refreshToken.deleteMany({
        where: { userId: { in: allTestUserIds } },
      });

      await prisma.photo.deleteMany({
        where: { userId: { in: allTestUserIds } },
      });

      await prisma.pet.deleteMany({
        where: { userId: { in: allTestUserIds } },
      });

      await prisma.wallet.deleteMany({
        where: { userId: { in: allTestUserIds } },
      });

      await prisma.userSettings.deleteMany({
        where: { userId: { in: allTestUserIds } },
      });

      await prisma.profile.deleteMany({
        where: { userId: { in: allTestUserIds } },
      });

      await prisma.user.deleteMany({
        where: { id: { in: allTestUserIds } },
      });
    }

    // CRITICAL: Delete orphan profiles DIRECTLY by ID
    await prisma.profile.deleteMany({
      where: { id: { in: orphanProfileIds } },
    });

    cleanupCounts.brokenMatchesDeleted = await prisma.match
      .deleteMany({
        where: { status: { in: ["BROKEN", "GHOSTED", "BLOCKED"] } },
      })
      .then((r) => r.count);

    // Step 2: Create fresh test accounts
    const timestamp = Date.now();
    const userAId = `test-mutual-a-${timestamp}`;
    const userBId = `test-mutual-b-${timestamp}`;
    const emailA = `test.mutual.a.${timestamp}@jeutaime.test`;
    const emailB = `test.mutual.b.${timestamp}@jeutaime.test`;
    const pseudoA = `test_mutual_a_${timestamp}`;
    const pseudoB = `test_mutual_b_${timestamp}`;

    const passwordHashA = await hashPassword(`test-a-${timestamp}`);
    const passwordHashB = await hashPassword(`test-b-${timestamp}`);

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

    // Step 3: Check discovery for both accounts
    const discoveryA = await prisma.profile.count({
      where: {
        userId: { notIn: [userAId, userBId] },
        user: { isBanned: false, settings: { showInDiscovery: true } },
      },
    });

    const discoveryB = await prisma.profile.count({
      where: {
        userId: { notIn: [userAId, userBId] },
        user: { isBanned: false, settings: { showInDiscovery: true } },
      },
    });

    const verdict = discoveryA === 1 && discoveryB === 1 ? "✅ PASS" : "⚠️ FAIL";

    res.json({
      status: "success",
      verdict,
      cleanup: cleanupCounts,
      testAccounts: {
        userA: {
          id: userA.id,
          email: userA.email,
          pseudo: userA.profile?.pseudo,
        },
        userB: {
          id: userB.id,
          email: userB.email,
          pseudo: userB.profile?.pseudo,
        },
      },
      discovery: {
        countA: discoveryA,
        countB: discoveryB,
        expected: 1,
        verdict,
      },
    });
  } catch (error) {
    console.error("[test/verify-mutual-smile-discovery] Error:", error);
    res.status(500).json({
      error: "Verification failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.get("/verify-mutual-smile-discovery", verifyMutualSmileDiscoveryHandler);

/**
 * DIAGNOSTIC: Identify the 3 known orphan profiles
 */
const identifyOrphanProfilesExactHandler = asyncHandler(async (_req: Request, res: Response) => {
  const nodeEnv = process.env.NODE_ENV || "development";
  const isRenderStaging = process.env.RENDER_SERVICE_NAME === "jeutaime-staging";
  const allowTestEndpoints = process.env.ALLOW_TEST_ENDPOINTS === "true";

  if (nodeEnv === "production" && !isRenderStaging && !allowTestEndpoints) {
    return res.status(403).json({ error: "Test endpoint disabled in production" });
  }

  // Known orphan profile IDs
  const orphanProfileIds = [
    "cmp6yvp0h000511ip6beq6xqr",
    "cmp6wyz62000111ip6f7t8uge",
    "cmpdrwja80001iy9qc9sb1vkh",
  ];

  try {
    const profiles = await prisma.profile.findMany({
      where: { id: { in: orphanProfileIds } },
      select: {
        id: true,
        userId: true,
        pseudo: true,
      },
    });

    const results = await Promise.all(
      profiles.map(async (profile) => {
        const user = await prisma.user.findUnique({
          where: { id: profile.userId },
          select: {
            email: true,
            createdAt: true,
            settings: { select: { showInDiscovery: true } },
          },
        });

        return {
          profileId: profile.id,
          userId: profile.userId,
          email: user?.email,
          pseudo: profile.pseudo,
          createdAt: user?.createdAt,
          showInDiscovery: user?.settings?.showInDiscovery,
        };
      })
    );

    res.json({
      status: "success",
      orphanProfiles: results,
      userIdsToDelete: results.map((r) => r.userId),
    });
  } catch (error) {
    console.error("[test/identify-orphan-exact] Error:", error);
    res.status(500).json({
      error: "Failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.get("/identify-orphan-exact", identifyOrphanProfilesExactHandler);

export default router;

import { Router, Request, Response } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { hashPassword } from "../../core/utils/hash";
import * as authService from "../auth/auth.service";
import { execSync } from "child_process";
import { OfferingCategory, SalonKind, Gender } from "@prisma/client";

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

      // Delete offerings sent
      await prisma.offeringSent.deleteMany({
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
              questions: {
                create: [
                  {
                    questionId: "test_q1",
                    questionText: "Quel est votre hobby préféré?",
                    answer: "Lire des livres",
                    wrongAnswers: ["Regarder la télé", "Jouer aux jeux vidéo"],
                  },
                  {
                    questionId: "test_q2",
                    questionText: "Quel type de vacances préférez-vous?",
                    answer: "À la montagne",
                    wrongAnswers: ["À la plage", "En ville"],
                  },
                  {
                    questionId: "test_q3",
                    questionText: "Quel est votre repas préféré?",
                    answer: "Pâtes",
                    wrongAnswers: ["Pizza", "Sushi"],
                  },
                ],
              },
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
              questions: {
                create: [
                  {
                    questionId: "test_q1",
                    questionText: "Quel est votre hobby préféré?",
                    answer: "Lire des livres",
                    wrongAnswers: ["Regarder la télé", "Jouer aux jeux vidéo"],
                  },
                  {
                    questionId: "test_q2",
                    questionText: "Quel type de vacances préférez-vous?",
                    answer: "À la montagne",
                    wrongAnswers: ["À la plage", "En ville"],
                  },
                  {
                    questionId: "test_q3",
                    questionText: "Quel est votre repas préféré?",
                    answer: "Pâtes",
                    wrongAnswers: ["Pizza", "Sushi"],
                  },
                ],
              },
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

    // Verify ProfileQuestions were created
    const profileQuestionsA = await prisma.profileQuestion.findMany({
      where: { profileId: userA.profile?.id },
      select: { id: true, questionText: true },
    });

    const profileQuestionsB = await prisma.profileQuestion.findMany({
      where: { profileId: userB.profile?.id },
      select: { id: true, questionText: true },
    });

    console.log("[test/reset-mutual-smile] ProfileQuestions created:", {
      userAId: userA.id,
      profileAId: userA.profile?.id,
      profileQuestionsACount: profileQuestionsA.length,
      profileQuestionsA: profileQuestionsA.map((q) => ({ id: q.id, text: q.questionText })),
      userBId: userB.id,
      profileBId: userB.profile?.id,
      profileQuestionsBCount: profileQuestionsB.length,
      profileQuestionsB: profileQuestionsB.map((q) => ({ id: q.id, text: q.questionText })),
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
 * DANGEROUS STAGING/DEV CLEANUP ENDPOINT
 * POST /api/test/cleanup-staging-debug-data
 *
 * STAGING & DEVELOPMENT ONLY - Prepares discovery for test by:
 * 1. Deletes all test-mutual-* users and their data (temporary test accounts)
 * 2. Deletes all profiles matching test_mutual_% pattern
 * 3. Deletes all users with .test email pattern
 * 4. Hides ALL other profiles from discovery (showInDiscovery=false)
 *    - Keeps REAL staging accounts in DB but invisible
 *    - Only test-mutual-* created by reset-mutual-smile are visible
 * 5. Deletes all BROKEN/GHOSTED/BLOCKED matches
 *
 * This ensures Discovery shows ONLY the fresh test accounts.
 * NEVER RUNS ON PRODUCTION.
 */
const cleanupStagingHandler = asyncHandler(async (_req: Request, res: Response) => {
  const nodeEnv = process.env.NODE_ENV || "development";
  const isRenderStaging = process.env.RENDER_SERVICE_NAME === "jeutaime-staging";

  // SAFETY: Only allow in staging or development
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
      offeringsSentDeleted: 0,
      refreshTokensDeleted: 0,
      walletsDeleted: 0,
      settingsDeleted: 0,
      photosDeleted: 0,
      petsDeleted: 0,
      blocksDeleted: 0,
      brokenMatchesDeleted: 0,
      profilesHiddenFromDiscovery: 0,
    };

    // 1. Find test-mutual-* users (temporary test accounts to DELETE)
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

    // All test users to DELETE (test-mutual + test profiles + test emails)
    const allTestUserIds = [
      ...new Set([
        ...testMutualIds,
        ...testProfileUserIds,
        ...testEmailUserIds,
      ]),
    ];

    // 4. DELETE all test users and their data
    if (allTestUserIds.length > 0) {
      console.log(`[cleanup-staging] Deleting ${allTestUserIds.length} test users...`);

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

      counts.offeringsSentDeleted = await prisma.offeringSent.deleteMany({
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

      console.log(`[cleanup-staging] Deleted ${allTestUserIds.length} test users and their data`);
    }

    // 5. HIDE ALL OTHER PROFILES FROM DISCOVERY
    // Set showInDiscovery=false for all profiles EXCEPT test-mutual-*
    const stagingProfiles = await prisma.profile.findMany({
      where: {
        userId: {
          not: { startsWith: "test-mutual-" },
        },
      },
      select: { userId: true },
    });

    const stagingUserIds = stagingProfiles.map((p) => p.userId);
    console.log(`[cleanup-staging] Found ${stagingUserIds.length} staging/real profiles to hide from discovery`);

    if (stagingUserIds.length > 0) {
      counts.profilesHiddenFromDiscovery = await prisma.userSettings.updateMany({
        where: { userId: { in: stagingUserIds } },
        data: { showInDiscovery: false },
      }).then((r) => r.count);

      console.log(`[cleanup-staging] Hidden ${counts.profilesHiddenFromDiscovery} profiles from discovery`);
    }

    // 6. Delete BROKEN/GHOSTED/BLOCKED matches (ALL users, for data integrity)
    counts.brokenMatchesDeleted = await prisma.match.deleteMany({
      where: { status: { in: ["BROKEN", "GHOSTED", "BLOCKED"] } },
    }).then((r) => r.count);

    console.log("[cleanup-staging] Cleanup complete:", counts);

    res.json({
      status: "success",
      message: "Staging data cleanup completed - discovery reset for test accounts only",
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

/**
 * DEBUG DISCOVERY PROFILES
 * GET /api/test/debug-discovery-profiles
 *
 * Returns EXACT profiles visible in Discovery (showInDiscovery=true)
 * with all join info to understand the data structure.
 *
 * This shows why orphan profiles are still visible in Discovery
 * and why cleanup can't find them.
 */
const debugDiscoveryProfilesHandler = asyncHandler(async (_req: Request, res: Response) => {
  const nodeEnv = process.env.NODE_ENV || "development";
  const isRenderStaging = process.env.RENDER_SERVICE_NAME === "jeutaime-staging";
  const allowTestEndpoints = process.env.ALLOW_TEST_ENDPOINTS === "true";

  if (nodeEnv === "production" && !isRenderStaging && !allowTestEndpoints) {
    return res.status(403).json({ error: "Test endpoint disabled in production" });
  }

  try {
    console.log("[debug-discovery] Starting discovery profiles debug...");

    // Get all profiles where user.settings.showInDiscovery = true
    const discoveryProfiles = await prisma.profile.findMany({
      where: {
        user: {
          settings: {
            showInDiscovery: true,
          },
        },
      },
      select: {
        id: true,
        userId: true,
        pseudo: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            createdAt: true,
            isBanned: true,
            settings: {
              select: {
                showInDiscovery: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    console.log(`[debug-discovery] Found ${discoveryProfiles.length} profiles with showInDiscovery=true`);

    // Count all profiles by showInDiscovery flag
    const countByFlag = await prisma.userSettings.groupBy({
      by: ["showInDiscovery"],
      _count: {
        userId: true,
      },
    });

    // Map the results to proper format with all requested fields
    const formattedProfiles = discoveryProfiles.map((profile) => ({
      profile_id: profile.id,
      profile_userId: profile.userId,
      user_id: profile.user.id,
      email: profile.user.email,
      pseudo: profile.pseudo,
      showInDiscovery: profile.user.settings?.showInDiscovery,
      createdAt: profile.user.createdAt.toISOString(),
      isBanned: profile.user.isBanned,
    }));

    // Check for the specific orphan IDs
    const orphanIds = [
      "cmp6yvp0h000511ip6beq6xqr",
      "cmp6wyz62000111ip6f7t8uge",
      "cmpdrwja80001iy9qc9sb1vkh",
    ];

    const orphansInDiscovery = formattedProfiles.filter((p) => orphanIds.includes(p.profile_id));

    console.log(`[debug-discovery] Orphan profiles in discovery: ${orphansInDiscovery.length}`);
    orphansInDiscovery.forEach((p) => {
      console.log(`[debug-discovery] ORPHAN FOUND: ${p.profile_id} | ${p.email} | ${p.pseudo}`);
    });

    res.json({
      status: "success",
      message: "Discovery profiles debug",
      counts: {
        total_discovery_profiles: formattedProfiles.length,
        profiles_by_showInDiscovery_flag: countByFlag,
        orphans_in_discovery: orphansInDiscovery.length,
      },
      tables_used: [
        "Profile",
        "User",
        "UserSettings",
      ],
      discovery_profiles: formattedProfiles,
      orphans_found: orphansInDiscovery,
    });
  } catch (error) {
    console.error("[debug-discovery] Error:", error);
    res.status(500).json({
      error: "Debug failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.get("/debug-discovery-profiles", debugDiscoveryProfilesHandler);

/**
 * TEST ENDPOINT: LETTER ALTERNATION SYSTEM
 * POST /api/test/test-letter-alternation
 *
 * Tests the letter turn-by-turn system after mutual smile:
 * 1. Create match between two test accounts
 * 2. Verify initiator can send first letter
 * 3. Verify initiator CANNOT send second letter before response
 * 4. Verify non-initiator can respond
 * 5. Verify initiator can send after response
 *
 * FAILS with hard error if alternation rules are broken.
 */

// Type for letter endpoint responses
type LetterTestResponse = {
  data?: { id?: string };
  error?: string;
  message?: string;
};

const testLetterAlternationHandler = asyncHandler(async (_req: Request, res: Response) => {
  const nodeEnv = process.env.NODE_ENV || "development";
  const isRenderStaging = process.env.RENDER_SERVICE_NAME === "jeutaime-staging";
  const allowTestEndpoints = process.env.ALLOW_TEST_ENDPOINTS === "true";

  if (nodeEnv === "production" && !isRenderStaging && !allowTestEndpoints) {
    return res.status(403).json({ error: "Test endpoint disabled in production" });
  }

  try {
    console.log("[test/letter-alternation] Starting letter alternation test...");

    // 1. Create two fresh test accounts
    const timestamp = Date.now();
    const userAId = `test-letter-a-${timestamp}`;
    const userBId = `test-letter-b-${timestamp}`;
    const emailA = `test.letter.a.${timestamp}@jeutaime.test`;
    const emailB = `test.letter.b.${timestamp}@jeutaime.test`;
    const pseudoA = `test_letter_a_${timestamp}`;
    const pseudoB = `test_letter_b_${timestamp}`;
    const passwordA = `test-a-${timestamp}`;
    const passwordB = `test-b-${timestamp}`;

    const { hashPassword } = await import("../../core/utils/hash");
    const passwordHashA = await hashPassword(passwordA);
    const passwordHashB = await hashPassword(passwordB);

    console.log("[test/letter-alternation] Creating test users...");

    // Create users in transaction
    const [userA, userB] = await Promise.all([
      prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            id: userAId,
            email: emailA,
            passwordHash: passwordHashA,
            isVerified: true,
            profile: {
              create: {
                pseudo: pseudoA,
                gender: "HOMME",
                city: "Paris",
                birthDate: new Date("1990-01-01"),
              },
            },
            settings: {
              create: {
                showInDiscovery: true,
                showPhotoByDefault: true,
              },
            },
            wallet: {
              create: {
                coins: 100,
              },
            },
          },
          include: { profile: true },
        });
        return newUser;
      }),
      prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            id: userBId,
            email: emailB,
            passwordHash: passwordHashB,
            isVerified: true,
            profile: {
              create: {
                pseudo: pseudoB,
                gender: "FEMME",
                city: "Lyon",
                birthDate: new Date("1995-01-01"),
              },
            },
            settings: {
              create: {
                showInDiscovery: true,
                showPhotoByDefault: true,
              },
            },
            wallet: {
              create: {
                coins: 100,
              },
            },
          },
          include: { profile: true },
        });
        return newUser;
      }),
    ]);

    console.log(`[test/letter-alternation] Created users: ${userA.id}, ${userB.id}`);

    // 2. Create a match (A initiated the mutual smile)
    console.log("[test/letter-alternation] Creating match...");
    const match = await prisma.match.create({
      data: {
        userAId: userA.id,
        userBId: userB.id,
        status: "ACTIVE",
        initiatorId: userA.id, // A initiated the smile
      },
    });

    console.log(`[test/letter-alternation] Match created: ${match.id}`);

    // 3. Match lifecycle: B (initiator of smile → match creator) was created with status PENDING
    // A (non-initiator) must accept the match to move it to ACTIVE status
    console.log("[test/letter-alternation] A accepts the match (A is non-initiator)...");
    const acceptResponse = await fetch(
      `http://localhost:${process.env.PORT || 3000}/api/matches/${match.id}/accept`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userA.id}`,
        },
      }
    ).then((r) => r.json() as Promise<LetterTestResponse>);

    if (acceptResponse.error) {
      throw new Error(`[FAIL] A should be able to accept match (A is non-initiator). Response: ${JSON.stringify(acceptResponse)}`);
    }

    console.log(`[test/letter-alternation] ✓ Match accepted by A, status is now ACTIVE`);

    // 4. Before sending letters, both users must answer 3 validation questions
    // A submits answers
    console.log("[test/letter-alternation] Step 4a: A submits question answers...");
    const questionsA = await fetch(
      `http://localhost:${process.env.PORT || 3000}/api/matches/${match.id}/questions`,
      {
        method: "GET",
        headers: { "Authorization": `Bearer ${userA.id}` },
      }
    ).then((r) => r.json() as Promise<any>);

    const answersA = questionsA.data?.questions?.map((q: any) => ({
      profileQuestionId: q.profileQuestionId || q.id,
      answer: "Test answer for question",
    })) || [];

    if (answersA.length < 3) {
      throw new Error(`[FAIL] Expected 3 questions for A, got ${answersA.length}`);
    }

    const submitA = await fetch(
      `http://localhost:${process.env.PORT || 3000}/api/matches/${match.id}/questions/answers`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userA.id}`,
        },
        body: JSON.stringify({ answers: answersA }),
      }
    ).then((r) => r.json() as Promise<LetterTestResponse>);

    if (submitA.error) {
      throw new Error(`[FAIL] A should be able to submit answers. Response: ${JSON.stringify(submitA)}`);
    }
    console.log(`[test/letter-alternation] ✓ A submitted answers`);

    // B submits answers
    console.log("[test/letter-alternation] Step 4b: B submits question answers...");
    const questionsB = await fetch(
      `http://localhost:${process.env.PORT || 3000}/api/matches/${match.id}/questions`,
      {
        method: "GET",
        headers: { "Authorization": `Bearer ${userB.id}` },
      }
    ).then((r) => r.json() as Promise<any>);

    const answersB = questionsB.data?.questions?.map((q: any) => ({
      profileQuestionId: q.profileQuestionId || q.id,
      answer: "Test answer for question",
    })) || [];

    if (answersB.length < 3) {
      throw new Error(`[FAIL] Expected 3 questions for B, got ${answersB.length}`);
    }

    const submitB = await fetch(
      `http://localhost:${process.env.PORT || 3000}/api/matches/${match.id}/questions/answers`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userB.id}`,
        },
        body: JSON.stringify({ answers: answersB }),
      }
    ).then((r) => r.json() as Promise<LetterTestResponse>);

    if (submitB.error) {
      throw new Error(`[FAIL] B should be able to submit answers. Response: ${JSON.stringify(submitB)}`);
    }
    console.log(`[test/letter-alternation] ✓ B submitted answers`);

    // 5. A sends first letter (SHOULD SUCCEED - initiator can send first)
    console.log("[test/letter-alternation] Step 5: A sends first letter...");
    const letter1Response = await fetch(
      `http://localhost:${process.env.PORT || 3000}/api/matches/${match.id}/letters`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userA.id}`, // Mock token for test
        },
        body: JSON.stringify({
          content: "Hello B, this is the first message from A",
        }),
      }
    ).then((r) => r.json() as Promise<LetterTestResponse>);

    if (!letter1Response.data?.id) {
      throw new Error(`[FAIL] A should be able to send first letter. Response: ${JSON.stringify(letter1Response)}`);
    }

    console.log(`[test/letter-alternation] ✓ A sent first letter: ${letter1Response.data.id}`);

    // 5. A tries to send second letter (SHOULD FAIL - must wait for B)
    console.log("[test/letter-alternation] Step 6: A tries to send second letter (should FAIL)...");
    const letter2Response = await fetch(
      `http://localhost:${process.env.PORT || 3000}/api/matches/${match.id}/letters`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userA.id}`,
        },
        body: JSON.stringify({
          content: "A tries to send again without waiting",
        }),
      }
    ).then((r) => r.json() as Promise<LetterTestResponse>);

    if (letter2Response.data?.id) {
      throw new Error(`[FAIL] A should NOT be able to send second letter before B responds. Got: ${letter2Response.data.id}`);
    }

    if (!letter2Response.error) {
      throw new Error(`[FAIL] Expected error when A sends twice. Response: ${JSON.stringify(letter2Response)}`);
    }

    console.log(`[test/letter-alternation] ✓ A correctly blocked from sending twice`);

    // 6. B responds (SHOULD SUCCEED - must respond to A's letter)
    console.log("[test/letter-alternation] Step 7: B sends response...");
    const letter3Response = await fetch(
      `http://localhost:${process.env.PORT || 3000}/api/matches/${match.id}/letters`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userB.id}`,
        },
        body: JSON.stringify({
          content: "Hello A, this is B's response",
        }),
      }
    ).then((r) => r.json() as Promise<LetterTestResponse>);

    if (!letter3Response.data?.id) {
      throw new Error(`[FAIL] B should be able to respond. Response: ${JSON.stringify(letter3Response)}`);
    }

    console.log(`[test/letter-alternation] ✓ B sent response: ${letter3Response.data.id}`);

    // 7. A sends again (SHOULD SUCCEED - turn is now A's)
    console.log("[test/letter-alternation] Step 8: A sends second letter after B's response...");
    const letter4Response = await fetch(
      `http://localhost:${process.env.PORT || 3000}/api/matches/${match.id}/letters`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userA.id}`,
        },
        body: JSON.stringify({
          content: "Thanks B, here is my second message",
        }),
      }
    ).then((r) => r.json() as Promise<LetterTestResponse>);

    if (!letter4Response.data?.id) {
      throw new Error(`[FAIL] A should be able to send after B responds. Response: ${JSON.stringify(letter4Response)}`);
    }

    console.log(`[test/letter-alternation] ✓ A sent second letter: ${letter4Response.data.id}`);

    // 8. Cleanup test accounts
    console.log("[test/letter-alternation] Step 9: Cleaning up test accounts...");
    await Promise.all([
      prisma.letter.deleteMany({ where: { OR: [{ fromUserId: userA.id }, { toUserId: userA.id }] } }),
      prisma.letter.deleteMany({ where: { OR: [{ fromUserId: userB.id }, { toUserId: userB.id }] } }),
      prisma.match.deleteMany({ where: { OR: [{ userAId: userA.id }, { userBId: userA.id }] } }),
      prisma.profile.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } }),
      prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } }),
    ]);

    console.log("[test/letter-alternation] Test PASSED ✅");

    res.json({
      status: "success",
      message: "Letter alternation system working correctly",
      test_results: {
        step1_match_accepted: "✅ Match accepted by non-initiator (A)",
        step2_questions_answered: "✅ Both A & B answered validation questions",
        step3_first_letter_sent: "✅ A can send first letter",
        step4_alternation_blocked: "✅ A blocked from sending twice",
        step5_response_allowed: "✅ B can respond",
        step6_turn_alternates: "✅ A can send after B responds",
      },
    });
  } catch (error) {
    console.error("[test/letter-alternation] Test FAILED:", error);
    res.status(400).json({
      status: "fail",
      error: "Letter alternation test failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.post("/test-letter-alternation", testLetterAlternationHandler);

/**
 * DEBUG ENDPOINT: Match Details
 * GET /api/test/debug-match?matchId=...
 *
 * Returns full match details to understand lifecycle and acceptance rules.
 */
const debugMatchHandler = asyncHandler(async (req: Request, res: Response) => {
  const nodeEnv = process.env.NODE_ENV || "development";
  const isRenderStaging = process.env.RENDER_SERVICE_NAME === "jeutaime-staging";
  const allowTestEndpoints = process.env.ALLOW_TEST_ENDPOINTS === "true";

  if (nodeEnv === "production" && !isRenderStaging && !allowTestEndpoints) {
    return res.status(403).json({ error: "Test endpoint disabled in production" });
  }

  const matchId = req.query.matchId as string;
  if (!matchId) {
    return res.status(400).json({ error: "matchId query parameter required" });
  }

  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        userAId: true,
        userBId: true,
        initiatorId: true,
        status: true,
        createdAt: true,
      },
    });

    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    res.json({
      status: "success",
      match: {
        id: match.id,
        userAId: match.userAId,
        userBId: match.userBId,
        initiatorId: match.initiatorId,
        status: match.status,
        createdAt: match.createdAt.toISOString(),
        note: match.initiatorId === match.userAId
          ? "User A is initiator - User B must accept"
          : "User B is initiator - User A must accept",
      },
    });
  } catch (error) {
    console.error("[debug-match] Error:", error);
    res.status(500).json({
      error: "Debug failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.get("/debug-match", debugMatchHandler);

// Test endpoint: Get match questions WITH correct answers (staging/test only)
router.get("/match-questions", async (req: Request, res: Response) => {
  const nodeEnv = process.env.NODE_ENV || "development";
  const isRenderStaging = process.env.RENDER_SERVICE_NAME === "jeutaime-staging";
  const allowTestEndpoints = process.env.ALLOW_TEST_ENDPOINTS === "true";

  if (nodeEnv === "production" && !isRenderStaging && !allowTestEndpoints) {
    return res.status(403).json({ error: "Test endpoint disabled in production" });
  }

  try {
    const { matchId } = req.query as { matchId?: string };

    if (!matchId) {
      return res.status(400).json({
        error: "matchId query parameter is required",
      });
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId as string },
      select: { userAId: true, userBId: true, status: true },
    });

    if (!match) {
      return res.status(404).json({
        error: "Match not found",
        matchId,
      });
    }

    // Return questions from both users (for test debugging)
    const profileA = await prisma.profile.findUnique({
      where: { userId: match.userAId },
      select: { id: true },
    });

    const profileB = await prisma.profile.findUnique({
      where: { userId: match.userBId },
      select: { id: true },
    });

    const questionsA = await prisma.profileQuestion.findMany({
      where: { profileId: profileA?.id },
      select: { id: true, questionId: true, questionText: true, answer: true, wrongAnswers: true },
    });

    const questionsB = await prisma.profileQuestion.findMany({
      where: { profileId: profileB?.id },
      select: { id: true, questionId: true, questionText: true, answer: true, wrongAnswers: true },
    });

    res.json({
      matchId,
      message: "DEBUG ENDPOINT: Shows correct answers for testing",
      userA: {
        userId: match.userAId,
        profileId: profileA?.id,
        questionsCount: questionsA.length,
        questions: questionsA.map((q) => ({
          profileQuestionId: q.id,
          questionId: q.questionId,
          questionText: q.questionText,
          answer: q.answer,
          wrongAnswers: q.wrongAnswers,
        })),
      },
      userB: {
        userId: match.userBId,
        profileId: profileB?.id,
        questionsCount: questionsB.length,
        questions: questionsB.map((q) => ({
          profileQuestionId: q.id,
          questionId: q.questionId,
          questionText: q.questionText,
          answer: q.answer,
          wrongAnswers: q.wrongAnswers,
        })),
      },
    });
  } catch (error) {
    console.error("[test/match-questions] Error:", error);
    res.status(500).json({
      error: "Failed to get match questions",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/test/set-wallet-coins
 *
 * STAGING & DEVELOPMENT ONLY - Sets wallet balance to exact value for deterministic testing.
 * Allows E2E tests to set up premium subscription scenarios without waiting for daily bonuses.
 *
 * Body:
 *   {
 *     "userId": "string",
 *     "coins": number (>= 0)
 *   }
 *
 * Response:
 *   {
 *     "success": true,
 *     "userId": "...",
 *     "coins": number,
 *     "message": "Wallet coins updated"
 *   }
 *
 * Errors:
 *   - 403 if production (not Render staging)
 *   - 400 if userId or coins missing/invalid
 *   - 404 if wallet not found
 */
router.post("/set-wallet-coins", asyncHandler(async (req: Request, res: Response) => {
  const nodeEnv = process.env.NODE_ENV || "development";
  const isRenderStaging = process.env.RENDER_SERVICE_NAME === "jeutaime-staging";

  // SAFETY: Only allow in staging or development
  if (!isRenderStaging && nodeEnv !== "development") {
    return res.status(403).json({ error: "Test endpoint disabled in production" });
  }

  try {
    const { userId, coins } = req.body;

    // Validate inputs
    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ error: "userId is required (string)" });
    }

    if (coins === undefined || typeof coins !== "number" || coins < 0) {
      return res.status(400).json({ error: "coins is required (non-negative number)" });
    }

    // Update wallet
    const wallet = await prisma.wallet.update({
      where: { userId },
      data: { coins },
    });

    console.log(`[test/set-wallet-coins] Updated userId=${userId} to coins=${coins}`);

    res.json({
      success: true,
      userId,
      coins: wallet.coins,
      message: "Wallet coins updated",
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return res.status(404).json({
        error: "Wallet not found",
        message: error.message,
      });
    }
    console.error("[test/set-wallet-coins] Error:", error);
    res.status(500).json({
      error: "Failed to set wallet coins",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}));

/**
 * POST /api/test/set-wallet-lastbonus
 *
 * STAGING & DEVELOPMENT ONLY - Sets lastDailyBonus timestamp to test daily bonus constraint.
 * Allows testing "bonus claimed today" vs "can claim next UTC day" without waiting 24h.
 *
 * Body:
 *   {
 *     "userId": "string",
 *     "lastBonusAt": "ISO 8601 string" or null to reset
 *   }
 *
 * Examples:
 *   - Set to yesterday: "2026-05-28T14:23:45.000Z"
 *   - Reset (allow claim): lastBonusAt: null
 *   - Set to future (prevent claim): "2026-05-30T14:23:45.000Z"
 *
 * Response:
 *   {
 *     "success": true,
 *     "userId": "...",
 *     "lastDailyBonus": "ISO 8601 string" or null,
 *     "message": "Wallet lastDailyBonus updated"
 *   }
 *
 * Errors:
 *   - 403 if production (not Render staging)
 *   - 400 if userId missing or lastBonusAt invalid ISO string
 *   - 404 if wallet not found
 */
router.post("/set-wallet-lastbonus", asyncHandler(async (req: Request, res: Response) => {
  const nodeEnv = process.env.NODE_ENV || "development";
  const isRenderStaging = process.env.RENDER_SERVICE_NAME === "jeutaime-staging";

  // SAFETY: Only allow in staging or development
  if (!isRenderStaging && nodeEnv !== "development") {
    return res.status(403).json({ error: "Test endpoint disabled in production" });
  }

  try {
    const { userId, lastBonusAt } = req.body;

    // Validate inputs
    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ error: "userId is required (string)" });
    }

    // lastBonusAt can be null or valid ISO string
    let parsedDate: Date | null = null;
    if (lastBonusAt !== null && lastBonusAt !== undefined) {
      if (typeof lastBonusAt !== "string") {
        return res.status(400).json({ error: "lastBonusAt must be ISO 8601 string or null" });
      }
      parsedDate = new Date(lastBonusAt);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          error: "Invalid ISO 8601 date",
          example: "2026-05-28T14:23:45.000Z",
        });
      }
    }

    // Update wallet
    const wallet = await prisma.wallet.update({
      where: { userId },
      data: { lastDailyBonus: parsedDate },
    });

    console.log(`[test/set-wallet-lastbonus] Updated userId=${userId} to lastDailyBonus=${parsedDate?.toISOString() ?? "null"}`);

    res.json({
      success: true,
      userId,
      lastDailyBonus: wallet.lastDailyBonus,
      message: "Wallet lastDailyBonus updated",
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return res.status(404).json({
        error: "Wallet not found",
        message: error.message,
      });
    }
    console.error("[test/set-wallet-lastbonus] Error:", error);
    res.status(500).json({
      error: "Failed to set wallet lastDailyBonus",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}));

/**
 * GET /api/test/debug-offerings-catalog
 *
 * STAGING & DEVELOPMENT ONLY - Debug endpoint to inspect offerings catalog state.
 * Returns total count, enabled count, first 5 IDs, and diagnostic info.
 */
router.get("/debug-offerings-catalog", asyncHandler(async (req: Request, res: Response) => {
  const nodeEnv = process.env.NODE_ENV || "development";
  const isRenderStaging = process.env.RENDER_SERVICE_NAME === "jeutaime-staging";

  if (!isRenderStaging && nodeEnv !== "development") {
    return res.status(403).json({ error: "Test endpoint disabled in production" });
  }

  try {
    // Count all offerings (regardless of enabled status)
    const totalCount = await prisma.offeringCatalog.count();

    // Count enabled offerings only
    const enabledCount = await prisma.offeringCatalog.count({
      where: { enabled: true },
    });

    // Get first 5 enabled offerings
    const firstFive = await prisma.offeringCatalog.findMany({
      where: { enabled: true },
      take: 5,
      orderBy: [{ category: "asc" }, { stackPriority: "desc" }, { cost: "asc" }],
      select: { id: true, name: true, cost: true, enabled: true },
    });

    // Get count by category
    const byCategory = await Promise.all(
      Object.values(OfferingCategory).map(async (cat) => ({
        category: cat,
        count: await prisma.offeringCatalog.count({ where: { category: cat as OfferingCategory } }),
      }))
    );

    // Get disabled offerings
    const disabledCount = await prisma.offeringCatalog.count({
      where: { enabled: false },
    });
    const disabledOfferings = await prisma.offeringCatalog.findMany({
      where: { enabled: false },
      select: { id: true, name: true, enabled: true },
    });

    console.log(`[test/debug-offerings-catalog] Total: ${totalCount}, Enabled: ${enabledCount}, Disabled: ${disabledCount}`);

    res.json({
      diagnostic: {
        totalCount,
        enabledCount,
        disabledCount,
        byCategory,
        firstFiveEnabled: firstFive,
        disabledOfferings,
        message: enabledCount === 0 ? "⚠️ NO OFFERINGS - catalog is empty!" : "✅ Offerings present",
      },
    });
  } catch (error) {
    console.error("[test/debug-offerings-catalog] Error:", error);
    res.status(500).json({
      error: "Debug failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}));

/**
 * POST /api/test/seed-offerings-catalog
 *
 * STAGING & DEVELOPMENT ONLY - Idempotently seed the 16 offerings catalog.
 * If offerings already exist, updates them. If not, creates them.
 * Safe to call multiple times.
 */
router.post("/seed-offerings-catalog", asyncHandler(async (req: Request, res: Response) => {
  const nodeEnv = process.env.NODE_ENV || "development";
  const isRenderStaging = process.env.RENDER_SERVICE_NAME === "jeutaime-staging";

  if (!isRenderStaging && nodeEnv !== "development") {
    return res.status(403).json({ error: "Test endpoint disabled in production" });
  }

  try {
    const offerings = [
      // Boissons
      { id: "off_cafe",          emoji: "☕",  name: "Café",              cost: 20,  category: OfferingCategory.BOISSON,    durationMs: null,      stackPriority: 1, salonOnly: null as SalonKind | null },
      { id: "off_the",           emoji: "🍵",  name: "Thé",               cost: 15,  category: OfferingCategory.BOISSON,    durationMs: null,      stackPriority: 1, salonOnly: null },
      { id: "off_jus",           emoji: "🥤",  name: "Jus de fruits",     cost: 25,  category: OfferingCategory.BOISSON,    durationMs: null,      stackPriority: 1, salonOnly: null },
      { id: "off_champagne",     emoji: "🥂",  name: "Champagne",         cost: 200, category: OfferingCategory.BOISSON,    durationMs: null,      stackPriority: 2, salonOnly: null },
      { id: "off_biere",         emoji: "🍺",  name: "Bière pression",    cost: 30,  category: OfferingCategory.BOISSON,    durationMs: null,      stackPriority: 1, salonOnly: SalonKind.METAL },
      // Nourriture
      { id: "off_croissant",     emoji: "🥐",  name: "Croissant",         cost: 25,  category: OfferingCategory.NOURRITURE, durationMs: null,      stackPriority: 1, salonOnly: null },
      { id: "off_macaron",       emoji: "🍪",  name: "Macaron",           cost: 40,  category: OfferingCategory.NOURRITURE, durationMs: null,      stackPriority: 1, salonOnly: null },
      { id: "off_gateau",        emoji: "🎂",  name: "Gâteau d'anniversaire", cost: 120, category: OfferingCategory.NOURRITURE, durationMs: null,  stackPriority: 2, salonOnly: null },
      { id: "off_eclair",        emoji: "⚡",  name: "Éclairs",           cost: 35,  category: OfferingCategory.NOURRITURE, durationMs: null,      stackPriority: 1, salonOnly: SalonKind.METAL },
      // Symboliques
      { id: "off_rose",          emoji: "🌹",  name: "Rose rouge",        cost: 50,  category: OfferingCategory.SYMBOLIQUE, durationMs: 86400000,  stackPriority: 3, salonOnly: null },
      { id: "off_bouquet",       emoji: "💐",  name: "Bouquet de fleurs", cost: 100, category: OfferingCategory.SYMBOLIQUE, durationMs: 86400000,  stackPriority: 3, salonOnly: null },
      { id: "off_coeur",         emoji: "💝",  name: "Coeur en or",       cost: 150, category: OfferingCategory.SYMBOLIQUE, durationMs: 86400000,  stackPriority: 4, salonOnly: null },
      { id: "off_guitare",       emoji: "🎸",  name: "Guitare cassée",    cost: 80,  category: OfferingCategory.SYMBOLIQUE, durationMs: null,      stackPriority: 2, salonOnly: SalonKind.METAL },
      // Humour
      { id: "off_tarte",         emoji: "🥧",  name: "Tarte à la crème",  cost: 30,  category: OfferingCategory.HUMOUR,     durationMs: null,      stackPriority: 1, salonOnly: null },
      { id: "off_chaussette",    emoji: "🧦",  name: "Chaussette dépareillée", cost: 10, category: OfferingCategory.HUMOUR, durationMs: null,     stackPriority: 0, salonOnly: null },
    ];

    let created = 0;
    let updated = 0;

    for (const off of offerings) {
      const result = await prisma.offeringCatalog.upsert({
        where: { id: off.id },
        update: {
          emoji: off.emoji,
          name: off.name,
          cost: off.cost,
          category: off.category,
          durationMs: off.durationMs,
          stackPriority: off.stackPriority,
          salonOnly: off.salonOnly,
          enabled: true,
        },
        create: {
          id: off.id,
          emoji: off.emoji,
          name: off.name,
          cost: off.cost,
          category: off.category,
          durationMs: off.durationMs,
          stackPriority: off.stackPriority,
          salonOnly: off.salonOnly,
          enabled: true,
        },
      });

      // Check if this was a create or update (hacky but works)
      const wasCreated = !await prisma.offeringCatalog.findUnique({
        where: { id: off.id },
        select: { id: true },
      }).then(() => true).catch(() => false);

      if (wasCreated) created++;
      else updated++;
    }

    const finalCount = await prisma.offeringCatalog.count({
      where: { enabled: true },
    });

    console.log(`[test/seed-offerings-catalog] Seeded ${offerings.length} offerings (final count: ${finalCount})`);

    res.json({
      success: true,
      seeded: offerings.length,
      finalEnabledCount: finalCount,
      message: `Catalog seeded/updated with ${offerings.length} offerings`,
    });
  } catch (error) {
    console.error("[test/seed-offerings-catalog] Error:", error);
    res.status(500).json({
      error: "Seed failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}));

/**
 * POST /api/test/reset-test-users
 *
 * STAGING & DEVELOPMENT ONLY
 *
 * Resets test user population:
 * 1. Deletes old test-mutual-a/b temporary accounts
 * 2. Preserves: TestUser (test@jeutaime.com) and Doudou (doudou453@hotmail.fr)
 * 3. Creates 10 new test accounts with complete profiles
 *
 * Returns summary of operations performed.
 */
router.post("/reset-test-users", asyncHandler(async (_req: Request, res: Response) => {
  const nodeEnv = process.env.NODE_ENV || "development";
  const isRenderStaging = process.env.RENDER_SERVICE_NAME === "jeutaime-staging";
  const allowTestEndpoints = process.env.ALLOW_TEST_ENDPOINTS === "true";

  if (nodeEnv === "production" && !isRenderStaging && !allowTestEndpoints) {
    return res.status(403).json({ error: "Test endpoint disabled in production" });
  }

  const PRESERVE_USERS = [
    "test@jeutaime.com",
    "doudou453@hotmail.fr",
  ];

  const NEW_TEST_USERS = [
    { email: "testuser2@jeutaime.test", pseudo: "testuser2", gender: "HOMME" as Gender, city: "Lyon", bio: "Passionné par les voyages et les rencontres authentiques" },
    { email: "testuser3@jeutaime.test", pseudo: "testuser3", gender: "FEMME" as Gender, city: "Marseille", bio: "Amoureuse de musique, de culture et de belles discussions" },
    { email: "testuser4@jeutaime.test", pseudo: "testuser4", gender: "HOMME" as Gender, city: "Toulouse", bio: "Sportif, aventurier, j'aime les gens authentiques" },
    { email: "testuser5@jeutaime.test", pseudo: "testuser5", gender: "FEMME" as Gender, city: "Bordeaux", bio: "Créative, artiste, toujours en quête d'inspiration" },
    { email: "testuser6@jeutaime.test", pseudo: "testuser6", gender: "HOMME" as Gender, city: "Nice", bio: "Entrepreneur passionné, aimant discuter de projets et rêves" },
    { email: "testuser7@jeutaime.test", pseudo: "testuser7", gender: "FEMME" as Gender, city: "Nantes", bio: "Professionnelle dynamique cherchant une relation sérieuse" },
    { email: "testuser8@jeutaime.test", pseudo: "testuser8", gender: "HOMME" as Gender, city: "Strasbourg", bio: "Curieux de nature, j'aime apprendre et partager" },
    { email: "testuser9@jeutaime.test", pseudo: "testuser9", gender: "FEMME" as Gender, city: "Lille", bio: "Optimiste, rieuse, amie sincère avant tout" },
    { email: "testuser10@jeutaime.test", pseudo: "testuser10", gender: "HOMME" as Gender, city: "Rennes", bio: "Amoureux de la nature et des rencontres sincères" },
    { email: "testuser11@jeutaime.test", pseudo: "testuser11", gender: "FEMME" as Gender, city: "Montpellier", bio: "Passionnée par la vie, toujours souriante et enthousiaste" },
  ];

  try {
    console.log("[test/reset-test-users] Starting reset...");

    // 1. Find test-mutual-* users
    const testMutualUsers = await prisma.user.findMany({
      where: {
        OR: [
          { id: { startsWith: "test-mutual-a-" } },
          { id: { startsWith: "test-mutual-b-" } },
        ],
      },
      select: { id: true, email: true },
    });

    const userIdsToDelete = testMutualUsers.map((u) => u.id);
    console.log(`[test/reset-test-users] Found ${userIdsToDelete.length} test-mutual-* accounts to delete`);

    // 1b. Also find and delete old testuser2-testuser11 if they exist
    const oldTestUsers = await prisma.user.findMany({
      where: {
        email: { in: ["testuser2@jeutaime.test", "testuser3@jeutaime.test", "testuser4@jeutaime.test", "testuser5@jeutaime.test", "testuser6@jeutaime.test", "testuser7@jeutaime.test", "testuser8@jeutaime.test", "testuser9@jeutaime.test", "testuser10@jeutaime.test", "testuser11@jeutaime.test"] },
      },
      select: { id: true, email: true },
    });

    const oldTestUserIds = oldTestUsers.map((u) => u.id);
    if (oldTestUserIds.length > 0) {
      console.log(`[test/reset-test-users] Found ${oldTestUserIds.length} old testuser2-testuser11 accounts to delete`);
      userIdsToDelete.push(...oldTestUserIds);
    }

    // 2. Verify preserve users exist
    const preservedUsers = await prisma.user.findMany({
      where: { email: { in: PRESERVE_USERS } },
      select: { id: true, email: true },
    });

    if (preservedUsers.length !== PRESERVE_USERS.length) {
      const missing = PRESERVE_USERS.filter(
        (email) => !preservedUsers.find((u) => u.email === email)
      );
      throw new Error(`Missing preservation users: ${missing.join(", ")}`);
    }

    console.log(`[test/reset-test-users] Verified ${preservedUsers.length} preserve accounts`);

    // 3. Delete old test accounts
    if (userIdsToDelete.length > 0) {
      await prisma.reaction.deleteMany({
        where: { OR: [{ fromId: { in: userIdsToDelete } }, { toId: { in: userIdsToDelete } }] },
      });
      await prisma.match.deleteMany({
        where: {
          OR: [{ userAId: { in: userIdsToDelete } }, { userBId: { in: userIdsToDelete } }],
        },
      });
      await prisma.letter.deleteMany({
        where: {
          OR: [{ fromUserId: { in: userIdsToDelete } }, { toUserId: { in: userIdsToDelete } }],
        },
      });
      await prisma.offeringSent.deleteMany({
        where: {
          OR: [{ fromUserId: { in: userIdsToDelete } }, { toUserId: { in: userIdsToDelete } }],
        },
      });
      await prisma.block.deleteMany({
        where: {
          OR: [{ fromId: { in: userIdsToDelete } }, { toId: { in: userIdsToDelete } }],
        },
      });
      await prisma.refreshToken.deleteMany({
        where: { userId: { in: userIdsToDelete } },
      });
      await prisma.photo.deleteMany({
        where: { userId: { in: userIdsToDelete } },
      });
      await prisma.pet.deleteMany({
        where: { userId: { in: userIdsToDelete } },
      });
      await prisma.wallet.deleteMany({
        where: { userId: { in: userIdsToDelete } },
      });
      await prisma.userSettings.deleteMany({
        where: { userId: { in: userIdsToDelete } },
      });
      await prisma.profile.deleteMany({
        where: { userId: { in: userIdsToDelete } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: userIdsToDelete } },
      });

      console.log(`[test/reset-test-users] Deleted ${userIdsToDelete.length} test accounts`);
    }

    // 4. Create new test users
    const created = [];
    for (const testUser of NEW_TEST_USERS) {
      const passwordHash = await hashPassword(`${testUser.pseudo}-2024`);

      const newUser = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: testUser.email,
            passwordHash,
            isVerified: true,
            role: "USER",
            profile: {
              create: {
                pseudo: testUser.pseudo,
                gender: testUser.gender,
                birthDate: new Date("1990-01-01"),
                city: testUser.city,
                bio: testUser.bio,
                interestedIn: [],
                lookingFor: ["RELATION"],
                interests: [],
                physicalDesc: "moyenne",
                avatarConfig: {},
              },
            },
          },
        });

        await tx.userSettings.create({
          data: {
            userId: user.id,
            showInDiscovery: true,
            showPhotoByDefault: true,
          },
        });

        await tx.wallet.create({
          data: {
            userId: user.id,
            coins: 100,
          },
        });

        return user;
      });

      created.push({
        email: newUser.email,
        pseudo: testUser.pseudo,
        userId: newUser.id,
      });
    }

    console.log(`[test/reset-test-users] Created ${created.length} new test accounts`);

    res.json({
      status: "success",
      message: "Test users reset completed",
      summary: {
        deleted: userIdsToDelete.length,
        preserved: preservedUsers.length,
        created: created.length,
        total: preservedUsers.length + created.length,
      },
      preserved_users: preservedUsers.map((u) => ({ email: u.email, id: u.id })),
      created_users: created.map((u) => ({
        email: u.email,
        pseudo: u.pseudo,
        password: `${u.pseudo}-2024`,
        userId: u.userId,
      })),
    });
  } catch (error) {
    console.error("[test/reset-test-users] Error:", error);
    res.status(500).json({
      error: "Reset failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}));

/**
 * TEMPORARY STAGING-ONLY ENDPOINT
 * GET /api/test/reset-test-users
 *
 * Same functionality as POST but accessible via browser/Safari on iPhone
 * ONLY AVAILABLE ON RENDER STAGING - removed before production
 *
 * Use this link on iPhone:
 * https://jeutaime-staging.onrender.com/api/test/reset-test-users
 */
router.get("/reset-test-users", asyncHandler(async (_req: Request, res: Response) => {
  const nodeEnv = process.env.NODE_ENV || "development";
  const isRenderStaging = process.env.RENDER_SERVICE_NAME === "jeutaime-staging";
  const allowTestEndpoints = process.env.ALLOW_TEST_ENDPOINTS === "true";

  // SAFETY: Only allow on Render staging, NOT on production even with allow flag
  if (!isRenderStaging) {
    return res.status(403).json({
      error: "GET reset-test-users only available on Render staging",
      environment: {
        nodeEnv,
        renderService: process.env.RENDER_SERVICE_NAME,
        allowTestEndpoints,
      },
    });
  }

  const PRESERVE_USERS = [
    "test@jeutaime.com",
    "doudou453@hotmail.fr",
  ];

  const NEW_TEST_USERS = [
    { email: "testuser2@jeutaime.test", pseudo: "testuser2", gender: "HOMME" as Gender, city: "Lyon", bio: "Passionné par les voyages et les rencontres authentiques" },
    { email: "testuser3@jeutaime.test", pseudo: "testuser3", gender: "FEMME" as Gender, city: "Marseille", bio: "Amoureuse de musique, de culture et de belles discussions" },
    { email: "testuser4@jeutaime.test", pseudo: "testuser4", gender: "HOMME" as Gender, city: "Toulouse", bio: "Sportif, aventurier, j'aime les gens authentiques" },
    { email: "testuser5@jeutaime.test", pseudo: "testuser5", gender: "FEMME" as Gender, city: "Bordeaux", bio: "Créative, artiste, toujours en quête d'inspiration" },
    { email: "testuser6@jeutaime.test", pseudo: "testuser6", gender: "HOMME" as Gender, city: "Nice", bio: "Entrepreneur passionné, aimant discuter de projets et rêves" },
    { email: "testuser7@jeutaime.test", pseudo: "testuser7", gender: "FEMME" as Gender, city: "Nantes", bio: "Professionnelle dynamique cherchant une relation sérieuse" },
    { email: "testuser8@jeutaime.test", pseudo: "testuser8", gender: "HOMME" as Gender, city: "Strasbourg", bio: "Curieux de nature, j'aime apprendre et partager" },
    { email: "testuser9@jeutaime.test", pseudo: "testuser9", gender: "FEMME" as Gender, city: "Lille", bio: "Optimiste, rieuse, amie sincère avant tout" },
    { email: "testuser10@jeutaime.test", pseudo: "testuser10", gender: "HOMME" as Gender, city: "Rennes", bio: "Amoureux de la nature et des rencontres sincères" },
    { email: "testuser11@jeutaime.test", pseudo: "testuser11", gender: "FEMME" as Gender, city: "Montpellier", bio: "Passionnée par la vie, toujours souriante et enthousiaste" },
  ];

  try {
    console.log("[test/reset-test-users GET] Starting reset from browser...");

    // 1. Find test-mutual-* users
    const testMutualUsers = await prisma.user.findMany({
      where: {
        OR: [
          { id: { startsWith: "test-mutual-a-" } },
          { id: { startsWith: "test-mutual-b-" } },
        ],
      },
      select: { id: true, email: true },
    });

    const userIdsToDelete = testMutualUsers.map((u) => u.id);
    console.log(`[test/reset-test-users GET] Found ${userIdsToDelete.length} test-mutual-* accounts to delete`);

    // 1b. Also find and delete old testuser2-testuser11 if they exist
    const oldTestUsers = await prisma.user.findMany({
      where: {
        email: { in: ["testuser2@jeutaime.test", "testuser3@jeutaime.test", "testuser4@jeutaime.test", "testuser5@jeutaime.test", "testuser6@jeutaime.test", "testuser7@jeutaime.test", "testuser8@jeutaime.test", "testuser9@jeutaime.test", "testuser10@jeutaime.test", "testuser11@jeutaime.test"] },
      },
      select: { id: true, email: true },
    });

    const oldTestUserIds = oldTestUsers.map((u) => u.id);
    if (oldTestUserIds.length > 0) {
      console.log(`[test/reset-test-users GET] Found ${oldTestUserIds.length} old testuser2-testuser11 accounts to delete`);
      userIdsToDelete.push(...oldTestUserIds);
    }

    // 2. Verify preserve users exist
    const preservedUsers = await prisma.user.findMany({
      where: { email: { in: PRESERVE_USERS } },
      select: { id: true, email: true },
    });

    if (preservedUsers.length !== PRESERVE_USERS.length) {
      const missing = PRESERVE_USERS.filter(
        (email) => !preservedUsers.find((u) => u.email === email)
      );
      throw new Error(`Missing preservation users: ${missing.join(", ")}`);
    }

    console.log(`[test/reset-test-users GET] Verified ${preservedUsers.length} preserve accounts`);

    // 3. Delete old test accounts
    if (userIdsToDelete.length > 0) {
      await prisma.reaction.deleteMany({
        where: { OR: [{ fromId: { in: userIdsToDelete } }, { toId: { in: userIdsToDelete } }] },
      });
      await prisma.match.deleteMany({
        where: {
          OR: [{ userAId: { in: userIdsToDelete } }, { userBId: { in: userIdsToDelete } }],
        },
      });
      await prisma.letter.deleteMany({
        where: {
          OR: [{ fromUserId: { in: userIdsToDelete } }, { toUserId: { in: userIdsToDelete } }],
        },
      });
      await prisma.offeringSent.deleteMany({
        where: {
          OR: [{ fromUserId: { in: userIdsToDelete } }, { toUserId: { in: userIdsToDelete } }],
        },
      });
      await prisma.block.deleteMany({
        where: {
          OR: [{ fromId: { in: userIdsToDelete } }, { toId: { in: userIdsToDelete } }],
        },
      });
      await prisma.refreshToken.deleteMany({
        where: { userId: { in: userIdsToDelete } },
      });
      await prisma.photo.deleteMany({
        where: { userId: { in: userIdsToDelete } },
      });
      await prisma.pet.deleteMany({
        where: { userId: { in: userIdsToDelete } },
      });
      await prisma.wallet.deleteMany({
        where: { userId: { in: userIdsToDelete } },
      });
      await prisma.userSettings.deleteMany({
        where: { userId: { in: userIdsToDelete } },
      });
      await prisma.profile.deleteMany({
        where: { userId: { in: userIdsToDelete } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: userIdsToDelete } },
      });

      console.log(`[test/reset-test-users GET] Deleted ${userIdsToDelete.length} test accounts`);
    }

    // 4. Create new test users
    const created = [];
    for (const testUser of NEW_TEST_USERS) {
      const passwordHash = await hashPassword(`${testUser.pseudo}-2024`);

      const newUser = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: testUser.email,
            passwordHash,
            isVerified: true,
            role: "USER",
            profile: {
              create: {
                pseudo: testUser.pseudo,
                gender: testUser.gender,
                birthDate: new Date("1990-01-01"),
                city: testUser.city,
                bio: testUser.bio,
                interestedIn: [],
                lookingFor: ["RELATION"],
                interests: [],
                physicalDesc: "moyenne",
                avatarConfig: {},
              },
            },
          },
        });

        await tx.userSettings.create({
          data: {
            userId: user.id,
            showInDiscovery: true,
            showPhotoByDefault: true,
          },
        });

        await tx.wallet.create({
          data: {
            userId: user.id,
            coins: 100,
          },
        });

        return user;
      });

      created.push({
        email: newUser.email,
        pseudo: testUser.pseudo,
        userId: newUser.id,
      });
    }

    console.log(`[test/reset-test-users GET] Created ${created.length} new test accounts`);

    res.json({
      status: "success",
      message: "Test users reset completed (via GET from browser)",
      method: "GET",
      environment: "Render Staging Only",
      summary: {
        deleted: userIdsToDelete.length,
        preserved: preservedUsers.length,
        created: created.length,
        total: preservedUsers.length + created.length,
      },
      preserved_users: preservedUsers.map((u) => ({ email: u.email, id: u.id })),
      created_users: created.map((u) => ({
        email: u.email,
        pseudo: u.pseudo,
        password: `${u.pseudo}-2024`,
        userId: u.userId,
      })),
    });
  } catch (error) {
    console.error("[test/reset-test-users GET] Error:", error);
    res.status(500).json({
      error: "Reset failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}));

export default router;

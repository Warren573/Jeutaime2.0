import { Router, Request, Response } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { hashPassword, comparePassword } from "../../core/utils/hash";
import { signAccessToken, signRefreshToken } from "../../core/utils/jwt";
import { isPremiumActive } from "../../policies/premium";

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

    // Create User A with profile
    const userA = await prisma.user.create({
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

      // Create User B with profile
      const userB = await prisma.user.create({
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

      // AUDIT: Immediate verification after creation (same request)
      const verifyUserAById = await prisma.user.findUnique({ where: { id: userAId } });
      const verifyUserBById = await prisma.user.findUnique({ where: { id: userBId } });

      const verifyUserAByEmail = await prisma.user.findUnique({ where: { email: emailA } });
      const verifyUserBByEmail = await prisma.user.findUnique({ where: { email: emailB } });

      const verifyProfileA = await prisma.profile.findUnique({ where: { userId: userAId } });
      const verifyProfileB = await prisma.profile.findUnique({ where: { userId: userBId } });

      // AUDIT: Verify password hash works immediately after creation
      const bcryptCompareA = await comparePassword(passwordA, verifyUserAById?.passwordHash || "");
      const bcryptCompareB = await comparePassword(passwordB, verifyUserBById?.passwordHash || "");

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

      console.log("[test/reset-mutual-smile] AUDIT:", {
        dbHost,
        createdUserIds: [userAId, userBId],
        emailsCreated: [emailA, emailB],
        verification: {
          userAById: !!verifyUserAById,
          userAByEmail: !!verifyUserAByEmail,
          profileA: !!verifyProfileA,
          userBById: !!verifyUserBById,
          userBByEmail: !!verifyUserBByEmail,
          profileB: !!verifyProfileB,
        },
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
          dbHost,
          createdUserAId: userAId,
          createdUserBId: userBId,
          emailACreated: emailA,
          emailBCreated: emailB,
          immediate_verification: {
            userA: {
              found_by_id: !!verifyUserAById,
              found_by_email: !!verifyUserAByEmail,
              email_match: verifyUserAByEmail?.email === emailA,
              profile_found: !!verifyProfileA,
            },
            userB: {
              found_by_id: !!verifyUserBById,
              found_by_email: !!verifyUserBByEmail,
              email_match: verifyUserBByEmail?.email === emailB,
              profile_found: !!verifyProfileB,
            },
          },
          password_verification: {
            plainPasswordA: passwordA,
            hashPrefixA: passwordHashA.substring(0, 10),
            bcryptCompareImmediateA: bcryptCompareA,
            plainPasswordB: passwordB,
            hashPrefixB: passwordHashB.substring(0, 10),
            bcryptCompareImmediateB: bcryptCompareB,
          },
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
 * DATABASE CONFIGURATION DIAGNOSTIC
 * GET /api/test/diagnose-db
 *
 * Displays EXACT Prisma configuration at runtime
 */
const diagnoseDbHandler = asyncHandler(async (_req: Request, res: Response) => {
  const nodeEnv = process.env.NODE_ENV || "development";
  const isRenderStaging = process.env.RENDER_SERVICE_NAME === "jeutaime-staging";
  const allowTestEndpoints = process.env.ALLOW_TEST_ENDPOINTS === "true";

  if (nodeEnv === "production" && !isRenderStaging && !allowTestEndpoints) {
    return res.status(403).json({ error: "Test endpoint disabled in production" });
  }

  const dbUrl = process.env.DATABASE_URL || null;

  // Parse DATABASE_URL if present
  let parsed = {
    exists: !!dbUrl,
    length: dbUrl?.length || 0,
    protocol: null as string | null,
    user: null as string | null,
    password: "***",
    host: null as string | null,
    port: null as string | null,
    database: null as string | null,
    rawUrl: dbUrl ? dbUrl.substring(0, 50) + "..." : null,
  };

  if (dbUrl) {
    try {
      // Format: postgresql://user:password@host:port/database
      const url = new URL(dbUrl);
      parsed.protocol = url.protocol;
      parsed.user = url.username || null;
      parsed.host = url.hostname || null;
      parsed.port = url.port || null;
      parsed.database = url.pathname?.substring(1) || null;
    } catch (e) {
      parsed.host = "PARSE_ERROR";
    }
  }

  try {
    // Try to connect and get basic info
    const result = await prisma.$queryRaw`SELECT current_database(), current_user, version()`;
    const dbInfo = (result as any[])[0];

    console.log("[test/diagnose-db] Configuration:", {
      nodeEnv,
      dbUrlExists: !!dbUrl,
      parsedHost: parsed.host,
      connectedDatabase: dbInfo?.current_database,
      connectedUser: dbInfo?.current_user,
    });

    res.json({
      status: "success",
      environment: {
        NODE_ENV: nodeEnv,
        RENDER_SERVICE_NAME: process.env.RENDER_SERVICE_NAME || "not-set",
      },
      database: {
        url_configured: parsed.exists,
        url_length: parsed.length,
        protocol: parsed.protocol,
        user: parsed.user,
        host: parsed.host,
        port: parsed.port,
        database: parsed.database,
      },
      connection: {
        current_database: dbInfo?.current_database || null,
        current_user: dbInfo?.current_user || null,
        postgresql_version: dbInfo?.version ? dbInfo.version.split(",")[0] : null,
      },
    });
  } catch (error) {
    console.error("[test/diagnose-db] Error:", error);
    res.status(500).json({
      status: "error",
      environment: {
        NODE_ENV: nodeEnv,
      },
      database: {
        url_configured: parsed.exists,
        protocol: parsed.protocol,
        host: parsed.host,
        port: parsed.port,
        database: parsed.database,
      },
      connection_error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.get("/diagnose-db", diagnoseDbHandler);

/**
 * LOGIN DEBUG ENDPOINT
 * GET /api/test/debug-login?email=...&password=...
 * POST /api/test/debug-login with { email, password }
 *
 * Step-by-step login verification to identify exact failure point
 */
const debugLoginHandler = asyncHandler(async (req: Request, res: Response) => {
  const nodeEnv = process.env.NODE_ENV || "development";
  const isRenderStaging = process.env.RENDER_SERVICE_NAME === "jeutaime-staging";
  const allowTestEndpoints = process.env.ALLOW_TEST_ENDPOINTS === "true";

  if (nodeEnv === "production" && !isRenderStaging && !allowTestEndpoints) {
    return res.status(403).json({ error: "Test endpoint disabled in production" });
  }

  // Support both GET query params and POST body
  const email = req.query.email || (req.body as any)?.email;
  const password = req.query.password || (req.body as any)?.password;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password required" });
  }

  try {
    const debug = {
      input: {
        email,
        password_length: (password as string).length,
      },
      steps: {} as any,
      result: null as any,
    };

    // Step 1: Find user by email
    console.log("[debug-login] Step 1: Finding user", { email });
    const user = await prisma.user.findUnique({
      where: { email: email as string },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        isVerified: true,
        role: true,
        isBanned: true,
        banReason: true,
        premiumTier: true,
        premiumUntil: true,
      },
    });

    debug.steps.userFound = !!user;
    if (!user) {
      debug.result = "FAILED_USER_NOT_FOUND";
      console.log("[debug-login] Step 1 FAILED: User not found", { email });
      return res.json({ status: "debug", ...debug });
    }
    console.log("[debug-login] Step 1 SUCCESS: User found", { userId: user.id });

    // Step 2: Check verification status
    debug.steps.isVerified = user.isVerified;
    if (!user.isVerified) {
      debug.result = "FAILED_NOT_VERIFIED";
      console.log("[debug-login] Step 2 FAILED: User not verified");
      return res.json({ status: "debug", ...debug });
    }
    console.log("[debug-login] Step 2 SUCCESS: User is verified");

    // Step 3: Check if banned
    debug.steps.isBanned = user.isBanned;
    if (user.isBanned) {
      debug.result = "FAILED_ACCOUNT_BANNED";
      debug.steps.banReason = user.banReason || null;
      console.log("[debug-login] Step 3 FAILED: User is banned", { banReason: user.banReason });
      return res.json({ status: "debug", ...debug });
    }
    console.log("[debug-login] Step 3 SUCCESS: Account not banned");

    // Step 4: Verify password hash exists
    debug.steps.passwordHashExists = !!user.passwordHash;
    if (!user.passwordHash) {
      debug.result = "FAILED_NO_PASSWORD_HASH";
      console.log("[debug-login] Step 4 FAILED: No password hash in database");
      return res.json({ status: "debug", ...debug });
    }
    console.log("[debug-login] Step 4 SUCCESS: Password hash exists");

    // Step 5: Compare password
    console.log("[debug-login] Step 5: Comparing password");
    const passwordMatch = await comparePassword(password as string, user.passwordHash);
    debug.steps.passwordMatch = passwordMatch;
    if (!passwordMatch) {
      debug.result = "FAILED_PASSWORD_MISMATCH";
      console.log("[debug-login] Step 5 FAILED: Password does not match");
      return res.json({ status: "debug", ...debug });
    }
    console.log("[debug-login] Step 5 SUCCESS: Password matches");

    // Step 6: Check premium status
    debug.steps.isPremium = isPremiumActive(user);
    console.log("[debug-login] Step 6 SUCCESS: Premium status checked");

    // Step 7: Create tokens
    console.log("[debug-login] Step 7: Creating tokens");
    try {
      const tokenId = require("crypto").randomUUID();
      const accessToken = signAccessToken({ userId: user.id, role: user.role as never, isPremium: debug.steps.isPremium });
      const refreshToken = signRefreshToken({ userId: user.id, tokenId });

      debug.steps.tokenCreated = true;
      debug.steps.accessTokenLength = accessToken.length;
      debug.steps.refreshTokenLength = refreshToken.length;
      debug.result = "SUCCESS";

      console.log("[debug-login] Step 7 SUCCESS: Tokens created", {
        userId: user.id,
        accessTokenLength: accessToken.length,
      });

      return res.json({
        status: "debug",
        ...debug,
        tokens: {
          access: accessToken.substring(0, 50) + "...",
          refresh: refreshToken.substring(0, 50) + "...",
        },
      });
    } catch (tokenError) {
      debug.result = "FAILED_TOKEN_CREATION";
      debug.steps.tokenError = tokenError instanceof Error ? tokenError.message : String(tokenError);
      console.log("[debug-login] Step 7 FAILED: Token creation error", { error: tokenError });
      return res.json({ status: "debug", ...debug });
    }
  } catch (error) {
    console.error("[debug-login] Unexpected error:", error);
    res.status(500).json({
      status: "error",
      error: "Debug login failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.get("/debug-login", debugLoginHandler);
router.post("/debug-login", debugLoginHandler);

export default router;

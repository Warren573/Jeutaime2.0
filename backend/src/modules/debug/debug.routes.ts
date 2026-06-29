import { Router, Response } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import * as controller from "./debug.controller";

const router = Router();

// GET /api/debug/staging/salons — Check database seeding status (staging only)
router.get(
  "/staging/salons",
  asyncHandler((_req, res: Response) => controller.getStagingStatus(_req, res)),
);

// GET /api/debug/staging/seed-source — Show what seed.ts defines vs what DB has
router.get(
  "/staging/seed-source",
  asyncHandler((_req, res: Response) => controller.getSeedSource(_req, res)),
);

// GET /api/test/reset-test-users — Reset test user accounts
router.get(
  "/test/reset-test-users",
  asyncHandler((_req, res: Response) => controller.resetTestUsers(_req, res)),
);

// POST /api/test/reset-test-users — Execute reset
router.post(
  "/test/reset-test-users",
  asyncHandler((_req, res: Response) => controller.resetTestUsers(_req, res)),
);

// GET /api/test/reset-test-matches — Reset test matches
router.get(
  "/test/reset-test-matches",
  asyncHandler((_req, res: Response) => controller.resetTestMatches(_req, res)),
);

// POST /api/test/reset-test-matches — Execute reset
router.post(
  "/test/reset-test-matches",
  asyncHandler((_req, res: Response) => controller.resetTestMatches(_req, res)),
);

// GET /api/test/reset-test-salons — Reset test salons
router.get(
  "/test/reset-test-salons",
  asyncHandler((_req, res: Response) => controller.resetTestSalons(_req, res)),
);

// POST /api/test/reset-test-salons — Execute reset
router.post(
  "/test/reset-test-salons",
  asyncHandler((_req, res: Response) => controller.resetTestSalons(_req, res)),
);

// GET /api/test/reset-test-coins — Reset test coins
router.get(
  "/test/reset-test-coins",
  asyncHandler((_req, res: Response) => controller.resetTestCoins(_req, res)),
);

// POST /api/test/reset-test-coins — Execute reset
router.post(
  "/test/reset-test-coins",
  asyncHandler((_req, res: Response) => controller.resetTestCoins(_req, res)),
);

export default router;

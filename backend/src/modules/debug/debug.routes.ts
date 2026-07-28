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

// GET /api/debug/schema-drift — Check if database schema matches prisma/schema.prisma (read-only)
router.get(
  "/schema-drift",
  asyncHandler((_req, res: Response) => controller.getSchemaCheck(_req, res)),
);

export default router;

import { Router, Response } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import * as controller from "./debug.controller";

const router = Router();

// GET /api/debug/staging/salons — Check database seeding status (staging only)
router.get(
  "/staging/salons",
  asyncHandler((_req, res: Response) => controller.getStagingStatus(_req, res)),
);

export default router;

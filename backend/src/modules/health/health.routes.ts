import { Router, Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { execSync } from "child_process";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "jeutaime-api" });
});

router.get(
  "/db",
  asyncHandler(async (_req: Request, res: Response) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "connected" });
  }),
);

router.get("/version", (_req: Request, res: Response) => {
  try {
    const sha = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
    const environment = process.env.NODE_ENV || "unknown";
    const timestamp = new Date().toISOString();
    res.json({
      service: "jeutaime-api",
      sha,
      environment,
      timestamp,
      apiUrl: process.env.API_URL || "not-set",
    });
  } catch {
    res.json({
      service: "jeutaime-api",
      sha: "unknown",
      environment: process.env.NODE_ENV || "unknown",
      timestamp: new Date().toISOString(),
      error: "git-not-available",
    });
  }
});

export default router;

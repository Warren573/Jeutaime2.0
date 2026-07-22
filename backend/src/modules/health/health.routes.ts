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
      buildSha: sha,
      buildTime: timestamp,
      environment,
      apiUrl: process.env.API_URL || "not-set",
      instrumentation: "bottle-debug-v1",
      instrumentationDetails: {
        controllerLogging: "B1-B10 steps logged",
        serviceLogging: "S1-S13 steps logged",
        correlationId: "enabled for all bottle creates",
      },
    });
  } catch {
    res.json({
      service: "jeutaime-api",
      buildSha: "unknown",
      buildTime: new Date().toISOString(),
      environment: process.env.NODE_ENV || "unknown",
      error: "git-not-available",
      instrumentation: "bottle-debug-v1",
    });
  }
});

export default router;

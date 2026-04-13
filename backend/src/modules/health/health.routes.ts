import { Router, Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../core/utils/asyncHandler";

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

export default router;

import { Response } from "express";
import { AuthedRequest } from "../../core/types";
import * as svc from "./premium.service";
import type { SubscribePremiumDto } from "./premium.schemas";

// ============================================================
// GET /api/premium/plans
// ============================================================
export async function handleGetPlans(_req: AuthedRequest, res: Response) {
  const plans = svc.getPlans();
  res.json({ data: plans });
}

// ============================================================
// GET /api/premium/me
// ============================================================
export async function handleGetMyStatus(req: AuthedRequest, res: Response) {
  const status = await svc.getMyStatus(req.user.userId);
  res.json({ data: status });
}

// ============================================================
// POST /api/premium/subscribe
// ============================================================
export async function handleSubscribe(req: AuthedRequest, res: Response) {
  const dto = req.body as SubscribePremiumDto;
  const result = await svc.subscribe(req.user.userId, dto);
  res.json({ data: result });
}

// ============================================================
// POST /api/premium/cancel
// ============================================================
export async function handleCancel(req: AuthedRequest, res: Response) {
  const status = await svc.cancel(req.user.userId);
  res.json({ data: status });
}

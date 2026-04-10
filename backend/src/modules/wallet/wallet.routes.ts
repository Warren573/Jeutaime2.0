import { Router, Response } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { validate } from "../../core/middleware/validate";
import { requireAuth } from "../../core/middleware/auth";
import { AuthedRequest } from "../../core/types";
import { ListTransactionsQuerySchema } from "./wallet.schemas";
import * as ctrl from "./wallet.controller";

const router = Router();

router.use(requireAuth as never);

const wrap = (
  fn: (req: AuthedRequest, res: Response) => Promise<void>,
) => asyncHandler((req, res, next) => fn(req as AuthedRequest, res).catch(next));

// GET /api/wallet/me
router.get("/me", wrap(ctrl.handleGetMyWallet));

// GET /api/wallet/me/transactions
router.get(
  "/me/transactions",
  validate(ListTransactionsQuerySchema, "query"),
  wrap(ctrl.handleListMyTransactions),
);

// POST /api/wallet/me/daily-bonus
router.post("/me/daily-bonus", wrap(ctrl.handleClaimDailyBonus));

export default router;

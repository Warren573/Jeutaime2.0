import { Response } from "express";
import { AuthedRequest } from "../../core/types";
import * as svc from "./wallet.service";
import type { ListTransactionsQuery } from "./wallet.schemas";

// ============================================================
// GET /api/wallet/me
// ============================================================
export async function handleGetMyWallet(req: AuthedRequest, res: Response) {
  const wallet = await svc.getMyWallet(req.user.userId);
  res.json({ data: wallet });
}

// ============================================================
// GET /api/wallet/me/transactions
// ============================================================
export async function handleListMyTransactions(
  req: AuthedRequest,
  res: Response,
) {
  const { page, pageSize } = req.query as unknown as ListTransactionsQuery;
  const result = await svc.listMyTransactions(req.user.userId, {
    page,
    pageSize,
  });
  res.json({ data: result.data, meta: result.meta });
}

// ============================================================
// POST /api/wallet/me/daily-bonus
// ============================================================
export async function handleClaimDailyBonus(
  req: AuthedRequest,
  res: Response,
) {
  const result = await svc.claimDailyBonus(req.user.userId);
  res.json({
    data: {
      wallet: result.wallet,
      amount: result.amount,
      transaction: result.transaction,
    },
  });
}

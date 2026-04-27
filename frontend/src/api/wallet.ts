import { apiFetch } from "./client";

export interface WalletDTO {
  userId: string;
  coins: number;
  lastDailyBonus: string | null;
  updatedAt: string;
}

export interface CoinTxnDTO {
  id: string;
  type: string;
  amount: number;
  balance: number;
  meta: unknown;
  createdAt: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

export interface DailyBonusResultDTO {
  wallet: WalletDTO;
  amount: number;
  transaction: CoinTxnDTO;
}

export async function getWallet(): Promise<WalletDTO> {
  const res = (await apiFetch("/wallet/me")) as { data: WalletDTO };
  return res.data;
}

export async function claimDailyBonus(): Promise<DailyBonusResultDTO> {
  const res = (await apiFetch("/wallet/me/daily-bonus", {
    method: "POST",
  })) as { data: DailyBonusResultDTO };
  return res.data;
}

export async function listTransactions(
  page = 1,
  pageSize = 20,
): Promise<{ data: CoinTxnDTO[]; meta: PaginationMeta }> {
  const res = (await apiFetch(
    `/wallet/me/transactions?page=${page}&pageSize=${pageSize}`,
  )) as { data: CoinTxnDTO[]; meta: PaginationMeta };
  return res;
}

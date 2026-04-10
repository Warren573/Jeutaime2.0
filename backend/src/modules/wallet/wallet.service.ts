import { CoinTxnType, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { NotFoundError, UnprocessableError } from "../../core/errors";
import {
  computeCreditBalance,
  computeDebitBalance,
} from "../../policies/wallet";
import {
  canClaimDailyBonus,
  getDailyBonusAmount,
} from "../../policies/dailyBonus";
import { isPremiumActive } from "../../policies/premium";
import { buildMeta, toPrismaSkipTake } from "../../core/utils/pagination";
import type { PaginationMeta, PaginationQuery } from "../../core/types";

// ============================================================
// Types de retour
// ============================================================

export interface WalletDto {
  userId: string;
  coins: number;
  lastDailyBonus: Date | null;
  updatedAt: Date;
}

export interface CoinTxnDto {
  id: string;
  type: CoinTxnType;
  amount: number;
  balance: number;
  meta: Prisma.JsonValue | null;
  createdAt: Date;
}

export interface DailyBonusResult {
  wallet: WalletDto;
  amount: number;
  transaction: CoinTxnDto;
}

// ============================================================
// Helpers internes
// ============================================================

function toWalletDto(w: {
  userId: string;
  coins: number;
  lastDailyBonus: Date | null;
  updatedAt: Date;
}): WalletDto {
  return {
    userId: w.userId,
    coins: w.coins,
    lastDailyBonus: w.lastDailyBonus,
    updatedAt: w.updatedAt,
  };
}

function toTxnDto(t: {
  id: string;
  type: CoinTxnType;
  amount: number;
  balance: number;
  meta: Prisma.JsonValue | null;
  createdAt: Date;
}): CoinTxnDto {
  return {
    id: t.id,
    type: t.type,
    amount: t.amount,
    balance: t.balance,
    meta: t.meta,
    createdAt: t.createdAt,
  };
}

/**
 * Lit le wallet dans une transaction. Lance NotFoundError si absent
 * (invariant : chaque user a un wallet créé à l'inscription).
 */
async function readWalletTx(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<{
  userId: string;
  coins: number;
  lastDailyBonus: Date | null;
  updatedAt: Date;
}> {
  const w = await tx.wallet.findUnique({ where: { userId } });
  if (!w) throw new NotFoundError("Wallet");
  return w;
}

// ============================================================
// debitWallet — atomique : vérifie fonds, décrémente, log txn
// ============================================================

export interface DebitInput {
  userId: string;
  amount: number; // positif
  type: CoinTxnType;
  meta?: Prisma.InputJsonValue;
}

/**
 * Débite le wallet de manière atomique et enregistre une CoinTransaction
 * avec le solde post-débit. Lance NotEnoughCoinsError si insuffisant.
 *
 * Garantit qu'il est IMPOSSIBLE d'avoir un Wallet.coins négatif : toute
 * écriture sur Wallet.coins passe par ici (ou creditWallet).
 */
export async function debitWallet(input: DebitInput): Promise<{
  wallet: WalletDto;
  transaction: CoinTxnDto;
}> {
  const { userId, amount, type, meta } = input;

  return prisma.$transaction(async (tx) => {
    const current = await readWalletTx(tx, userId);

    // Pure : throws NotEnoughCoinsError / BadRequestError si invalide
    const newBalance = computeDebitBalance(current.coins, amount);

    const updated = await tx.wallet.update({
      where: { userId },
      data: { coins: newBalance },
    });

    const txn = await tx.coinTransaction.create({
      data: {
        walletId: userId,
        type,
        amount: -amount, // signé : débit négatif
        balance: newBalance,
        ...(meta !== undefined ? { meta } : {}),
      },
    });

    return {
      wallet: toWalletDto(updated),
      transaction: toTxnDto(txn),
    };
  });
}

// ============================================================
// creditWallet — atomique : incrémente, log txn
// ============================================================

export interface CreditInput {
  userId: string;
  amount: number; // positif
  type: CoinTxnType;
  meta?: Prisma.InputJsonValue;
}

export async function creditWallet(input: CreditInput): Promise<{
  wallet: WalletDto;
  transaction: CoinTxnDto;
}> {
  const { userId, amount, type, meta } = input;

  return prisma.$transaction(async (tx) => {
    const current = await readWalletTx(tx, userId);
    const newBalance = computeCreditBalance(current.coins, amount);

    const updated = await tx.wallet.update({
      where: { userId },
      data: { coins: newBalance },
    });

    const txn = await tx.coinTransaction.create({
      data: {
        walletId: userId,
        type,
        amount,
        balance: newBalance,
        ...(meta !== undefined ? { meta } : {}),
      },
    });

    return {
      wallet: toWalletDto(updated),
      transaction: toTxnDto(txn),
    };
  });
}

// ============================================================
// getMyWallet
// ============================================================

export async function getMyWallet(userId: string): Promise<WalletDto> {
  const w = await prisma.wallet.findUnique({ where: { userId } });
  if (!w) throw new NotFoundError("Wallet");
  return toWalletDto(w);
}

// ============================================================
// listTransactions — pagination
// ============================================================

export async function listMyTransactions(
  userId: string,
  pagination: PaginationQuery,
): Promise<{ data: CoinTxnDto[]; meta: PaginationMeta }> {
  // Invariant : wallet existe — mais on ne le vérifie pas pour éviter
  // une requête inutile. Si absent, on retourne simplement 0 résultats.
  const where = { walletId: userId };

  const [total, rows] = await Promise.all([
    prisma.coinTransaction.count({ where }),
    prisma.coinTransaction.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...toPrismaSkipTake(pagination),
    }),
  ]);

  return {
    data: rows.map(toTxnDto),
    meta: buildMeta(total, pagination),
  };
}

// ============================================================
// claimDailyBonus — 1x/jour UTC, tout en transaction
// ============================================================

export async function claimDailyBonus(
  userId: string,
): Promise<DailyBonusResult> {
  return prisma.$transaction(async (tx) => {
    const wallet = await readWalletTx(tx, userId);

    // Statut premium : on le re-lit en transaction pour être cohérent
    // avec d'éventuelles souscriptions concurrentes (pas critique, mais
    // plus propre que d'hériter du flag baked dans le JWT).
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { premiumTier: true, premiumUntil: true },
    });
    if (!user) throw new NotFoundError("Utilisateur");

    const now = new Date();
    const check = canClaimDailyBonus(wallet.lastDailyBonus, now);
    if (!check.allowed) {
      throw new UnprocessableError(
        "Bonus quotidien déjà réclamé aujourd'hui",
        { reason: check.reason },
      );
    }

    const premium = isPremiumActive(user, now);
    const amount = getDailyBonusAmount(premium);
    const newBalance = computeCreditBalance(wallet.coins, amount);

    const updated = await tx.wallet.update({
      where: { userId },
      data: {
        coins: newBalance,
        lastDailyBonus: now,
      },
    });

    const txn = await tx.coinTransaction.create({
      data: {
        walletId: userId,
        type: CoinTxnType.DAILY_BONUS,
        amount,
        balance: newBalance,
        meta: { isPremium: premium },
      },
    });

    return {
      wallet: toWalletDto(updated),
      amount,
      transaction: toTxnDto(txn),
    };
  });
}


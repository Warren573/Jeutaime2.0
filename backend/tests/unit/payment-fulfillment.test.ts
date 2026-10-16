import { describe, expect, it, vi, beforeEach } from "vitest";

const { receiptFind, receiptClaim, walletUpdate, transactionCreate, transaction } = vi.hoisted(() => ({
  receiptFind: vi.fn(),
  receiptClaim: vi.fn(),
  walletUpdate: vi.fn(),
  transactionCreate: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock("../../src/config/prisma", () => ({
  prisma: { $transaction: transaction },
}));
import { fulfillVerifiedPurchase } from "../../src/modules/premium/payment-fulfillment.service";

describe("verified purchase fulfillment", () => {
  const receipt = {
    id: "receipt-1", userId: "user-1", productId: "coins_500",
    provider: "apple", status: "VERIFIED", verifiedAt: new Date(), fulfilledAt: null,
  };
  beforeEach(() => {
    vi.clearAllMocks();
    transaction.mockImplementation((cb: (tx: unknown) => unknown) =>
      cb({ paymentReceipt: { findUnique: receiptFind, updateMany: receiptClaim },
        wallet: { update: walletUpdate }, coinTransaction: { create: transactionCreate } }));
    receiptFind.mockResolvedValue(receipt);
    receiptClaim.mockResolvedValue({ count: 1 });
    walletUpdate.mockResolvedValue({ coins: 700 });
  });

  it("credits 500 coins and writes the ledger exactly once after a verified receipt", async () => {
    await expect(fulfillVerifiedPurchase("receipt-1")).resolves.toMatchObject({ status: "fulfilled" });
    expect(receiptClaim).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "receipt-1", status: "VERIFIED", fulfilledAt: null }),
    }));
    expect(walletUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: { coins: { increment: 500 } },
    }));
    expect(transactionCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ amount: 500, balance: 700 }),
    }));
  });

  it("refuses unverified and pending receipts", async () => {
    receiptFind.mockResolvedValue({ ...receipt, status: "PENDING", verifiedAt: null });
    await expect(fulfillVerifiedPurchase("receipt-1")).rejects.toThrow("independently verified");
    expect(walletUpdate).not.toHaveBeenCalled();
  });

  it("does not recredit already fulfilled receipts", async () => {
    receiptFind.mockResolvedValue({ ...receipt, status: "FULFILLED", fulfilledAt: new Date() });
    await expect(fulfillVerifiedPurchase("receipt-1")).resolves.toMatchObject({ status: "already_fulfilled" });
    expect(walletUpdate).not.toHaveBeenCalled();
  });

  it("rejects a lost one-time claim without moving money", async () => {
    receiptClaim.mockResolvedValue({ count: 0 });
    await expect(fulfillVerifiedPurchase("receipt-1")).rejects.toThrow("already claimed");
    expect(walletUpdate).not.toHaveBeenCalled();
  });

  it("does not grant subscriptions without renewal verification", async () => {
    receiptFind.mockResolvedValue({ ...receipt, productId: "plus_monthly" });
    await expect(fulfillVerifiedPurchase("receipt-1")).rejects.toThrow("renewal lifecycle");
    expect(walletUpdate).not.toHaveBeenCalled();
  });
});

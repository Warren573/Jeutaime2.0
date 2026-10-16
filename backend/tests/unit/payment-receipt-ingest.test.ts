import { beforeEach, describe, expect, it, vi } from "vitest";
const { findUnique, findUniqueOrThrow, create } = vi.hoisted(() => ({
  findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), create: vi.fn(),
}));
vi.mock("../../src/config/prisma", () => ({
  prisma: { paymentReceipt: { findUnique, findUniqueOrThrow, create } },
}));
import { recordTrustedPurchase } from "../../src/modules/premium/payment-receipt-ingest.service";

describe("trusted provider purchase receipts", () => {
  const purchase = {
    provider: "apple" as const, providerTransactionId: "appstore-123",
    productId: "coins_100", userId: "user1", verifiedAt: new Date("2026-10-15T00:00:00Z"),
  };
  beforeEach(() => { vi.clearAllMocks(); findUnique.mockResolvedValue(null); create.mockResolvedValue({ id: "r1", status: "VERIFIED" }); });

  it("does not persist or fulfill a rejected verification", async () => {
    await expect(recordTrustedPurchase(purchase, async () => false)).rejects.toThrow("Provider verification failed");
    expect(create).not.toHaveBeenCalled();
  });
  it("persists independently validated purchases with a verified timestamp", async () => {
    await expect(recordTrustedPurchase(purchase, async () => true)).resolves.toEqual({ receiptId: "r1", status: "VERIFIED" });
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: "user1", status: "VERIFIED", verifiedAt: purchase.verifiedAt }) });
  });
  it("rejects reuse of a transaction for a different user", async () => {
    findUnique.mockResolvedValue({ id: "old", userId: "user2", productId: "coins_100", status: "FULFILLED" });
    await expect(recordTrustedPurchase(purchase, async () => true)).rejects.toThrow("different account");
    expect(create).not.toHaveBeenCalled();
  });
  it("is idempotent for a matching transaction", async () => {
    findUnique.mockResolvedValue({ id: "old", userId: "user1", productId: "coins_100", status: "FULFILLED" });
    await expect(recordTrustedPurchase(purchase, async () => true)).resolves.toEqual({ receiptId: "old", status: "FULFILLED" });
    expect(create).not.toHaveBeenCalled();
  });
  it("rejects forged product identifiers and empty transaction ids", async () => {
    await expect(recordTrustedPurchase({ ...purchase, productId: "free_money" }, async () => true)).rejects.toThrow("Unknown product");
    await expect(recordTrustedPurchase({ ...purchase, providerTransactionId: " " }, async () => true)).rejects.toThrow("Missing provider");
    expect(create).not.toHaveBeenCalled();
  });
});

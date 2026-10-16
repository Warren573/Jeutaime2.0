import { CoinTxnType, PremiumTier, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { getPaidProduct } from "../../policies/paidProducts";

/**
 * INTERNAL ONLY: call after independently verifying a payment with the provider.
 * Never expose this operation to a client-controlled HTTP route.
 *
 * The receipt must already be VERIFIED with verifiedAt set by a trusted provider verifier.
 * Its database status acts as a one-time gate inside the same serializable transaction
 * as the wallet/premium change. Duplicate delivery returns "already_fulfilled".
 */
export async function fulfillVerifiedPurchase(receiptId: string) {
  return prisma.$transaction(async (tx) => {
    const receipt = await tx.paymentReceipt.findUnique({ where: { id: receiptId } });
    if (!receipt) throw new Error("Payment receipt not found");
    if (receipt.status === "FULFILLED" && receipt.fulfilledAt) return { status: "already_fulfilled" as const };
    if (receipt.status !== "VERIFIED" || !receipt.verifiedAt || receipt.fulfilledAt)
      throw new Error("Payment must be independently verified before fulfillment");

    const product = getPaidProduct(receipt.productId);
    if (!product) throw new Error("Unknown payment product");
    const claimed = await tx.paymentReceipt.updateMany({
      where: { id: receipt.id, status: "VERIFIED", verifiedAt: { not: null }, fulfilledAt: null },
      data: { status: "FULFILLED", fulfilledAt: new Date() },
    });
    if (claimed.count !== 1) throw new Error("Payment already claimed");

    if (product.kind === "coins") {
      const updated = await tx.wallet.update({
        where: { userId: receipt.userId },
        data: { coins: { increment: product.quantity } },
        select: { coins: true },
      });
      await tx.coinTransaction.create({
        data: {
          walletId: receipt.userId,
          type: CoinTxnType.PURCHASE_COINS,
          amount: product.quantity,
          balance: updated.coins,
          meta: { receiptId: receipt.id, productId: receipt.productId, provider: receipt.provider } as Prisma.InputJsonValue,
        },
      });
    } else {
      // Store subscription lifecycle and monthly rewards still require renewal event verification.
      // Do not grant a recurring entitlement on the basis of a one-off record.
      throw new Error("Subscription fulfillment awaits verified renewal lifecycle");
    }
    return { status: "fulfilled" as const, productId: receipt.productId };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { getPaidProduct, type PaymentProvider } from "../../policies/paidProducts";

/** Trusted provider verification result, NEVER build this from a client request. */
export interface VerifiedProviderPurchase {
  provider: PaymentProvider;
  providerTransactionId: string;
  productId: string;
  userId: string;
  verifiedAt: Date;
}

/**
 * Accept a VERIFIED purchase only after an independent verifier has confirmed
 * the provider signature, purchased product, account binding and settlement.
 * This module has no HTTP route; callers must implement real provider verification.
 * No caller-provided price can alter the product catalogue.
 */
export async function recordTrustedPurchase(
  purchase: VerifiedProviderPurchase,
  verify: (purchase: VerifiedProviderPurchase) => Promise<boolean>,
) {
  if (!purchase.providerTransactionId.trim() || !purchase.userId.trim())
    throw new Error("Missing provider transaction or account");
  if (!["apple", "google", "web"].includes(purchase.provider))
    throw new Error("Unsupported payment provider");
  const product = getPaidProduct(purchase.productId);
  if (!product) throw new Error("Unknown product");
  if (!(purchase.verifiedAt instanceof Date) || !Number.isFinite(purchase.verifiedAt.getTime()))
    throw new Error("Invalid verification time");
  if (purchase.verifiedAt.getTime() > Date.now() + 60_000)
    throw new Error("Verification timestamp is in the future");
  if (!await verify(purchase)) throw new Error("Provider verification failed");

  const existing = await prisma.paymentReceipt.findUnique({
    where: { provider_providerTransactionId: {
      provider: purchase.provider, providerTransactionId: purchase.providerTransactionId,
    } },
  });
  if (existing) {
    if (existing.userId !== purchase.userId || existing.productId !== purchase.productId)
      throw new Error("Provider transaction claimed by a different account or product");
    return { receiptId: existing.id, status: existing.status };
  }
  try {
    const created = await prisma.paymentReceipt.create({
      data: {
        userId: purchase.userId,
        provider: purchase.provider,
        providerTransactionId: purchase.providerTransactionId,
        productId: purchase.productId,
        status: "VERIFIED",
        verifiedAt: purchase.verifiedAt,
      },
    });
    return { receiptId: created.id, status: created.status };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const raced = await prisma.paymentReceipt.findUniqueOrThrow({
        where: { provider_providerTransactionId: {
          provider: purchase.provider, providerTransactionId: purchase.providerTransactionId,
        } },
      });
      if (raced.userId !== purchase.userId || raced.productId !== purchase.productId)
        throw new Error("Provider transaction claimed by a different account or product");
      return { receiptId: raced.id, status: raced.status };
    }
    throw error;
  }
}

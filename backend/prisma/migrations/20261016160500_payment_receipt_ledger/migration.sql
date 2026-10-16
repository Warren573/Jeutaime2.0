-- Store verified provider purchases once; no entitlement is granted by this migration.
CREATE TABLE "PaymentReceipt" (
 "id" TEXT NOT NULL,
 "userId" TEXT NOT NULL,
 "provider" TEXT NOT NULL,
 "providerTransactionId" TEXT NOT NULL,
 "productId" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'PENDING',
 "verifiedAt" TIMESTAMP(3),
 "fulfilledAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "PaymentReceipt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PaymentReceipt_provider_providerTransactionId_key" ON "PaymentReceipt"("provider", "providerTransactionId");
CREATE INDEX "PaymentReceipt_userId_createdAt_idx" ON "PaymentReceipt"("userId", "createdAt");
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

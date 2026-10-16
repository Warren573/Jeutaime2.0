import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("payment receipt database uniqueness", () => {
  const schema = readFileSync(resolve(__dirname, "../../prisma/schema.prisma"), "utf8");
  const migration = readFileSync(resolve(__dirname, "../../prisma/migrations/20261016160500_payment_receipt_ledger/migration.sql"), "utf8");
  it("defines globally unique receipt identity by payment provider and transaction", () => {
    expect(schema).toContain("@@unique([provider, providerTransactionId])");
    expect(migration).toContain('CREATE UNIQUE INDEX "PaymentReceipt_provider_providerTransactionId_key"');
  });
  it("tracks verification and fulfillment separately", () => {
    expect(schema).toMatch(/verifiedAt\s+DateTime\?/);
    expect(schema).toMatch(/fulfilledAt\s+DateTime\?/);
  });
});

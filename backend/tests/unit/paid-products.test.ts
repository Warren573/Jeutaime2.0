import { describe, expect, it } from "vitest";
import { PAID_PRODUCTS, validateProviderPurchase, getPaidProduct } from "../../src/policies/paidProducts";

describe("catalogue des achats en euros", () => {
  it("expose exactement les packs et l'abonnement approuvés", () => {
    expect(Object.entries(PAID_PRODUCTS).map(([id, p]) => [id, p.cents, p.quantity])).toEqual([
      ["coins_100", 99, 100],
      ["coins_500", 299, 500],
      ["coins_1000", 499, 1000],
      ["plus_monthly", 599, 500],
    ]);
  });
  it("ne reconnait aucun produit inventé", () => {
    expect(getPaidProduct("coins_9999")).toBeNull();
    expect(getPaidProduct("__proto__")).toBeNull();
  });
  it("rejects tampered price, currency, and missing transaction IDs", () => {
    const valid = { productId: "coins_500", provider: "apple" as const, amountCents: 299, currency: "EUR", providerTransactionId: "transaction-123" };
    expect(validateProviderPurchase(valid).valid).toBe(true);
    expect(validateProviderPurchase({ ...valid, amountCents: 99 }).valid).toBe(false);
    expect(validateProviderPurchase({ ...valid, amountCents: 299.5 }).valid).toBe(false);
    expect(validateProviderPurchase({ ...valid, currency: "USD" }).valid).toBe(false);
    expect(validateProviderPurchase({ ...valid, providerTransactionId: " " }).valid).toBe(false);
    expect(validateProviderPurchase({ ...valid, productId: "fake" }).valid).toBe(false);
  });
});

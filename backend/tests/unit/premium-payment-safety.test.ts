import { describe, expect, it } from "vitest";
import { SubscribePremiumSchema } from "../../src/modules/premium/premium.schemas";
import { PREMIUM_PLANS } from "../../src/modules/premium/premium.plans";

describe("JeuTaime Plus payment configuration", () => {
  it.each(["coins", "stripe_stub", "free", "test"])("rejects %s as payment method", (paymentMethod) => {
    expect(SubscribePremiumSchema.safeParse({ planId: "monthly", paymentMethod }).success).toBe(false);
  });

  it.each(["apple", "google"])("recognizes the configured provider %s", (paymentMethod) => {
    expect(SubscribePremiumSchema.safeParse({ planId: "monthly", paymentMethod }).success).toBe(true);
  });

  it("offers a single paid monthly Plus tier", () => {
    expect(PREMIUM_PLANS).toHaveLength(1);
    expect(PREMIUM_PLANS[0]).toMatchObject({ id: "monthly", priceEur: 5.99, priceCoins: 0 });
  });
});

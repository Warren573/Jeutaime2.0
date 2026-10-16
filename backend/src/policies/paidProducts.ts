/** Source de vérité des produits payants, indépendante des prix transmis par le client. */
export const PAID_PRODUCTS = {
  coins_100: { kind: "coins", quantity: 100, cents: 99, currency: "EUR", consumable: true },
  coins_500: { kind: "coins", quantity: 500, cents: 299, currency: "EUR", consumable: true },
  coins_1000: { kind: "coins", quantity: 1000, cents: 499, currency: "EUR", consumable: true },
  plus_monthly: { kind: "subscription", quantity: 500, cents: 599, currency: "EUR", consumable: false },
} as const;

export type PaidProductId = keyof typeof PAID_PRODUCTS;
export type PaymentProvider = "apple" | "google" | "web";

export function getPaidProduct(id: string) {
  if (!Object.prototype.hasOwnProperty.call(PAID_PRODUCTS, id)) return null;
  return PAID_PRODUCTS[id as PaidProductId];
}

/** Product/provider/amount must be checked against a signed provider event before fulfillment. */
export function validateProviderPurchase(input: {
  productId: string;
  provider: PaymentProvider;
  amountCents: number;
  currency: string;
  providerTransactionId: string;
}) {
  const product = getPaidProduct(input.productId);
  if (!product) return { valid: false as const, reason: "unknown_product" };
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents !== product.cents)
    return { valid: false as const, reason: "amount_mismatch" };
  if (input.currency.toUpperCase() !== product.currency)
    return { valid: false as const, reason: "currency_mismatch" };
  if (!input.providerTransactionId.trim())
    return { valid: false as const, reason: "missing_transaction_id" };
  return { valid: true as const, product, provider: input.provider };
}

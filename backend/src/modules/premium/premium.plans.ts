/**
 * Catalogue des plans Premium.
 *
 * Stub explicite — aucun Stripe branché. Les prix sont exprimés en
 * coins (économie interne) et en EUR (pour une future intégration
 * paiement). `paymentMethod = "coins"` débite le wallet, `"stripe_stub"`
 * simule un paiement externe réussi et log une AuditLog.
 *
 * Source unique de vérité : toute la logique amont (validation, durée,
 * coût) référence ce fichier.
 */

export interface PremiumPlan {
  id: string;
  label: string;
  durationDays: number;
  priceCoins: number;
  priceEur: number;
}

export const PREMIUM_PLANS: readonly PremiumPlan[] = [
  {
    id: "monthly",
    label: "Mensuel",
    durationDays: 30,
    priceCoins: 500,
    priceEur: 4.99,
  },
  {
    id: "quarterly",
    label: "Trimestriel",
    durationDays: 90,
    priceCoins: 1200,
    priceEur: 12.99,
  },
  {
    id: "yearly",
    label: "Annuel",
    durationDays: 365,
    priceCoins: 4000,
    priceEur: 39.99,
  },
] as const;

export function findPlan(planId: string): PremiumPlan | null {
  return PREMIUM_PLANS.find((p) => p.id === planId) ?? null;
}

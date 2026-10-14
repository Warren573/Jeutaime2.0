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
  { id: "monthly", label: "JeuTaime Plus", durationDays: 30, priceCoins: 0, priceEur: 5.99 },
] as const;

export function findPlan(planId: string): PremiumPlan | null {
  return PREMIUM_PLANS.find((p) => p.id === planId) ?? null;
}

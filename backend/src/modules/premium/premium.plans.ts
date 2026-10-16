/** Abonnement unique JeuTaime Plus. Paiement exclusivement via les stores. */
export interface PremiumPlan {
  id: string;
  label: string;
  durationDays: number;
  priceCoins: number;
  priceEur: number;
}

// priceCoins = 0 : valeur historique du DTO, jamais un moyen de paiement.
export const PREMIUM_PLANS: readonly PremiumPlan[] = [
  { id: "monthly", label: "JeuTaime Plus", durationDays: 30, priceCoins: 0, priceEur: 5.99 },
] as const;

export function findPlan(planId: string): PremiumPlan | null {
  return PREMIUM_PLANS.find(p => p.id === planId) ?? null;
}

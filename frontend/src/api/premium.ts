import { apiFetch } from "./client";

export interface PremiumPlanDTO {
  planId: string;
  durationDays: number;
  priceCoins: number;
  priceStripe: number | null;
  label: string;
}

export interface PremiumStatusDTO {
  tier: "FREE" | "PREMIUM";
  premiumUntil: string | null;
  active: boolean;
}

export interface PremiumSubscribeResultDTO {
  status: PremiumStatusDTO;
  plan: PremiumPlanDTO;
  paymentMethod: "coins" | "stripe_stub";
  coinsSpent: number | null;
}

export async function getPremiumPlans(): Promise<PremiumPlanDTO[]> {
  const res = (await apiFetch("/premium/plans")) as {
    data: PremiumPlanDTO[];
  };
  return res.data;
}

export async function getMyPremiumStatus(): Promise<PremiumStatusDTO> {
  const res = (await apiFetch("/premium/me")) as { data: PremiumStatusDTO };
  return res.data;
}

export async function subscribePremium(payload: {
  planId: string;
  paymentMethod: "coins" | "stripe_stub";
}): Promise<PremiumSubscribeResultDTO> {
  const res = (await apiFetch("/premium/subscribe", {
    method: "POST",
    body: JSON.stringify(payload),
  })) as { data: PremiumSubscribeResultDTO };
  return res.data;
}

export async function cancelPremium(): Promise<void> {
  await apiFetch("/premium/cancel", { method: "POST" });
}

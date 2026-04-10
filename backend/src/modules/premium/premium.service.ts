import { CoinTxnType, PremiumTier, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import {
  BadRequestError,
  NotFoundError,
  UnprocessableError,
} from "../../core/errors";
import {
  computeNewPremiumUntil,
  isPremiumActive,
} from "../../policies/premium";
import { computeDebitBalance } from "../../policies/wallet";
import { PREMIUM_PLANS, PremiumPlan, findPlan } from "./premium.plans";
import type { SubscribePremiumDto } from "./premium.schemas";

// ============================================================
// Types de retour
// ============================================================

export interface PremiumStatusDto {
  tier: PremiumTier;
  premiumUntil: Date | null;
  active: boolean;
}

export interface SubscribeResult {
  status: PremiumStatusDto;
  plan: PremiumPlan;
  paymentMethod: "coins" | "stripe_stub";
  coinsSpent: number | null;
}

// ============================================================
// getPlans
// ============================================================
export function getPlans(): readonly PremiumPlan[] {
  return PREMIUM_PLANS;
}

// ============================================================
// getMyStatus
// ============================================================
export async function getMyStatus(userId: string): Promise<PremiumStatusDto> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { premiumTier: true, premiumUntil: true },
  });
  if (!user) throw new NotFoundError("Utilisateur");
  return {
    tier: user.premiumTier,
    premiumUntil: user.premiumUntil,
    active: isPremiumActive(user),
  };
}

// ============================================================
// subscribe — coins (débit atomique) OU stripe_stub (no-op paiement)
//
// Tout dans une seule Prisma transaction :
//   1. lock user (read current premiumUntil)
//   2. si coins : lire wallet, vérifier fonds, débiter, log CoinTxn
//   3. calculer nouvelle premiumUntil (cumul si encore actif)
//   4. update user.premiumTier/premiumUntil
//   5. AuditLog
// ============================================================
export async function subscribe(
  userId: string,
  dto: SubscribePremiumDto,
): Promise<SubscribeResult> {
  const plan = findPlan(dto.planId);
  if (!plan) throw new BadRequestError("Plan Premium inconnu");

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, premiumTier: true, premiumUntil: true },
    });
    if (!user) throw new NotFoundError("Utilisateur");

    let coinsSpent: number | null = null;

    // --- Paiement : coins ---
    if (dto.paymentMethod === "coins") {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new NotFoundError("Wallet");

      // Pure : throws NotEnoughCoinsError si insuffisant
      const newBalance = computeDebitBalance(wallet.coins, plan.priceCoins);

      await tx.wallet.update({
        where: { userId },
        data: { coins: newBalance },
      });

      await tx.coinTransaction.create({
        data: {
          walletId: userId,
          type: CoinTxnType.PREMIUM_PURCHASE,
          amount: -plan.priceCoins,
          balance: newBalance,
          meta: {
            planId: plan.id,
            durationDays: plan.durationDays,
          } as Prisma.InputJsonValue,
        },
      });

      coinsSpent = plan.priceCoins;
    } else if (dto.paymentMethod === "stripe_stub") {
      // Stub : on ne touche pas au wallet. Un vrai intégrateur appellerait
      // ici Stripe, validerait le payment intent, puis poursuivrait.
      coinsSpent = null;
    } else {
      // Typage exhaustif — ne devrait jamais arriver grâce au Zod enum
      throw new UnprocessableError("Méthode de paiement non supportée");
    }

    const now = new Date();
    const newUntil = computeNewPremiumUntil(
      user.premiumUntil,
      plan.durationDays,
      now,
    );

    const updated = await tx.user.update({
      where: { id: userId },
      data: {
        premiumTier: PremiumTier.PREMIUM,
        premiumUntil: newUntil,
      },
      select: { premiumTier: true, premiumUntil: true },
    });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "premium.subscribe",
        target: userId,
        meta: {
          planId: plan.id,
          paymentMethod: dto.paymentMethod,
          durationDays: plan.durationDays,
          priceCoins: plan.priceCoins,
          newUntil: newUntil.toISOString(),
        } as Prisma.InputJsonValue,
      },
    });

    return {
      status: {
        tier: updated.premiumTier,
        premiumUntil: updated.premiumUntil,
        active: isPremiumActive(updated, now),
      },
      plan,
      paymentMethod: dto.paymentMethod,
      coinsSpent,
    };
  });
}

// ============================================================
// cancel — immédiat : tier=FREE, on garde premiumUntil pour audit
//
// Sémantique : l'utilisateur perd immédiatement ses avantages. On ne
// "laisse pas courir jusqu'à la fin de la période payée" (choix
// produit simple et sans ambiguïté). premiumUntil reste inchangé
// pour garder la trace historique de la souscription.
// ============================================================
export async function cancel(userId: string): Promise<PremiumStatusDto> {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { premiumTier: true, premiumUntil: true },
    });
    if (!user) throw new NotFoundError("Utilisateur");

    if (user.premiumTier !== PremiumTier.PREMIUM) {
      throw new UnprocessableError("Aucune souscription Premium active");
    }

    const updated = await tx.user.update({
      where: { id: userId },
      data: { premiumTier: PremiumTier.FREE },
      select: { premiumTier: true, premiumUntil: true },
    });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "premium.cancel",
        target: userId,
        meta: {
          previousUntil: user.premiumUntil?.toISOString() ?? null,
        } as Prisma.InputJsonValue,
      },
    });

    return {
      tier: updated.premiumTier,
      premiumUntil: updated.premiumUntil,
      active: isPremiumActive(updated),
    };
  });
}

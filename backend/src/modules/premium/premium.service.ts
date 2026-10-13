import { PremiumTier, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import {
  ForbiddenError,
  NotFoundError,
  UnprocessableError,
} from "../../core/errors";
import { isPremiumActive } from "../../policies/premium";
import { emitPremiumCancelled } from "../../events";
import { PREMIUM_PLANS, PremiumPlan } from "./premium.plans";
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
  _userId: string,
  _dto: SubscribePremiumDto,
): Promise<SubscribeResult> {
  // Aucune attribution de Plus sans vérification d'un paiement réel.
  throw new ForbiddenError("Souscription Plus indisponible : paiement sécurisé non encore connecté");
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
  const txResult = await prisma.$transaction(async (tx) => {
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
      status: {
        tier: updated.premiumTier,
        premiumUntil: updated.premiumUntil,
        active: isPremiumActive(updated),
      },
      previousUntil: user.premiumUntil,
    };
  });

  // Event émis après succès de la transaction — non bloquant
  emitPremiumCancelled({
    userId,
    previousUntil: txResult.previousUntil,
  });

  return txResult.status;
}

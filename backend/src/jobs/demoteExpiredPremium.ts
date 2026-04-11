/**
 * Job : demoteExpiredPremium
 *
 * Ramène les utilisateurs au tier FREE quand leur `premiumUntil` est
 * passé. C'est purement un travail d'hygiène DB : la lecture via
 * `isPremiumActive` reste la source de vérité — ce job garantit juste
 * que la colonne `premiumTier` ne diverge pas de la réalité logique.
 *
 * Idempotent : un 2e run ne fait rien.
 * Safe : n'affecte pas les users avec `premiumUntil === null`.
 */
import { PremiumTier } from "@prisma/client";
import { prisma } from "../config/prisma";
import type { Job, JobResult } from "./types";

const JOB_NAME = "demoteExpiredPremium";

export const demoteExpiredPremiumJob: Job = {
  name: JOB_NAME,
  description:
    "Passe en FREE les utilisateurs dont le Premium est expiré (premiumUntil <= now).",

  async run(now: Date = new Date()): Promise<JobResult> {
    const where = {
      premiumTier: PremiumTier.PREMIUM,
      premiumUntil: { lte: now },
    } as const;

    const scanned = await prisma.user.count({ where });
    const result = await prisma.user.updateMany({
      where,
      data: { premiumTier: PremiumTier.FREE },
    });

    return {
      jobName: JOB_NAME,
      scanned,
      affected: result.count,
      durationMs: 0, // rempli par le runner
    };
  },
};

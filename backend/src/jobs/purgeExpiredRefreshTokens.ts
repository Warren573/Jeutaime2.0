/**
 * Job : purgeExpiredRefreshTokens
 *
 * Supprime les refresh tokens dont `expiresAt` est strictement passé.
 * Pur nettoyage : l'authentification rejette déjà les tokens expirés
 * en lecture, ce job ne sert qu'à éviter l'accumulation en DB.
 *
 * Un `graceMs` est appliqué via `computeRefreshTokenPurgeCutoff` pour
 * laisser une marge de sécurité (par défaut 1h).
 */
import { prisma } from "../config/prisma";
import { computeRefreshTokenPurgeCutoff } from "../policies/jobs";
import type { Job, JobResult } from "./types";

const JOB_NAME = "purgeExpiredRefreshTokens";
const DEFAULT_GRACE_MS = 60 * 60 * 1000; // 1h

export interface PurgeExpiredRefreshTokensOptions {
  graceMs?: number;
}

export function createPurgeExpiredRefreshTokensJob(
  opts: PurgeExpiredRefreshTokensOptions = {},
): Job {
  const graceMs = opts.graceMs ?? DEFAULT_GRACE_MS;

  return {
    name: JOB_NAME,
    description:
      "Supprime les refresh tokens dont l'expiration est passée (hygiène DB).",

    async run(now: Date = new Date()): Promise<JobResult> {
      const cutoff = computeRefreshTokenPurgeCutoff(now, graceMs);
      const where = { expiresAt: { lt: cutoff } } as const;

      const scanned = await prisma.refreshToken.count({ where });
      const result = await prisma.refreshToken.deleteMany({ where });

      return {
        jobName: JOB_NAME,
        scanned,
        affected: result.count,
        durationMs: 0, // rempli par le runner
      };
    },
  };
}

export const purgeExpiredRefreshTokensJob =
  createPurgeExpiredRefreshTokensJob();

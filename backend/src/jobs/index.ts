/**
 * Point d'entrée unique de la couche Jobs.
 *
 * Usage :
 *   import { ALL_JOBS, startScheduler, runJob } from "./jobs";
 *
 *   // Manuel :
 *   await runJob(demoteExpiredPremiumJob);
 *
 *   // Scheduler (opt-in via env.ENABLE_SCHEDULER) :
 *   startScheduler({ intervalMs: 300_000, jobs: ALL_JOBS });
 */
import { demoteExpiredPremiumJob } from "./demoteExpiredPremium";
import {
  purgeExpiredRefreshTokensJob,
  createPurgeExpiredRefreshTokensJob as createPurgeExpiredRefreshTokensJobInternal,
} from "./purgeExpiredRefreshTokens";
import { expireCardGamesJob } from "./expireCardGames";
import { closeRefugeDaysJob } from "./closeRefugeDays";
import { expireSalonSessionsJob } from "./expireSalonSessions";
import type { Job } from "./types";

// Re-exports publics
export { runJob } from "./runner";
export { startScheduler } from "./scheduler";
export type { Job, JobResult } from "./types";
export {
  demoteExpiredPremiumJob,
  purgeExpiredRefreshTokensJob,
  expireCardGamesJob,
  expireSalonSessionsJob,
  closeRefugeDaysJob,
};
export {
  createPurgeExpiredRefreshTokensJob,
} from "./purgeExpiredRefreshTokens";

/**
 * Liste canonique des jobs de maintenance.
 * L'ordre n'est pas significatif (jobs indépendants et idempotents).
 */
export const ALL_JOBS: readonly Job[] = [
  demoteExpiredPremiumJob,
  purgeExpiredRefreshTokensJob,
  expireCardGamesJob,
  expireSalonSessionsJob,
  closeRefugeDaysJob,
];

/**
 * Source de vérité UNIQUE de la liste passée au scheduler par server.ts.
 * Identique à ALL_JOBS, à une exception près : la purge des refresh tokens
 * utilise la variante paramétrée par l'environnement (graceMs).
 * Chaque job n'apparaît qu'une seule fois — pas de double planification.
 */
export function buildScheduledJobs(options: { refreshTokenPurgeGraceMs: number }): readonly Job[] {
  return [
    demoteExpiredPremiumJob,
    createPurgeExpiredRefreshTokensJobInternal({ graceMs: options.refreshTokenPurgeGraceMs }),
    expireCardGamesJob,
    expireSalonSessionsJob,
    closeRefugeDaysJob,
  ];
}

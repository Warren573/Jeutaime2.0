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
import { purgeExpiredRefreshTokensJob } from "./purgeExpiredRefreshTokens";
import type { Job } from "./types";

// Re-exports publics
export { runJob } from "./runner";
export { startScheduler } from "./scheduler";
export type { Job, JobResult } from "./types";
export {
  demoteExpiredPremiumJob,
  purgeExpiredRefreshTokensJob,
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
];

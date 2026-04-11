/**
 * Runner de jobs.
 *
 * Wrapper fin autour de `Job.run()` qui :
 *   - mesure la durée
 *   - capture les erreurs (le scheduler ne doit jamais crasher)
 *   - log le début, la fin et les erreurs de manière structurée
 */
import { logger } from "../config/logger";
import type { Job, JobResult } from "./types";

export async function runJob(
  job: Job,
  now: Date = new Date(),
): Promise<JobResult> {
  const start = Date.now();
  logger.info({ job: job.name }, `[jobs] start ${job.name}`);
  try {
    const partial = await job.run(now);
    const durationMs = Date.now() - start;
    const result: JobResult = { ...partial, durationMs };
    logger.info(
      {
        job: job.name,
        scanned: result.scanned,
        affected: result.affected,
        durationMs,
      },
      `[jobs] done ${job.name}`,
    );
    return result;
  } catch (err) {
    const durationMs = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    logger.error(
      { err, job: job.name, durationMs },
      `[jobs] failed ${job.name}`,
    );
    return {
      jobName: job.name,
      scanned: 0,
      affected: 0,
      durationMs,
      error: message,
    };
  }
}

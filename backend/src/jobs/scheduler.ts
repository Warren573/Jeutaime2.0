/**
 * Scheduler minimal de jobs.
 *
 * Opt-in : n'est PAS démarré par défaut (server.ts appelle
 * `startScheduler` uniquement si `env.ENABLE_SCHEDULER` est truthy).
 *
 * Implémentation volontairement simple (setInterval + unref) pour
 * éviter toute dépendance externe (node-cron, bullmq, etc.). Les jobs
 * sont exécutés en parallèle (`Promise.all`) car ils sont indépendants
 * et idempotents.
 */
import { logger } from "../config/logger";
import { runJob } from "./runner";
import type { Job } from "./types";

export interface SchedulerConfig {
  intervalMs: number;
  jobs: readonly Job[];
}

export interface SchedulerHandle {
  stop: () => void;
}

export function startScheduler(config: SchedulerConfig): SchedulerHandle {
  const { intervalMs, jobs } = config;

  if (jobs.length === 0) {
    logger.warn("[jobs] Scheduler démarré sans jobs — no-op");
  }

  logger.info(
    { intervalMs, jobs: jobs.map((j) => j.name) },
    "[jobs] scheduler démarré",
  );

  const tick = () => {
    void Promise.all(jobs.map((j) => runJob(j)));
  };

  const handle = setInterval(tick, intervalMs);
  // unref() pour que le scheduler ne retienne pas l'event loop à l'arrêt
  handle.unref();

  return {
    stop: () => {
      clearInterval(handle);
      logger.info("[jobs] scheduler arrêté");
    },
  };
}

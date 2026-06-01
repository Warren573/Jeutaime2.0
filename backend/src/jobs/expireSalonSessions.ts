import type { Job, JobResult } from "./types";
import * as salonSessionsService from "../modules/salon-sessions/salonSessions.service";

const JOB_NAME = "expireSalonSessions";

export const expireSalonSessionsJob: Job = {
  name: JOB_NAME,
  description: "Expire salon sessions where expiresAt <= now.",

  async run(): Promise<JobResult> {
    try {
      const { expired } = await salonSessionsService.expireOldSessions();
      return {
        jobName: JOB_NAME,
        scanned: 0,
        affected: expired,
        durationMs: 0,
      };
    } catch (error) {
      return {
        jobName: JOB_NAME,
        scanned: 0,
        affected: 0,
        durationMs: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

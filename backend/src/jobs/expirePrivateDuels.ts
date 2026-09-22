import type { Job } from "./types";
import * as duels from "../modules/private-duels/private-duels.service";

export const expirePrivateDuelsJob: Job = {
  name: "expirePrivateDuels",
  description: "Expire les duels privés après 48 heures",
  async run(now = new Date()) {
    const affected = await duels.expirePending(now);
    return {
      jobName: "expirePrivateDuels",
      scanned: affected,
      affected,
      durationMs: 0,
    };
  },
};

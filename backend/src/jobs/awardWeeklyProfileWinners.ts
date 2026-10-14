import type { Job } from "./types";
import { awardPreviousWeekWinners } from "../modules/weekly-profile/weekly-profile.rewards";

export const awardWeeklyProfileWinnersJob: Job = {
  name: "awardWeeklyProfileWinners",
  description: "Attribue une seule prime de 50 pièces aux deux profils élus la semaine précédente.",
  async run() {
    const affected = await awardPreviousWeekWinners();
    return { jobName: "awardWeeklyProfileWinners", scanned: 2, affected, durationMs: 0 };
  },
};

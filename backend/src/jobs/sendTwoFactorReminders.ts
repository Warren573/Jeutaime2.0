import type { Job } from "./types";
import { runTwoFactorGraceReminders } from "../modules/auth/security/twoFactorReminder";

export const sendTwoFactorRemindersJob: Job = {
  name: "sendTwoFactorReminders",
  description:
    "Rappelle aux OWNER et ADMIN (à 7, 3 et 1 jour de l'échéance) de configurer la double authentification obligatoire",
  async run(now = new Date()) {
    const { scanned, sent } = await runTwoFactorGraceReminders(now);
    return { jobName: "sendTwoFactorReminders", scanned, affected: sent, durationMs: 0 };
  },
};

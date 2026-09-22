import type { Job } from "./types";
import { env } from "../config/env";
import { sendDailyEditionPush } from "../modules/notifications/push.service";

function parisParts(now: Date) {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: env.DAILY_EDITION_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    key: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
  };
}

export const publishDailyJournalEditionJob: Job = {
  name: "publishDailyJournalEdition",
  description: "Envoie une fois par jour la notification de l'Édition du jour",
  async run(now = new Date()) {
    const { key, hour } = parisParts(now);
    if (hour < env.DAILY_EDITION_PUSH_HOUR) {
      return {
        jobName: "publishDailyJournalEdition",
        scanned: 0,
        affected: 0,
        durationMs: 0,
      };
    }

    const result = await sendDailyEditionPush({
      editionKey: key,
      title: "Le JeuTaime — Édition du jour",
      body: "Votre édition du jour est disponible.",
    });

    return {
      jobName: "publishDailyJournalEdition",
      scanned: result.scanned,
      affected: result.sent,
      durationMs: 0,
    };
  },
};

import * as salonSessionsService from "../modules/salon-sessions/salonSessions.service";

export async function expireSalonSessionsJob() {
  try {
    const { expired } = await salonSessionsService.expireOldSessions();
    if (expired > 0) {
      console.log(`[Cron] Expired ${expired} salon sessions`);
    }
  } catch (error) {
    console.error("[Cron] Error expiring salon sessions:", error);
  }
}

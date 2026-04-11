import { env } from "./config/env";
import { logger } from "./config/logger";
import { prisma } from "./config/prisma";
import app from "./app";
import {
  createPurgeExpiredRefreshTokensJob,
  demoteExpiredPremiumJob,
  startScheduler,
} from "./jobs";

// Enregistrement des handlers d'événements (doit être importé avant tout)
import "./events/handlers";

async function main() {
  // Vérifier la connexion DB avant de démarrer
  await prisma.$connect();
  logger.info("Base de données connectée");

  const server = app.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, env: env.NODE_ENV, prefix: env.API_PREFIX },
      `🚀 JeuTaime API démarrée`,
    );
  });

  // Scheduler opt-in (ENABLE_SCHEDULER=true)
  let schedulerHandle: { stop: () => void } | null = null;
  if (env.ENABLE_SCHEDULER) {
    schedulerHandle = startScheduler({
      intervalMs: env.SCHEDULER_INTERVAL_MS,
      jobs: [
        demoteExpiredPremiumJob,
        createPurgeExpiredRefreshTokensJob({
          graceMs: env.REFRESH_TOKEN_PURGE_GRACE_MS,
        }),
      ],
    });
  }

  // Arrêt propre
  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Arrêt en cours...");
    schedulerHandle?.stop();
    server.close(async () => {
      await prisma.$disconnect();
      logger.info("Connexion DB fermée. Bye.");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => { void shutdown("SIGTERM"); });
  process.on("SIGINT",  () => { void shutdown("SIGINT"); });
}

main().catch((err) => {
  logger.error({ err }, "Erreur fatale au démarrage");
  process.exit(1);
});

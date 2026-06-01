import { env } from "./config/env";
import { logger } from "./config/logger";
import { prisma } from "./config/prisma";
import app from "./app";
import {
  createPurgeExpiredRefreshTokensJob,
  demoteExpiredPremiumJob,
  expireCardGamesJob,
  expireSalonSessionsJob,
  startScheduler,
} from "./jobs";
import { execSync } from "child_process";

// Enregistrement des handlers d'événements (doit être importé avant tout)
import "./events/handlers";

function getCommitSha() {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }).trim();
  } catch {
    return "unknown";
  }
}

async function main() {
  const commitSha = getCommitSha();
  console.log(`\n🔍 [VERSION] Backend startup - commit SHA: ${commitSha}\n`);

  // Vérifier la connexion DB avant de démarrer (avec timeout)
  try {
    const connectPromise = prisma.$connect();
    const timeoutPromise = new Promise((_resolve, reject) =>
      setTimeout(() => reject(new Error("Prisma connect timeout after 30s")), 30_000)
    );
    await Promise.race([connectPromise, timeoutPromise]);
    logger.info("Base de données connectée");
  } catch (err) {
    logger.error({ err }, "Impossible de connecter à la base de données");
    throw err;
  }

  const server = app.listen(env.PORT, "0.0.0.0", () => {
    logger.info(
      { port: env.PORT, env: env.NODE_ENV, prefix: env.API_PREFIX, host: "0.0.0.0" },
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
        expireCardGamesJob,
        expireSalonSessionsJob,
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
import { env } from "./config/env";
import { logger } from "./config/logger";
import { prisma } from "./config/prisma";
import app from "./app";
import { buildScheduledJobs, startScheduler } from "./jobs";
import { execSync } from "child_process";
import { isTestMode } from "./core/testMode";

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
  logger.info({ commitSha }, "Backend startup");

  if (env.NODE_ENV !== "production") {
    logger.debug({
      nodeEnv: process.env.NODE_ENV,
      testMode: isTestMode(),
    }, "Test mode diagnostic");
  }

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

  // Diagnostic salons uniquement hors production.
  if (env.NODE_ENV !== "production") {
    try {
      const salons = await prisma.salon.findMany({
        select: { kind: true, name: true, isActive: true },
        orderBy: { order: "asc" },
      });
      logger.debug({
        count: salons.length,
        salons: salons.map((s) => ({ kind: s.kind, name: s.name, isActive: s.isActive })),
        hasPsySalon: salons.some((s) => s.kind === "PSY"),
      }, "Startup salons diagnostic");
    } catch (err) {
      logger.debug({ err }, "Startup salons diagnostic unavailable");
    }
  }

  const server = app.listen(env.PORT, "0.0.0.0", () => {
    logger.info(
      { port: env.PORT, env: env.NODE_ENV, prefix: env.API_PREFIX, host: "0.0.0.0" },
      "JeuTaime API démarrée",
    );
  });

  // Scheduler opt-in (ENABLE_SCHEDULER=true) — liste unique de jobs, dont
  // closeRefugeDaysJob (clôture des journées de Refuge échues).
  let schedulerHandle: { stop: () => void } | null = null;
  if (env.ENABLE_SCHEDULER) {
    schedulerHandle = startScheduler({
      intervalMs: env.SCHEDULER_INTERVAL_MS,
      jobs: buildScheduledJobs({
        refreshTokenPurgeGraceMs: env.REFRESH_TOKEN_PURGE_GRACE_MS,
      }),
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
  process.on("SIGINT", () => { void shutdown("SIGINT"); });
}

main().catch((err) => {
  logger.error({ err }, "Erreur fatale au démarrage");
  process.exit(1);
});
import { env } from "./config/env";
import { logger } from "./config/logger";
import { prisma } from "./config/prisma";
import app from "./app";

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

  // Arrêt propre
  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Arrêt en cours...");
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

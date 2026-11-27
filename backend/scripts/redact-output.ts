/**
 * À importer EN PREMIER par le script de test accéléré : filtre TOUTE sortie du processus (stdout et stderr, y compris
 * les messages d'erreur que Prisma écrit lui-même) pour que l'URL de connexion à la base, son hôte, son utilisateur et
 * son mot de passe n'apparaissent jamais dans les journaux (publics, le dépôt étant public).
 */
import { redactSecrets } from "./refuge-testkit";

const urls = [process.env["DATABASE_URL"], process.env["DIRECT_URL"]];
for (const stream of [process.stdout, process.stderr]) {
  const original = stream.write.bind(stream) as (chunk: unknown, ...rest: unknown[]) => boolean;
  (stream as { write: unknown }).write = (chunk: unknown, ...rest: unknown[]) =>
    original(typeof chunk === "string" ? redactSecrets(chunk, urls) : Buffer.isBuffer(chunk) ? redactSecrets(chunk.toString("utf8"), urls) : chunk, ...rest);
}

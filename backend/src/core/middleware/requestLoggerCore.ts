import pinoHttp from "pino-http";
import type { Logger } from "pino";
import type { IncomingMessage } from "http";

/**
 * Journal des requêtes HTTP.
 *
 * Identité : l'identifiant du compte authentifié (`userId`) est ajouté à la ligne de journal de CHAQUE requête
 * authentifiée, y compris celles qui échouent après l'authentification (403, 404, 409, 500…).
 *
 * Pourquoi `customProps` : pino fige l'objet `req` au DÉBUT de la requête (liaison de l'enregistreur enfant), avant que
 * `requireAuth` n'ait posé `req.user`. Lire l'utilisateur dans le sérialiseur de `req` donnait donc toujours `undefined`
 * (aucune requête n'était rattachable à un compte). `customProps` est évalué à la FIN de la requête, quand l'identité
 * est connue.
 *
 * Confidentialité : seul l'identifiant opaque du compte est ajouté. Jamais d'en-tête (Authorization, Cookie), de jeton,
 * de corps de requête, de mot de passe, d'adresse e-mail ni d'adresse IP.
 */

/** Identifiants attendus : cuid / uuid (lettres, chiffres, tiret, souligné). Toute autre valeur est ignorée. */
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** Identifiant du compte authentifié porté par la requête, ou undefined (route publique, jeton refusé…). */
export function authenticatedUserId(req: unknown): string | undefined {
  const user = (req as { user?: { userId?: unknown } } | undefined)?.user;
  const id = user?.userId;
  return typeof id === "string" && SAFE_ID.test(id) ? id : undefined;
}

export function createRequestLogger(logger: Logger) {
  return pinoHttp({
    logger,
    customLogLevel(_req, res, err) {
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
    customSuccessMessage(req, res) {
      return `${req.method} ${req.url} ${res.statusCode}`;
    },
    // Évalué à la fin de la requête : l'identité est alors connue (voir l'en-tête).
    customProps(req: IncomingMessage) {
      const userId = authenticatedUserId(req);
      return userId ? { userId } : {};
    },
    serializers: {
      req(req) {
        return { method: req.method, url: req.url };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  });
}

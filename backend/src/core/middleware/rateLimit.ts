import rateLimit from "express-rate-limit";
import { env } from "../../config/env";

/** Limite générale */
export const generalRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "TOO_MANY_REQUESTS", message: "Trop de requêtes — réessaie plus tard" } },
  skip: () => env.NODE_ENV === "test",
});

/** Limite stricte pour l'auth (register, login) */
export const authRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_AUTH_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "TOO_MANY_REQUESTS", message: "Trop de tentatives d'authentification" } },
  keyGenerator: (req) => req.ip ?? "unknown",
  skip: (req) => {
    if (env.NODE_ENV === "test") return true;

    const isStaging = process.env.RENDER_SERVICE_NAME === "jeutaime-staging";
    const email = (req.body as any)?.email;
    const isTestEmail = typeof email === "string" && email.endsWith("@jeutaime.test");

    return isStaging && isTestEmail;
  },
  handler: (_req, res, _next, options) => {
    res.status(options.statusCode).json({
      error: {
        code: "TOO_MANY_REQUESTS",
        message: "Trop de tentatives d'authentification",
      },
    });
  },
});

function userOrIpKey(req: unknown): string {
  const request = req as Record<string, unknown>;
  const user = request["user"] as Record<string, unknown> | undefined;
  if (user?.["userId"]) return String(user["userId"]);
  const ip = request["ip"];
  return typeof ip === "string" ? ip : "unknown";
}

/** Limite pour envoi de lettres (20/h/user) */
export const lettersRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_LETTERS_WINDOW_MS,
  max: env.RATE_LIMIT_LETTERS_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "TOO_MANY_REQUESTS", message: "Limite d'envoi de lettres atteinte" } },
  keyGenerator: userOrIpKey as never,
  skip: () => env.NODE_ENV === "test",
});

/** Limite pour signalements (5/h/user) */
export const reportsRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_REPORTS_WINDOW_MS,
  max: env.RATE_LIMIT_REPORTS_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "TOO_MANY_REQUESTS", message: "Limite de signalements atteinte" } },
  keyGenerator: userOrIpKey as never,
  skip: () => env.NODE_ENV === "test",
});

/** Limite pour création de tickets support (5/h/user). */
export const supportTicketsRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_REPORTS_WINDOW_MS,
  max: env.RATE_LIMIT_REPORTS_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Trop de demandes envoyées au support — réessaie plus tard",
    },
  },
  keyGenerator: userOrIpKey as never,
  skip: () => env.NODE_ENV === "test",
});

/** Limite pour upload photos (10/h/user par défaut) */
export const photoUploadRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_PHOTO_UPLOAD_WINDOW_MS,
  max: env.RATE_LIMIT_PHOTO_UPLOAD_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "TOO_MANY_REQUESTS", message: "Limite d'upload photos atteinte" } },
  keyGenerator: userOrIpKey as never,
  skip: () => env.NODE_ENV === "test",
});

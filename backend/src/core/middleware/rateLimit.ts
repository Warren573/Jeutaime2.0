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
    // Skip rate limit for test environment
    if (env.NODE_ENV === "test") return true;

    // Skip rate limit for staging + test emails
    const isStaging = process.env.RENDER_SERVICE_NAME === "jeutaime-staging";
    const email = (req.body as any)?.email;
    const isTestEmail = email && email.includes("@jeutaime.test");

    if (isStaging && isTestEmail) {
      console.log("[authRateLimit] Skipped for test email on staging:", email);
      return true;
    }

    return false;
  },
  handler: (req, res, next, options) => {
    console.log("[authRateLimit] Rate limit triggered for:", (req.body as any)?.email || req.ip);
    res.status(options.statusCode).json({
      error: {
        code: "TOO_MANY_REQUESTS",
        message: "Trop de tentatives d'authentification",
      },
      _debug: {
        AUTH_RATE_LIMIT_TRIGGERED: true,
      },
    });
  },
});

/** Limite pour envoi de lettres (20/h/user) */
export const lettersRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_LETTERS_WINDOW_MS,
  max: env.RATE_LIMIT_LETTERS_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "TOO_MANY_REQUESTS", message: "Limite d'envoi de lettres atteinte" } },
  keyGenerator: (req) => (req as unknown as Record<string, unknown>)["user"]
    ? String(((req as unknown as Record<string, unknown>)["user"] as Record<string, unknown>)["userId"])
    : (req.ip ?? "unknown"),
  skip: () => env.NODE_ENV === "test",
});

/** Limite pour signalements (5/h/user) */
export const reportsRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_REPORTS_WINDOW_MS,
  max: env.RATE_LIMIT_REPORTS_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "TOO_MANY_REQUESTS", message: "Limite de signalements atteinte" } },
  keyGenerator: (req) => (req as unknown as Record<string, unknown>)["user"]
    ? String(((req as unknown as Record<string, unknown>)["user"] as Record<string, unknown>)["userId"])
    : (req.ip ?? "unknown"),
  skip: () => env.NODE_ENV === "test",
});

/** Limite pour upload photos (10/h/user par défaut) */
export const photoUploadRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_PHOTO_UPLOAD_WINDOW_MS,
  max: env.RATE_LIMIT_PHOTO_UPLOAD_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "TOO_MANY_REQUESTS", message: "Limite d'upload photos atteinte" } },
  keyGenerator: (req) => (req as unknown as Record<string, unknown>)["user"]
    ? String(((req as unknown as Record<string, unknown>)["user"] as Record<string, unknown>)["userId"])
    : (req.ip ?? "unknown"),
  skip: () => env.NODE_ENV === "test",
});

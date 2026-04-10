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
  skip: () => env.NODE_ENV === "test",
});

/** Limite pour envoi de lettres (20/h/user) */
export const lettersRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_LETTERS_WINDOW_MS,
  max: env.RATE_LIMIT_LETTERS_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "TOO_MANY_REQUESTS", message: "Limite d'envoi de lettres atteinte" } },
  keyGenerator: (req) => (req as Record<string, unknown>)["user"]
    ? String(((req as Record<string, unknown>)["user"] as Record<string, unknown>)["userId"])
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
  keyGenerator: (req) => (req as Record<string, unknown>)["user"]
    ? String(((req as Record<string, unknown>)["user"] as Record<string, unknown>)["userId"])
    : (req.ip ?? "unknown"),
  skip: () => env.NODE_ENV === "test",
});

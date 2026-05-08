import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  API_PREFIX: z.string().default("/api"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL est requis"),

  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET doit faire ≥ 32 chars"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET doit faire ≥ 32 chars"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),

  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  CORS_ORIGINS: z.string().default("http://localhost:8081"),

  UPLOAD_DIR: z.string().default("./storage/photos"),
  MAX_FILE_SIZE_MB: z.coerce.number().int().positive().default(5),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_LETTERS_MAX: z.coerce.number().int().positive().default(20),
  RATE_LIMIT_LETTERS_WINDOW_MS: z.coerce.number().int().positive().default(3_600_000),
  RATE_LIMIT_REPORTS_MAX: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_REPORTS_WINDOW_MS: z.coerce.number().int().positive().default(3_600_000),
  RATE_LIMIT_PHOTO_UPLOAD_MAX: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_PHOTO_UPLOAD_WINDOW_MS: z.coerce.number().int().positive().default(3_600_000),

  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  // ----- Scheduler (Phase 9 — Events / Cron) -----
  // Opt-in : off par défaut pour rester compatible avec dev/tests/local.
  ENABLE_SCHEDULER: z
    .string()
    .default("false")
    .transform((v) => v.toLowerCase() === "true"),
  SCHEDULER_INTERVAL_MS: z.coerce.number().int().positive().default(300_000), // 5 min
  REFRESH_TOKEN_PURGE_GRACE_MS: z.coerce.number().int().min(0).default(3_600_000), // 1h
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`❌ Variables d'environnement invalides :\n${issues}`);
}

export const env = parsed.data;

export const corsOrigins = env.CORS_ORIGINS.split(",").map((s) => s.trim());

export function corsOriginCallback(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
): void {
  // Requests with no Origin (mobile apps, curl, server-to-server)
  if (!origin) return callback(null, true);
  // Explicitly configured origins (localhost dev, custom domains)
  if (corsOrigins.includes(origin)) return callback(null, true);
  // Any Vercel deployment — covers preview and production URLs
  if (origin.endsWith(".vercel.app")) return callback(null, true);
  // localhost with any port
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
  callback(new Error(`CORS: origin not allowed — ${origin}`));
}

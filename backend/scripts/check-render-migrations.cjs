// Fail fast on missing database connection settings before invoking Prisma migrate deploy.
// Never mark migrations as applied automatically: that operation needs an explicit
// review of the existing _prisma_migrations history.
const needed = ["DATABASE_URL", "DIRECT_URL"];
const missing = needed.filter((key) => !process.env[key]);
if (missing.length) {
  console.error("[startup] Missing required database environment variables: " + missing.join(", "));
  process.exit(1);
}
for (const key of needed) {
  try {
    const parsed = new URL(process.env[key]);
    if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
      throw new Error("unsupported protocol");
    }
  } catch {
    console.error("[startup] Invalid PostgreSQL connection URL in " + key);
    process.exit(1);
  }
}
console.log("[startup] PostgreSQL connection variables are configured; running prisma migrate deploy without auto-resolve.");

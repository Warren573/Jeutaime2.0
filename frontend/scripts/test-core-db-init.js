const { execSync } = require("node:child_process");
const path = require("node:path");

const branch = process.env.VERCEL_GIT_COMMIT_REF || "";
const vercelEnv = process.env.VERCEL_ENV || "";

if (branch !== "test-core" || vercelEnv !== "preview") {
  console.log(`[TEST-CORE INIT] skipped (branch=${branch || "?"}, env=${vercelEnv || "?"})`);
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error("[TEST-CORE INIT] DATABASE_URL missing on test-core Preview");
  process.exit(1);
}

const backendDir = path.resolve(__dirname, "../../backend");
const env = { ...process.env, NODE_ENV: "test" };

function run(command) {
  console.log(`[TEST-CORE INIT] ${command}`);
  execSync(command, { cwd: backendDir, stdio: "inherit", env });
}

run("npm ci --no-audit --no-fund");
run("npx ts-node scripts/assert-test-core-db.ts");
run("npx prisma generate");
run("npx prisma db push");
run("npx ts-node prisma/seed-test-core.ts");
run("npx tsc --project tsconfig.json");

console.log("[TEST-CORE INIT] database schema + fake users + backend build ready");

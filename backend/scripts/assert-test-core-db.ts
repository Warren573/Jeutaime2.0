const raw = process.env.DATABASE_URL ?? "";
const nodeEnv = process.env.NODE_ENV ?? "";
const vercelEnv = process.env.VERCEL_ENV ?? "";
const gitRef = process.env.VERCEL_GIT_COMMIT_REF ?? "";

const EXPECTED_NEON_HOST = "ep-billowing-sea-b2drg4rj-pooler.c-6.eu-central-1.aws.neon.tech";

function fail(message: string): never {
  console.error(`\n[TEST-CORE BLOCKED] ${message}\n`);
  process.exit(1);
}

if (nodeEnv !== "test") {
  fail(`NODE_ENV doit être exactement "test" (actuel: "${nodeEnv || "vide"}").`);
}

if (!raw) {
  fail("DATABASE_URL est absente.");
}

let dbName = "";
let hostname = "";
try {
  const url = new URL(raw);
  dbName = url.pathname.replace(/^\//, "").toLowerCase();
  hostname = url.hostname.toLowerCase();
} catch {
  fail("DATABASE_URL n'est pas une URL PostgreSQL valide.");
}

if (/prod|production|jeutaime_main/i.test(dbName)) {
  fail(`Nom de base potentiellement production refusé: "${dbName}".`);
}

const namedTestDb = /(test|staging|sandbox|dev)/i.test(dbName);
const dedicatedNeonPreview =
  dbName === "neondb" &&
  hostname === EXPECTED_NEON_HOST &&
  vercelEnv === "preview" &&
  gitRef === "test-core";

if (!namedTestDb && !dedicatedNeonPreview) {
  fail(`Base refusée: "${dbName}" sur "${hostname}". Elle ne correspond pas à l'environnement TEST autorisé.`);
}

console.log(`[TEST-CORE SAFE] Base autorisée: ${dbName} @ ${hostname}`);

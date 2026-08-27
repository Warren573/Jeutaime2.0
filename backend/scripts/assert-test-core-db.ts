const raw = process.env.DATABASE_URL ?? "";
const nodeEnv = process.env.NODE_ENV ?? "";

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
try {
  const url = new URL(raw);
  dbName = url.pathname.replace(/^\//, "").toLowerCase();
} catch {
  fail("DATABASE_URL n'est pas une URL PostgreSQL valide.");
}

const safeName = /(test|staging|sandbox|dev)/i.test(dbName);
if (!safeName) {
  fail(`Nom de base refusé: "${dbName}". La base TEST doit contenir test/staging/sandbox/dev dans son nom.`);
}

if (/prod|production|jeutaime_main/i.test(dbName)) {
  fail(`Nom de base potentiellement production refusé: "${dbName}".`);
}

console.log(`[TEST-CORE SAFE] Base autorisée: ${dbName}`);

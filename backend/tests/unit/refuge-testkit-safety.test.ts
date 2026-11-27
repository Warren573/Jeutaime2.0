import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { redactSecrets } from "../../scripts/refuge-testkit";

/** Garde-fous statiques de l'outil de test accéléré : secret, déclenchement, journaux, API publique. */
const ROOT = resolve(__dirname, "../../..");
const WORKFLOWS = join(ROOT, ".github/workflows");
const WF = readFileSync(join(WORKFLOWS, "refuge-accelerated-test.yml"), "utf8");
const SCRIPT = readFileSync(join(ROOT, "backend/scripts/refuge-accelerated-test.ts"), "utf8");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (name !== "node_modules") walk(p, out); } else out.push(p);
  }
  return out;
}

describe("workflow : déclenchement, branche, environnement, concurrence", () => {
  it("uniquement workflow_dispatch : jamais push, PR, planning ni workflow_run", () => {
    const on = WF.slice(WF.indexOf("\non:"), WF.indexOf("\npermissions:"));
    expect(on).toMatch(/workflow_dispatch:/);
    for (const t of ["push:", "pull_request", "schedule:", "workflow_run", "repository_dispatch", "workflow_call"]) expect(on.includes(t), t).toBe(false);
  });
  it("main uniquement (condition du job ET garde en première étape)", () => {
    expect(WF).toMatch(/if: github\.ref == 'refs\/heads\/main'/);
    expect(WF).toMatch(/GITHUB_REF" != "refs\/heads\/main"/);
  });
  it("environnement refuge-test obligatoire (approbation manuelle configurée dans GitHub)", () => {
    expect(WF).toMatch(/environment: refuge-test/);
  });
  it("deux exécutions simultanées impossibles, sans annulation en cours", () => {
    expect(WF).toMatch(/concurrency:\s+group: refuge-accelerated-test\s+cancel-in-progress: false/);
  });
  it("droits minimaux, aucune écriture sur le dépôt", () => {
    expect(WF).toMatch(/permissions:\s+contents: read/);
    expect(WF).not.toMatch(/(contents|actions|id-token|packages): write/);
  });
});

describe("secret REFUGE_TEST_DATABASE_URL", () => {
  it("référencé par ce seul workflow", () => {
    const users = readdirSync(WORKFLOWS).filter((f) => readFileSync(join(WORKFLOWS, f), "utf8").includes("REFUGE_TEST_DATABASE_URL"));
    expect(users).toEqual(["refuge-accelerated-test.yml"]);
  });
  it("jamais exposé aux étapes d'installation ni écrit dans un journal", () => {
    const steps = WF.split(/\n      - /);
    for (const step of steps) {
      if (/npm ci|prisma generate|checkout|setup-node|Garde/.test(step)) expect(step.includes("secrets."), step.slice(0, 40)).toBe(false);
    }
    for (const forbidden of ["set -x", "printenv", "run: env", "echo ${{ secrets", "echo \"$DATABASE_URL", "::add-mask::"]) expect(WF.includes(forbidden), forbidden).toBe(false);
    expect(WF.match(/secrets\.REFUGE_TEST_DATABASE_URL/g)?.length).toBe(3); // présence, DATABASE_URL, DIRECT_URL
  });
  it("le filtre de sortie (stdout ET stderr, donc aussi les erreurs de Prisma) est le premier import du script", () => {
    const firstImport = SCRIPT.split("\n").find((l) => l.startsWith("import "));
    expect(firstImport).toMatch(/"\.\/redact-output"/);
    const filter = readFileSync(join(ROOT, "backend/scripts/redact-output.ts"), "utf8");
    expect(filter).toMatch(/process\.stdout, process\.stderr/);
  });
  it("le script n'écrit jamais l'URL de connexion : seul le filtre de journaux la lit", () => {
    const reads = SCRIPT.match(/process\.env\["(DATABASE_URL|DIRECT_URL)"\]/g) ?? [];
    expect(reads.length).toBe(4); // 2 dans le filtre de journaux, 2 dans le gestionnaire d'erreurs imprévues
    expect(SCRIPT).toMatch(/const safe = redactSecrets\(l, urls\)/);
    expect(SCRIPT.match(/console\.log\(/g)?.length).toBe(2); // journal filtré et gestionnaire d’erreurs filtré
  });
});

describe("filtre des journaux", () => {
  const URL_ = "postgresql://neondb_owner:p%40ss-w0rd!x@ep-cool-sky-123456.eu-west-2.aws.neon.tech/jeutaime?sslmode=require";
  it("masque l'URL complète, l'hôte, l'utilisateur, le mot de passe et la base", () => {
    const msg = `Can't reach database server at \`ep-cool-sky-123456.eu-west-2.aws.neon.tech:5432\` (user neondb_owner, password p@ss-w0rd!x, db jeutaime) ${URL_}`;
    const safe = redactSecrets(msg, [URL_]);
    for (const piece of ["ep-cool-sky-123456", "neon.tech", "neondb_owner", "p@ss-w0rd", "p%40ss", "jeutaime?", URL_]) expect(safe.includes(piece), piece).toBe(false);
  });
  it("masque aussi toute URL postgres:// inconnue et la seconde URL (DIRECT_URL)", () => {
    const direct = "postgres://u2:secret2@db2.example.org:5432/other";
    const safe = redactSecrets(`échec ${direct} et postgres://x:y@z.io/db`, [URL_, direct]);
    expect(safe).not.toMatch(/secret2|db2\.example|x:y@z\.io/);
  });
  it("laisse intact un texte sans secret", () => {
    expect(redactSecrets("✅ pièces du compagnon conformes — attendu 50, constaté 50", [URL_])).toBe("✅ pièces du compagnon conformes — attendu 50, constaté 50");
    expect(redactSecrets("texte", [undefined])).toBe("texte");
  });
});

describe("l'outil n'est joignable depuis aucune route de l'API", () => {
  const src = walk(join(ROOT, "backend/src")).filter((f) => f.endsWith(".ts"));
  it("aucun fichier de l'API n'importe le script, son kit ou le dossier scripts", () => {
    for (const f of src) {
      const text = readFileSync(f, "utf8");
      expect(/refuge-accelerated-test|refuge-testkit|from ["'][./]*\/scripts\//.test(text), f).toBe(false);
    }
  });
  it("le script est hors du projet compilé (src/) et ne s'exécute que lancé directement", () => {
    expect(SCRIPT).toMatch(/if \(require\.main === module\) void main\(\)/);
    expect(JSON.parse(readFileSync(join(ROOT, "backend/tsconfig.json"), "utf8").replace(/\/\/.*$/gm, "")).include).toEqual(["src/**/*"]);
  });
  it("aucun script npm ni démarrage de production ne l'appelle", () => {
    const pkg = readFileSync(join(ROOT, "backend/package.json"), "utf8");
    expect(pkg.includes("refuge-accelerated")).toBe(false);
  });
});

describe("essai réel : une connexion impossible ne laisse fuiter aucun élément de l'URL", () => {
  it("stdout et stderr (erreurs de Prisma comprises) sont filtrés", () => {
    const url = "postgresql://neondb_owner:pw123456secret@ep-unreachable-xyz.invalid:5432/jeutaime?sslmode=require";
    const r = spawnSync("npx", ["ts-node", "--transpile-only", "scripts/refuge-accelerated-test.ts"], {
      cwd: join(ROOT, "backend"), encoding: "utf8", timeout: 90000,
      env: { PATH: process.env["PATH"] ?? "", HOME: process.env["HOME"] ?? "", NODE_ENV: "production", LOG_LEVEL: "warn", DATABASE_URL: url, DIRECT_URL: url, JWT_ACCESS_SECRET: "x".repeat(40), JWT_REFRESH_SECRET: "y".repeat(40), RT_COMMAND: "inventory" },
    });
    const all = `${r.stdout}\n${r.stderr}`;
    expect(r.status).toBe(1);
    for (const piece of ["ep-unreachable", "pw123456", "neondb_owner", ".invalid", "postgresql://"]) expect(all.includes(piece), piece).toBe(false);
  }, 100000);
});

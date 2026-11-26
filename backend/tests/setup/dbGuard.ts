/**
 * Garde d'isolation des tests : AUCUN test automatisé ne doit pouvoir écrire dans la base de l'application.
 *
 * Constat à l'origine de cette garde : les tests d'intégration s'activent si TEST_DATABASE_URL est défini, mais le client
 * Prisma lit DATABASE_URL (variable d'environnement ou fichier .env). Rien ne vérifiait que les deux désignaient la même
 * base, ni que celle-ci était locale : un poste dont le .env pointe vers Neon exécutait donc les tests contre Neon.
 *
 * Règles (toutes obligatoires, sinon le démarrage des tests est refusé AVANT toute connexion) :
 *   1. DATABASE_URL (et DIRECT_URL si définie) vise une machine LOCALE (localhost, 127.0.0.1, ::1) — jamais un
 *      service hébergé (Neon, Render, AWS…) ;
 *   2. le nom de la base contient « test » (ou vaut « unused », base factice des jobs sans base) ;
 *   3. si TEST_DATABASE_URL est défini, il est identique à DATABASE_URL (même hôte, port et base) ;
 *   4. hôtes supplémentaires explicitement autorisés : variable TEST_DB_EXTRA_HOSTS (ex. « postgres » pour un conteneur).
 */
export interface GuardEnv {
  DATABASE_URL?: string;
  DIRECT_URL?: string;
  TEST_DATABASE_URL?: string;
  TEST_DB_EXTRA_HOSTS?: string;
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const HOSTED = /(neon\.tech|render\.com|amazonaws\.com|supabase\.co|railway\.app|azure\.com|googleusercontent\.com|cockroachlabs\.cloud|planetscale\.com)/i;

interface Parsed { host: string; port: string; db: string }

function parse(label: string, raw: string): Parsed {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error(`${label} n'est pas une URL valide (valeur non affichée par sécurité).`);
  }
  return { host: u.hostname.toLowerCase(), port: u.port || "5432", db: decodeURIComponent(u.pathname.replace(/^\//, "")) };
}

export function assertTestDatabaseIsolated(env: GuardEnv): void {
  const extra = new Set((env.TEST_DB_EXTRA_HOSTS ?? "").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean));
  const check = (label: string, raw: string | undefined): Parsed | null => {
    if (!raw) return null;
    const p = parse(label, raw);
    if (HOSTED.test(p.host) || !(LOCAL_HOSTS.has(p.host) || extra.has(p.host))) {
      throw new Error(
        `TESTS REFUSÉS : ${label} vise « ${p.host} », qui n'est pas une base locale de test. ` +
          `Les tests ne doivent jamais écrire dans la base de l'application. Utilisez une base PostgreSQL locale jetable ` +
          `(ex. postgresql://postgres:postgres@localhost:5432/jeutaime_test) et retirez toute URL distante de backend/.env.`
      );
    }
    if (!/test/i.test(p.db) && p.db !== "unused") {
      throw new Error(`TESTS REFUSÉS : le nom de base de ${label} (« ${p.db} ») ne contient pas « test ».`);
    }
    return p;
  };

  const app = check("DATABASE_URL", env.DATABASE_URL);
  check("DIRECT_URL", env.DIRECT_URL);
  const test = check("TEST_DATABASE_URL", env.TEST_DATABASE_URL);

  if (test && app && (test.host !== app.host || test.port !== app.port || test.db !== app.db)) {
    throw new Error(
      "TESTS REFUSÉS : TEST_DATABASE_URL et DATABASE_URL désignent deux bases différentes. Le client Prisma utilise " +
        "DATABASE_URL : les tests écriraient dans une autre base que celle annoncée."
    );
  }
  if (test && !app) {
    throw new Error("TESTS REFUSÉS : TEST_DATABASE_URL est défini mais DATABASE_URL ne l'est pas.");
  }
}

import { describe, expect, it } from "vitest";
import { assertTestDatabaseIsolated } from "../setup/dbGuard";

const LOCAL = "postgresql://postgres:postgres@localhost:5432/jeutaime_test";
const NEON = "postgresql://user:secret@ep-cool-123.eu-central-1.aws.neon.tech/neondb?sslmode=require";
const refuse = (env: Parameters<typeof assertTestDatabaseIsolated>[0]) => expect(() => assertTestDatabaseIsolated(env)).toThrow(/TESTS REFUSÉS/);

describe("garde d'isolation des tests : jamais la base de l'application", () => {
  it("accepte une base locale de test (CI, poste)", () => {
    expect(() => assertTestDatabaseIsolated({ DATABASE_URL: LOCAL, TEST_DATABASE_URL: LOCAL })).not.toThrow();
    expect(() => assertTestDatabaseIsolated({ DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:5432/jeutaime_test", DIRECT_URL: LOCAL })).not.toThrow();
    expect(() => assertTestDatabaseIsolated({ DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/unused" })).not.toThrow(); // base factice
    expect(() => assertTestDatabaseIsolated({ DATABASE_URL: "postgresql://test:test@localhost:5432/test" })).not.toThrow();
    expect(() => assertTestDatabaseIsolated({})).not.toThrow(); // rien à protéger (aucune base configurée)
  });

  it("refuse Neon, Render et tout hôte distant — même si TEST_DATABASE_URL est local", () => {
    refuse({ DATABASE_URL: NEON });
    refuse({ DATABASE_URL: NEON, TEST_DATABASE_URL: LOCAL }); // le cas dangereux d'origine : .env → Neon
    refuse({ DATABASE_URL: LOCAL, DIRECT_URL: NEON }); // la connexion directe aussi
    refuse({ DATABASE_URL: "postgresql://u:p@dpg-abc.oregon-postgres.render.com/jeutaime_test" });
    refuse({ DATABASE_URL: "postgresql://u:p@10.0.0.5:5432/jeutaime_test" }); // machine distante quelconque
  });

  it("refuse une base dont le nom n'évoque pas un test (même en local)", () => {
    refuse({ DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/jeutaime" });
    refuse({ DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/neondb" });
  });

  it("refuse TEST_DATABASE_URL différente de DATABASE_URL, ou seule", () => {
    refuse({ DATABASE_URL: LOCAL, TEST_DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/autre_test" });
    refuse({ DATABASE_URL: LOCAL, TEST_DATABASE_URL: "postgresql://postgres:postgres@localhost:5433/jeutaime_test" });
    refuse({ TEST_DATABASE_URL: LOCAL });
  });

  it("autorise un hôte de conteneur uniquement s'il est déclaré", () => {
    const url = "postgresql://postgres:postgres@postgres:5432/jeutaime_test";
    refuse({ DATABASE_URL: url });
    expect(() => assertTestDatabaseIsolated({ DATABASE_URL: url, TEST_DB_EXTRA_HOSTS: "postgres" })).not.toThrow();
  });

  it("le message d'erreur ne divulgue ni mot de passe ni identifiant", () => {
    try {
      assertTestDatabaseIsolated({ DATABASE_URL: NEON });
    } catch (e) {
      expect(String((e as Error).message)).not.toMatch(/secret|user:|neondb\?/);
    }
    try {
      assertTestDatabaseIsolated({ DATABASE_URL: "pas une url secret123" });
    } catch (e) {
      expect(String((e as Error).message)).not.toContain("secret123");
    }
  });
});

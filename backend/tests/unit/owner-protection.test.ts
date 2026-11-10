import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * Protection du compte propriétaire (OWNER) et des comptes privilégiés.
 *
 * 1. ensureBootstrapAdmin ne rétrograde ni ne réinitialise jamais un OWNER.
 * 2. Aucun mot de passe en clair dans le seed ni dans le script de comptes de test.
 * 3. L'API d'administration ne permet pas d'attribuer le rôle OWNER.
 */

const prismaMock = {
  user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
};
vi.mock("../../src/config/prisma", () => ({ prisma: prismaMock }));
vi.mock("../../src/core/utils/hash", () => ({
  hashPassword: vi.fn(async () => "hash-de-test"),
}));

async function loadBootstrap() {
  vi.resetModules();
  return import("../../src/modules/admin/adminBootstrap.service");
}

describe("ensureBootstrapAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ADMIN_BOOTSTRAP_EMAIL", "Proprietaire@Exemple.fr");
    vi.stubEnv("ADMIN_BOOTSTRAP_PASSWORD", "valeur-de-test-non-secrete");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("ne modifie jamais un compte OWNER existant (ni rôle, ni mot de passe)", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "owner-1", role: "OWNER", passwordHash: "h" });
    const { ensureBootstrapAdmin } = await loadBootstrap();

    await ensureBootstrapAdmin();

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "proprietaire@exemple.fr" } }),
    );
    expect(prismaMock.user.update).not.toHaveBeenCalled();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("promeut en ADMIN un compte non propriétaire existant — jamais en OWNER", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u-1", role: "USER", passwordHash: "h" });
    const { ensureBootstrapAdmin } = await loadBootstrap();

    await ensureBootstrapAdmin();

    expect(prismaMock.user.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.user.update.mock.calls[0]![0].data.role).toBe("ADMIN");
  });

  it("crée un ADMIN — jamais un OWNER — si le compte n'existe pas", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const { ensureBootstrapAdmin } = await loadBootstrap();

    await ensureBootstrapAdmin();

    expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.user.create.mock.calls[0]![0].data.role).toBe("ADMIN");
  });

  it("ne fait rien sans variables d'environnement", async () => {
    vi.stubEnv("ADMIN_BOOTSTRAP_EMAIL", "");
    vi.stubEnv("ADMIN_BOOTSTRAP_PASSWORD", "");
    const { ensureBootstrapAdmin } = await loadBootstrap();

    await ensureBootstrapAdmin();

    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });
});

describe("aucun mot de passe en clair dans les scripts de comptes", () => {
  const files = ["prisma/seed.js", "prisma/seed.ts", "scripts/reset-test-users.ts"];

  it.each(files)("%s ne contient aucun littéral de mot de passe", (file) => {
    const source = readFileSync(resolve(__dirname, "../..", file), "utf8");
    // password: "quelque chose" ou password: 'quelque chose' (non vide)
    expect(source).not.toMatch(/password\s*:\s*["'`][^"'`]+["'`]/);
  });

  it("le seed n'écrit pas le mot de passe dans les journaux", () => {
    for (const file of ["prisma/seed.js", "prisma/seed.ts"]) {
      const source = readFileSync(resolve(__dirname, "../..", file), "utf8");
      expect(source).not.toMatch(/console\.log\([^)]*TEST_USER\.password/);
    }
  });

  it("le script de comptes de test ne supprime que des comptes au rôle USER", () => {
    const source = readFileSync(resolve(__dirname, "../..", "scripts/reset-test-users.ts"), "utf8");
    expect(source).toMatch(/\{ role: "USER" \},/);
  });
});

describe("attribution des rôles par l'API d'administration", () => {
  it("le schéma de changement de rôle refuse OWNER", async () => {
    const schemas = await import("../../src/modules/admin/users/adminUsers.schemas");
    const roleSchema = Object.values(schemas).find(
      (s: any) => typeof s?.safeParse === "function" && s.safeParse({ role: "ADMIN" }).success,
    ) as any;
    expect(roleSchema).toBeDefined();
    expect(roleSchema.safeParse({ role: "ADMIN" }).success).toBe(true);
    expect(roleSchema.safeParse({ role: "OWNER" }).success).toBe(false);
  });
});

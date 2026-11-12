import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.TWO_FACTOR_ENCRYPTION_KEY = "cle-de-test-uniquement-0123456789abcdef";
});

import request from "supertest";
import app from "../../src/app";
import { env } from "../../src/config/env";
import { prisma } from "../../src/config/prisma";
import { hashPassword } from "../../src/core/utils/hash";
import * as auth from "../../src/modules/auth/auth.service";
import * as sec from "../../src/modules/auth/security/accountSecurity.core";
import { totpCodeAt } from "../../src/modules/auth/security/totp";
import { MemoryTransport, setMailTransport } from "../../src/modules/mail/mailer";
import { exportPersonalData } from "../../src/modules/auth/dataExport.service";

/**
 * Double authentification obligatoire pour OWNER et ADMIN — parcours HTTP complet.
 * Nécessite TEST_DATABASE_URL. Aucun e-mail réel : boîte simulée.
 */
const test = process.env.TEST_DATABASE_URL ? it : it.skip;

// Chaque compte de test exige des hachages de mots de passe : les parcours longs dépassent 5 s sous charge.
vi.setConfig({ testTimeout: 60_000 });
const DAY = 24 * 60 * 60 * 1000;
const run = Date.now() + "-" + Math.random().toString(36).slice(2, 7);
const PASSWORD = "Depart-" + run + "-Aa1";
const users: string[] = [];
let n = 0;
const mailbox = new MemoryTransport();

/** Place l'activation de l'obligation à `daysAgo` jours dans le passé (négatif : dans le futur, undefined : pas d'activation). */
function enforcementStartedDaysAgo(daysAgo: number | undefined) {
  (env as { TWO_FACTOR_ENFORCEMENT_START: Date | undefined }).TWO_FACTOR_ENFORCEMENT_START =
    daysAgo === undefined ? undefined : new Date(Date.now() - daysAgo * DAY);
}

async function account(role: "USER" | "MODERATOR" | "ADMIN" | "OWNER", opts: { since?: Date } = {}) {
  const id = `enf-${run}-${++n}`;
  const email = `${id}@test.local`;
  users.push(id);
  await prisma.user.create({
    data: {
      id,
      email,
      role,
      privilegedRoleSince: opts.since ?? null,
      passwordHash: await hashPassword(PASSWORD),
      wallet: { create: {} },
      settings: { create: {} },
    },
  });
  return { id, email };
}

async function tokenFor(u: { email: string }, totpCode?: string) {
  return (await auth.login({ email: u.email, password: PASSWORD, totpCode })).accessToken;
}
const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
const adminRoute = (t: string) => request(app).get("/api/admin/overview").set(bearer(t));
const moderatorRoute = (t: string) => request(app).get("/api/admin/reports").set(bearer(t));

/** Active la double authentification d'un compte et renvoie le secret et les codes de secours. */
async function enroll(u: { id: string }) {
  const { secret } = await sec.setupTwoFactor(u.id, PASSWORD);
  const { backupCodes } = await sec.enableTwoFactor(u.id, totpCodeAt(secret, Date.now()));
  return { secret, backupCodes };
}

beforeAll(() => setMailTransport(mailbox));
afterAll(async () => {
  enforcementStartedDaysAgo(undefined);
  if (!process.env.TEST_DATABASE_URL) return;
  await prisma.loginEvent.deleteMany({ where: { email: { contains: `enf-${run}` } } });
  await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: users } }, { target: { in: users } }] } });
  await prisma.user.deleteMany({ where: { id: { in: users } } });
});

describe("avant l'activation de l'obligation", () => {
  test("rien n'est bloqué : ADMIN et OWNER sans 2FA accèdent à l'administration", async () => {
    enforcementStartedDaysAgo(undefined);
    const admin = await account("ADMIN");
    const owner = await account("OWNER");
    expect((await adminRoute(await tokenFor(admin))).status).toBe(200);
    expect((await adminRoute(await tokenFor(owner))).status).toBe(200);
    expect((await sec.twoFactorStatus(admin.id)).enforcement).toMatchObject({ state: "not_active", mandatory: false });
  });
});

describe("période de transition de 14 jours (comptes existants)", () => {
  test("ADMIN et OWNER existants gardent l'accès, avec le nombre de jours restants", async () => {
    enforcementStartedDaysAgo(4);
    const admin = await account("ADMIN");
    const owner = await account("OWNER");
    expect((await adminRoute(await tokenFor(admin))).status).toBe(200);
    expect((await adminRoute(await tokenFor(owner))).status).toBe(200);
    expect((await sec.twoFactorStatus(admin.id)).enforcement).toMatchObject({ state: "grace", daysLeft: 10, mandatory: true });
  });

  test("juste avant l'échéance : accès conservé ; juste après : bloqué", async () => {
    const admin = await account("ADMIN");
    const token = await tokenFor(admin);
    enforcementStartedDaysAgo(13.99);
    expect((await adminRoute(token)).status).toBe(200);
    enforcementStartedDaysAgo(14.01);
    const blocked = await adminRoute(token);
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe("TWO_FACTOR_SETUP_REQUIRED");
  });
});

describe("après la période de transition", () => {
  test("ADMIN et OWNER sans 2FA : seules les fonctions d'administration sont bloquées", async () => {
    enforcementStartedDaysAgo(20);
    const admin = await account("ADMIN");
    const owner = await account("OWNER");
    for (const u of [admin, owner]) {
      const t = await tokenFor(u);
      const res = await adminRoute(t);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("TWO_FACTOR_SETUP_REQUIRED");
      expect((await moderatorRoute(t)).status).toBe(403); // route partagée ADMIN/MODERATOR : fermée à l'ADMIN non protégé

      // Le reste de l'application et la configuration de la 2FA restent accessibles.
      expect((await request(app).get("/api/auth/me").set(bearer(t))).status).toBe(200);
      expect((await request(app).get("/api/wallet/me").set(bearer(t))).status).toBe(200);
      expect((await request(app).get("/api/auth/security").set(bearer(t))).body.data.enforcement.state).toBe("blocked");
      expect(
        (await request(app).post("/api/auth/2fa/setup").set(bearer(t)).send({ currentPassword: PASSWORD })).status,
      ).toBe(200);
    }
  });

  test("USER et MODERATOR : 2FA jamais obligatoire ; le MODERATOR garde ses fonctions", async () => {
    enforcementStartedDaysAgo(60);
    const user = await account("USER");
    const mod = await account("MODERATOR");
    const tUser = await tokenFor(user);
    const tMod = await tokenFor(mod);
    expect((await moderatorRoute(tMod)).status).toBe(200);
    expect((await adminRoute(tMod)).status).toBe(403);
    expect((await adminRoute(tMod)).body.error.code).toBe("FORBIDDEN"); // refus de rôle, pas de 2FA
    expect((await adminRoute(tUser)).body.error.code).toBe("FORBIDDEN");
    for (const u of [user, mod]) {
      expect((await sec.twoFactorStatus(u.id)).enforcement.state).toBe("not_required");
      await expect(sec.setupTwoFactor(u.id, PASSWORD)).rejects.toThrow(/réservée/);
      // Aucune 2FA demandée à la connexion.
      await tokenFor(u);
    }
  });

  test("configurer la 2FA rend l'accès immédiatement", async () => {
    enforcementStartedDaysAgo(20);
    const admin = await account("ADMIN");
    const t = await tokenFor(admin);
    expect((await adminRoute(t)).status).toBe(403);
    await enroll(admin);
    expect((await adminRoute(t)).status).toBe(200); // même session, sans nouvelle connexion
  });
});

describe("configuration incomplète du serveur", () => {
  test("sans clé de chiffrement, l'obligation ne bloque personne (sinon la 2FA serait exigée sans pouvoir être configurée)", async () => {
    enforcementStartedDaysAgo(30);
    const mutableEnv = env as { TWO_FACTOR_ENCRYPTION_KEY: string | undefined };
    const key = mutableEnv.TWO_FACTOR_ENCRYPTION_KEY;
    try {
      const admin = await account("ADMIN");
      const t = await tokenFor(admin);
      mutableEnv.TWO_FACTOR_ENCRYPTION_KEY = undefined;
      expect((await adminRoute(t)).status).toBe(200);
      expect((await sec.twoFactorStatus(admin.id)).enforcement.state).toBe("not_active");
      mutableEnv.TWO_FACTOR_ENCRYPTION_KEY = key;
      expect((await adminRoute(t)).status).toBe(403);
    } finally {
      mutableEnv.TWO_FACTOR_ENCRYPTION_KEY = key;
    }
  });
});

describe("sessions existantes", () => {
  test("une session ouverte avant l'échéance est bloquée dès l'échéance, sans se reconnecter", async () => {
    enforcementStartedDaysAgo(undefined);
    const admin = await account("ADMIN");
    const token = await tokenFor(admin);
    const refresh = (await auth.login({ email: admin.email, password: PASSWORD })).refreshToken;
    expect((await adminRoute(token)).status).toBe(200);

    enforcementStartedDaysAgo(30);
    expect((await adminRoute(token)).status).toBe(403);

    // Renouveler le jeton ne contourne rien : le contrôle lit la base à chaque requête.
    const renewed = (await auth.refresh(refresh)).accessToken;
    expect((await adminRoute(renewed)).status).toBe(403);
  });
});

describe("nouveaux ADMIN", () => {
  test("promu par l'OWNER : aucun délai, bloqué jusqu'à la configuration, pendant que les anciens ADMIN sont encore dans leur délai", async () => {
    enforcementStartedDaysAgo(2);
    const owner = await account("OWNER");
    const existingAdmin = await account("ADMIN");
    const candidate = await account("MODERATOR");
    const tOwner = await tokenFor(owner);

    const promote = await request(app)
      .patch(`/api/admin/users/${candidate.id}/role`)
      .set(bearer(tOwner))
      .send({ role: "ADMIN" });
    expect(promote.status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: candidate.id } })).privilegedRoleSince).not.toBeNull();

    const tNew = await tokenFor(candidate);
    const blocked = await adminRoute(tNew);
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe("TWO_FACTOR_SETUP_REQUIRED");
    expect((await adminRoute(await tokenFor(existingAdmin))).status).toBe(200);

    await enroll(candidate);
    expect((await adminRoute(tNew)).status).toBe(200);
  });

  test("rétrogradé puis re-promu : redevient « nouveau », sans nouveau délai", async () => {
    enforcementStartedDaysAgo(2);
    const owner = await account("OWNER");
    const adm = await account("ADMIN"); // existant : en délai
    const tOwner = await tokenFor(owner);
    expect((await adminRoute(await tokenFor(adm))).status).toBe(200);

    await request(app).patch(`/api/admin/users/${adm.id}/role`).set(bearer(tOwner)).send({ role: "MODERATOR" });
    await request(app).patch(`/api/admin/users/${adm.id}/role`).set(bearer(tOwner)).send({ role: "ADMIN" });
    expect((await adminRoute(await tokenFor(adm))).status).toBe(403);
  });

  test("l'OWNER ne peut pas nommer un OWNER ; un ADMIN ne peut pas nommer un ADMIN", async () => {
    enforcementStartedDaysAgo(undefined);
    const owner = await account("OWNER");
    const admin = await account("ADMIN");
    const target = await account("USER");
    const tOwner = await tokenFor(owner);
    expect((await request(app).patch(`/api/admin/users/${target.id}/role`).set(bearer(tOwner)).send({ role: "OWNER" })).status).toBe(400);
    const tAdmin = await tokenFor(admin);
    expect((await request(app).patch(`/api/admin/users/${target.id}/role`).set(bearer(tAdmin)).send({ role: "ADMIN" })).status).toBe(403);
  });
});

describe("jamais de désactivation automatique", () => {
  test("blocage, réinitialisation de mot de passe, rétrogradation et promotion ne désactivent jamais la 2FA", async () => {
    enforcementStartedDaysAgo(undefined);
    const admin = await account("ADMIN");
    await enroll(admin);
    const enabledAt = (await prisma.user.findUniqueOrThrow({ where: { id: admin.id } })).twoFactorEnabledAt;
    expect(enabledAt).not.toBeNull();

    enforcementStartedDaysAgo(90); // l'échéance passe
    await sec.requestPasswordReset(admin.email);
    const token = new URL(mailbox.last("password_reset")!.text.match(/https:\/\/\S+/)![0]).searchParams.get("token")!;
    await sec.resetPassword(token, "Nouveau-" + run + "-Bb2");
    await prisma.user.update({ where: { id: admin.id }, data: { role: "MODERATOR" } });
    await prisma.user.update({ where: { id: admin.id }, data: { role: "ADMIN", privilegedRoleSince: new Date() } });

    const after = await prisma.user.findUniqueOrThrow({ where: { id: admin.id } });
    expect(after.twoFactorEnabledAt).toEqual(enabledAt);
    expect(after.twoFactorSecret).not.toBeNull();
    // et le code est toujours exigé à la connexion
    await expect(auth.login({ email: admin.email, password: "Nouveau-" + run + "-Bb2" })).rejects.toMatchObject({
      code: "TWO_FACTOR_REQUIRED",
    });
  });

  test("la désactivation voulue est interdite une fois l'obligation en vigueur, même avec mot de passe et code valides", async () => {
    enforcementStartedDaysAgo(undefined);
    const owner = await account("OWNER");
    const { backupCodes } = await enroll(owner);

    enforcementStartedDaysAgo(1);
    await expect(sec.disableTwoFactor(owner.id, PASSWORD, backupCodes[0]!)).rejects.toThrow(/obligatoire/);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: owner.id } })).twoFactorEnabledAt).not.toBeNull();
    expect(await prisma.twoFactorBackupCode.count({ where: { userId: owner.id, usedAt: null } })).toBe(10); // code non consommé

    enforcementStartedDaysAgo(undefined);
    await sec.disableTwoFactor(owner.id, PASSWORD, backupCodes[0]!); // avant l'activation : permis
    expect((await prisma.user.findUniqueOrThrow({ where: { id: owner.id } })).twoFactorEnabledAt).toBeNull();
  });
});

describe("codes de secours et changement d'appareil", () => {
  test("10 codes à usage unique ; en régénérer invalide les anciens", async () => {
    enforcementStartedDaysAgo(undefined);
    const admin = await account("ADMIN");
    const { backupCodes } = await enroll(admin);
    expect(backupCodes).toHaveLength(10);

    await expect(sec.regenerateBackupCodes(admin.id, "mauvais", backupCodes[0]!)).rejects.toThrow(/incorrect/);
    const fresh = (await sec.regenerateBackupCodes(admin.id, PASSWORD, backupCodes[0]!)).backupCodes;
    expect(fresh).toHaveLength(10);
    expect(fresh.some((c) => backupCodes.includes(c))).toBe(false);
    await expect(auth.login({ email: admin.email, password: PASSWORD, totpCode: backupCodes[1]! })).rejects.toThrow(/incorrect/);
    await auth.login({ email: admin.email, password: PASSWORD, totpCode: fresh[0]! });
  });

  test("un même code de secours présenté 6 fois en même temps ne connecte qu'une fois", async () => {
    enforcementStartedDaysAgo(undefined);
    const admin = await account("ADMIN");
    const { backupCodes } = await enroll(admin);
    const results = await Promise.allSettled(
      Array.from({ length: 6 }, () => auth.login({ email: admin.email, password: PASSWORD, totpCode: backupCodes[3]! })),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });

  test("un code TOTP ne sert qu'une fois, même présenté en parallèle", async () => {
    enforcementStartedDaysAgo(undefined);
    const admin = await account("ADMIN");
    const { secret } = await enroll(admin);
    const code = totpCodeAt(secret, Date.now() + 30_000);
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => auth.login({ email: admin.email, password: PASSWORD, totpCode: code })),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });

  test("changement d'appareil : code actuel exigé ; l'ancien secret reste valable jusqu'à la confirmation, puis est remplacé", async () => {
    enforcementStartedDaysAgo(1);
    const admin = await account("ADMIN");
    const first = await enroll(admin);

    await expect(sec.setupTwoFactor(admin.id, PASSWORD)).rejects.toThrow(/code actuel/);
    await expect(sec.setupTwoFactor(admin.id, PASSWORD, "000000")).rejects.toThrow(/Code incorrect/);
    const pending = await sec.setupTwoFactor(admin.id, PASSWORD, first.backupCodes[0]!);
    expect(pending.replacing).toBe(true);
    expect(pending.secret).not.toBe(first.secret);

    // Tant que le nouveau secret n'est pas confirmé, le compte reste protégé par l'ancien.
    await auth.login({ email: admin.email, password: PASSWORD, totpCode: first.backupCodes[1]! });
    await expect(auth.login({ email: admin.email, password: PASSWORD, totpCode: totpCodeAt(pending.secret, Date.now()) })).rejects.toThrow();
    expect((await adminRoute(await (async () => {
      return (await auth.login({ email: admin.email, password: PASSWORD, totpCode: first.backupCodes[2]! })).accessToken;
    })())).status).toBe(200);

    const confirmed = await sec.enableTwoFactor(admin.id, totpCodeAt(pending.secret, Date.now()));
    expect(confirmed.backupCodes).toHaveLength(10);
    await expect(auth.login({ email: admin.email, password: PASSWORD, totpCode: first.backupCodes[4]! })).rejects.toThrow(); // anciens codes invalides
    await auth.login({ email: admin.email, password: PASSWORD, totpCode: totpCodeAt(pending.secret, Date.now() + 30_000) });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: admin.id } })).twoFactorPendingSecret).toBeNull();
  });
});

describe("récupération par le propriétaire", () => {
  async function ownerWithTwoFactor() {
    const owner = await account("OWNER");
    const { secret } = await enroll(owner);
    return { owner, secret, nextCode: () => totpCodeAt(secret, Date.now() + 30_000) };
  }
  // Par défaut, l'OWNER retape correctement l'adresse du compte visé (confirmation explicite).
  const reset = (tOwner: string, target: { id: string; email: string }, body: Record<string, unknown>) =>
    request(app)
      .post(`/api/admin/users/${target.id}/two-factor/reset`)
      .set(bearer(tOwner))
      .send({ confirmEmail: target.email, ...body });

  test("anti-rejeu : le code TOTP que l'OWNER vient d'utiliser pour se connecter ne peut pas autoriser la réinitialisation", async () => {
    enforcementStartedDaysAgo(30);
    const { owner, secret } = await ownerWithTwoFactor();
    const admin = await account("ADMIN");
    await enroll(admin);
    const code = totpCodeAt(secret, Date.now() + 30_000);
    const tOwner = await tokenFor(owner, code);

    const res = await reset(tOwner, admin, { password: PASSWORD, code, reason: "Téléphone perdu" });
    expect(res.status).toBe(400);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: admin.id } })).twoFactorEnabledAt).not.toBeNull();
  });

  test("parcours complet avec un code de secours de l'OWNER", async () => {
    enforcementStartedDaysAgo(30);
    const owner = await account("OWNER");
    const { backupCodes } = await enroll(owner);
    const admin = await account("ADMIN");
    const adminCodes = (await enroll(admin)).backupCodes;
    const adminSession = (await auth.login({ email: admin.email, password: PASSWORD, totpCode: adminCodes[0]! })).refreshToken;
    const tOwner = await tokenFor(owner, backupCodes[0]!);

    const wrong = await reset(tOwner, admin, { password: PASSWORD, code: "000000", reason: "Téléphone perdu" });
    expect(wrong.status).toBe(400);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: admin.id } })).twoFactorEnabledAt).not.toBeNull();

    const ok = await reset(tOwner, admin, { password: PASSWORD, code: backupCodes[1]!, reason: "Téléphone perdu" });
    expect(ok.status).toBe(200);

    const after = await prisma.user.findUniqueOrThrow({ where: { id: admin.id } });
    expect(after.twoFactorEnabledAt).toBeNull();
    expect(after.twoFactorSecret).toBeNull();
    expect(after.role).toBe("ADMIN"); // le rôle ne change pas
    expect(await prisma.twoFactorBackupCode.count({ where: { userId: admin.id } })).toBe(0);
    await expect(auth.refresh(adminSession)).rejects.toThrow(); // sessions fermées
    expect(await prisma.auditLog.count({ where: { actorId: owner.id, action: "admin.user.two_factor.reset", target: admin.id } })).toBe(1);
    expect(await prisma.notification.count({ where: { userId: admin.id, type: "SECURITY_ALERT" } })).toBeGreaterThan(0);

    // Le délai est dépassé : l'ADMIN peut se connecter mais reste bloqué tant qu'il n'a pas reconfiguré.
    const tAdmin = await tokenFor(admin);
    expect((await adminRoute(tAdmin)).body.error.code).toBe("TWO_FACTOR_SETUP_REQUIRED");
    await enroll(admin);
    expect((await adminRoute(tAdmin)).status).toBe(200);
  });

  test("tentatives de contournement : ADMIN, OWNER sans 2FA, cible OWNER, soi-même, cible sans 2FA, corps invalide", async () => {
    enforcementStartedDaysAgo(undefined);
    const owner = await account("OWNER");
    const ownerCodes = (await enroll(owner)).backupCodes;
    const otherOwner = await account("OWNER");
    await enroll(otherOwner);
    const admin = await account("ADMIN");
    await enroll(admin);
    const plainAdmin = await account("ADMIN");
    const noTwoFactorOwner = await account("OWNER");
    const user = await account("USER");

    // Un ADMIN, même protégé, ne peut pas utiliser la route.
    const adminCodes = (await prisma.twoFactorBackupCode.count({ where: { userId: admin.id } }));
    expect(adminCodes).toBe(10);
    const tPlainAdmin = await tokenFor(plainAdmin);
    expect((await reset(tPlainAdmin, admin, { password: PASSWORD, code: "123456", reason: "abc" })).status).toBe(403);

    // Un OWNER sans 2FA ne peut pas réinitialiser celle des autres.
    const tNoTf = await tokenFor(noTwoFactorOwner);
    expect((await reset(tNoTf, admin, { password: PASSWORD, code: "123456", reason: "abc" })).status).toBe(403);

    const tOwner = await tokenFor(owner, ownerCodes[0]!);
    expect((await reset(tOwner, otherOwner, { password: PASSWORD, code: ownerCodes[1]!, reason: "abc" })).status).toBe(403); // cible OWNER
    expect((await reset(tOwner, owner, { password: PASSWORD, code: ownerCodes[2]!, reason: "abc" })).status).toBe(400); // soi-même
    expect((await reset(tOwner, user, { password: PASSWORD, code: ownerCodes[3]!, reason: "abc" })).status).toBe(400); // sans 2FA
    expect((await reset(tOwner, admin, { password: PASSWORD, code: ownerCodes[4]!, reason: "x" })).status).toBe(400); // motif trop court
    expect((await reset(tOwner, admin, { password: "mauvais", code: ownerCodes[5]!, reason: "abc" })).status).toBe(401); // mauvais mot de passe
    expect((await reset(tOwner, admin, { password: PASSWORD, code: ownerCodes[6]!, reason: "abc", extra: 1 })).status).toBe(400); // champ inconnu
    expect((await prisma.user.findUniqueOrThrow({ where: { id: admin.id } })).twoFactorEnabledAt).not.toBeNull();
    expect((await prisma.user.findUniqueOrThrow({ where: { id: otherOwner.id } })).twoFactorEnabledAt).not.toBeNull();
  });

  test("vérification renforcée : mauvaise adresse retapée → refus, rien ne change et le code de l'OWNER n'est pas consommé", async () => {
    enforcementStartedDaysAgo(undefined);
    const owner = await account("OWNER");
    const { backupCodes } = await enroll(owner);
    const admin = await account("ADMIN");
    await enroll(admin);
    const tOwner = await tokenFor(owner, backupCodes[0]!);

    for (const wrong of ["autre@test.local", admin.email + ".fr", "", "pas-une-adresse"]) {
      const res = await request(app)
        .post(`/api/admin/users/${admin.id}/two-factor/reset`)
        .set(bearer(tOwner))
        .send({ password: PASSWORD, code: backupCodes[1]!, reason: "Téléphone perdu", confirmEmail: wrong });
      expect(res.status).toBe(400);
    }
    expect((await prisma.user.findUniqueOrThrow({ where: { id: admin.id } })).twoFactorEnabledAt).not.toBeNull();
    // Le code de secours n'a pas été brûlé par les essais ratés : il fonctionne encore.
    expect(await prisma.twoFactorBackupCode.count({ where: { userId: owner.id, usedAt: null } })).toBe(9); // 1 utilisé pour se connecter
    const ok = await request(app)
      .post(`/api/admin/users/${admin.id}/two-factor/reset`)
      .set(bearer(tOwner))
      .send({ password: PASSWORD, code: backupCodes[1]!, reason: "Téléphone perdu", confirmEmail: admin.email.toUpperCase() });
    expect(ok.status).toBe(200); // la casse n'a pas d'importance
  });

  test("seul l'OWNER peut appeler la route : USER, MODERATOR et ADMIN reçoivent 403 sans rien lire de la cible", async () => {
    enforcementStartedDaysAgo(undefined);
    const owner = await account("OWNER");
    await enroll(owner);
    const admin = await account("ADMIN");
    await enroll(admin);
    for (const role of ["USER", "MODERATOR", "ADMIN"] as const) {
      const caller = await account(role);
      const res = await reset(await tokenFor(caller), admin, { password: PASSWORD, code: "123456", reason: "abc" });
      expect(res.status).toBe(403);
    }
    expect((await reset("jeton-invalide", admin, { password: PASSWORD, code: "123456", reason: "abc" })).status).toBe(401);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: admin.id } })).twoFactorEnabledAt).not.toBeNull();
  });

  test("journal d'audit : auteur, cible, motif, sessions fermées — et aucun secret", async () => {
    enforcementStartedDaysAgo(undefined);
    const owner = await account("OWNER");
    const { backupCodes } = await enroll(owner);
    const admin = await account("ADMIN");
    const adminSecret = (await enroll(admin)).secret;
    await auth.login({ email: admin.email, password: PASSWORD, totpCode: totpCodeAt(adminSecret, Date.now() + 30_000) });
    const tOwner = await tokenFor(owner, backupCodes[0]!);

    expect((await reset(tOwner, admin, { password: PASSWORD, code: backupCodes[1]!, reason: "Téléphone perdu, codes introuvables" })).status).toBe(200);

    const entry = await prisma.auditLog.findFirstOrThrow({ where: { action: "admin.user.two_factor.reset", target: admin.id } });
    expect(entry.actorId).toBe(owner.id);
    expect(entry.meta).toMatchObject({ reason: "Téléphone perdu, codes introuvables", sessionsRevoked: 1, targetRole: "ADMIN" });
    const text = JSON.stringify(entry);
    expect(text).not.toContain(PASSWORD);
    expect(text).not.toContain(backupCodes[1]!);
    expect(text).not.toContain(adminSecret);
  });

  test("liste des comptes : indique si la 2FA est active, sans jamais exposer de secret", async () => {
    enforcementStartedDaysAgo(undefined);
    const owner = await account("OWNER");
    const { backupCodes } = await enroll(owner);
    const withTf = await account("ADMIN");
    const enrolled = await enroll(withTf);
    const withoutTf = await account("ADMIN");

    const res = await request(app)
      .get("/api/admin/users")
      .query({ q: `enf-${run}` })
      .set(bearer(await tokenFor(owner, backupCodes[0]!)));
    expect(res.status).toBe(200);
    const byId = Object.fromEntries((res.body.data as Array<{ id: string; twoFactorEnabled: boolean }>).map((u) => [u.id, u]));
    expect(byId[withTf.id]!.twoFactorEnabled).toBe(true);
    expect(byId[withoutTf.id]!.twoFactorEnabled).toBe(false);

    const text = JSON.stringify(res.body);
    for (const forbidden of [enrolled.secret, enrolled.backupCodes[0]!, "twoFactorSecret", "twoFactorPendingSecret", "passwordHash", "codeHash"]) {
      expect(text).not.toContain(forbidden);
    }
  });

  test("dernier recours par l'opérateur de la base : sessions fermées, trace sans auteur applicatif", async () => {
    enforcementStartedDaysAgo(30);
    const owner = await account("OWNER");
    const { backupCodes } = await enroll(owner);
    const refresh = (await auth.login({ email: owner.email, password: PASSWORD, totpCode: backupCodes[0]! })).refreshToken;

    const { sessionsRevoked } = await sec.resetTwoFactorByOperator(owner.id, "test");
    expect(sessionsRevoked).toBe(1);
    await expect(auth.refresh(refresh)).rejects.toThrow();
    const after = await prisma.user.findUniqueOrThrow({ where: { id: owner.id } });
    expect(after).toMatchObject({ twoFactorEnabledAt: null, twoFactorSecret: null, role: "OWNER" });
    expect(await prisma.auditLog.count({ where: { actorId: null, action: "operator.user.two_factor.reset", target: owner.id } })).toBe(1);
  });
});

describe("export des données", () => {
  test("contient l'historique des connexions et les appareils, sans aucun secret", async () => {
    enforcementStartedDaysAgo(undefined);
    const admin = await account("ADMIN");
    const { backupCodes } = await enroll(admin);
    await auth.login({ email: admin.email, password: PASSWORD, totpCode: backupCodes[0]! }, { userAgent: "JeuTaime iPhone", ip: "203.0.113.7" });
    await expect(auth.login({ email: admin.email, password: "faux" })).rejects.toThrow();

    const exported = await exportPersonalData(admin.id);
    expect(exported.security.twoFactorEnabled).toBe(true);
    expect(exported.security.loginHistory.some((e) => e.success)).toBe(true);
    expect(exported.security.loginHistory.some((e) => !e.success && e.reason === "INVALID_CREDENTIALS")).toBe(true);
    expect(exported.security.sessions).toHaveLength(1);
    expect(exported.security.sessions[0]).toMatchObject({ userAgent: "JeuTaime iPhone", ip: "203.0.113.7" });

    const row = await prisma.user.findUniqueOrThrow({ where: { id: admin.id } });
    const text = JSON.stringify(exported);
    for (const secret of [row.passwordHash, row.twoFactorSecret!, backupCodes[1]!]) expect(text).not.toContain(secret);
    expect(text).not.toContain("tokenHash");
    expect(text).not.toContain("twoFactorSecret");
  });
});

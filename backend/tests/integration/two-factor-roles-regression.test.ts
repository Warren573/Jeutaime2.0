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
import { runTwoFactorGraceReminders } from "../../src/modules/auth/security/twoFactorReminder";
import { MemoryTransport, setMailTransport } from "../../src/modules/mail/mailer";
import { exportPersonalData } from "../../src/modules/auth/dataExport.service";
import { deactivateAccount } from "../../src/modules/auth/accountLifecycle.service";
import { deleteAccountPermanently } from "../../src/modules/auth/accountDeletion.service";

/**
 * Non-régression : les comptes USER et MODERATOR ne subissent AUCUNE conséquence de la
 * double authentification obligatoire, du rappel ni de l'interface de réinitialisation.
 * Obligation active depuis 60 jours, rappels exécutés. Nécessite TEST_DATABASE_URL.
 */
const test = process.env.TEST_DATABASE_URL ? it : it.skip;
vi.setConfig({ testTimeout: 60_000 });

const DAY = 24 * 60 * 60 * 1000;
const run = Date.now() + "-" + Math.random().toString(36).slice(2, 7);
const PASSWORD = "Depart-" + run + "-Aa1";
const users: string[] = [];
let n = 0;
const mailbox = new MemoryTransport();
const setStart = (d: Date | undefined) => {
  (env as { TWO_FACTOR_ENFORCEMENT_START: Date | undefined }).TWO_FACTOR_ENFORCEMENT_START = d;
};

async function account(role: "USER" | "MODERATOR" | "ADMIN" | "OWNER") {
  const id = `reg-${run}-${++n}`;
  users.push(id);
  await prisma.user.create({
    data: {
      id,
      email: `${id}@test.local`,
      role,
      passwordHash: await hashPassword(PASSWORD),
      wallet: { create: { coins: 40 } },
      settings: { create: {} },
      profile: { create: { pseudo: id.replace(/-/g, "_"), birthDate: new Date("1990-01-01"), gender: "FEMME", city: "Lyon" } },
    },
  });
  return { id, email: `${id}@test.local` };
}
const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

beforeAll(() => {
  setMailTransport(mailbox);
  setStart(new Date(Date.now() - 60 * DAY));
});
afterAll(async () => {
  setStart(undefined);
  if (!process.env.TEST_DATABASE_URL) return;
  await prisma.loginEvent.deleteMany({ where: { email: { contains: `reg-${run}` } } });
  await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: users } }, { target: { in: users } }] } });
  await prisma.user.deleteMany({ where: { id: { in: users } } });
});

describe.each(["USER", "MODERATOR"] as const)("compte %s, obligation active depuis 60 jours", (role) => {
  test("connexion, session, portefeuille, profil : inchangés, sans code ni blocage", async () => {
    const u = await account(role);
    const session = await auth.login({ email: u.email, password: PASSWORD, totpCode: "123456" }); // code superflu ignoré
    const t = session.accessToken;
    expect((await request(app).get("/api/auth/me").set(bearer(t))).status).toBe(200);
    expect((await request(app).get("/api/wallet/me").set(bearer(t))).body.data.coins).toBe(40);
    expect((await auth.refresh(session.refreshToken)).accessToken).toBeTruthy();
    const status = (await request(app).get("/api/auth/security").set(bearer(t))).body.data;
    expect(status.available).toBe(false);
    expect(status.enabled).toBe(false);
    expect(status.enforcement).toMatchObject({ state: "not_required", mandatory: false, deadline: null, daysLeft: null });
  });

  test("ne peut ni configurer la 2FA, ni la réinitialiser chez un autre, ni être listé comme protégé", async () => {
    const u = await account(role);
    const t = (await auth.login({ email: u.email, password: PASSWORD })).accessToken;
    for (const path of ["/api/auth/2fa/setup", "/api/auth/2fa/enable", "/api/auth/2fa/backup-codes"]) {
      const res = await request(app).post(path).set(bearer(t)).send({ currentPassword: PASSWORD, code: "123456", currentCode: "123456" });
      expect([400, 403]).toContain(res.status);
    }
    const target = await account("ADMIN");
    const reset = await request(app)
      .post(`/api/admin/users/${target.id}/two-factor/reset`)
      .set(bearer(t))
      .send({ password: PASSWORD, code: "123456", reason: "abc", confirmEmail: target.email });
    expect(reset.status).toBe(403);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).twoFactorEnabledAt).toBeNull();
  });

  test("le rappel avant échéance ne le concerne jamais (aucune notification, aucun e-mail)", async () => {
    const u = await account(role);
    mailbox.clear();
    setStart(new Date(Date.now() - 8 * DAY)); // 6 jours restants : un ADMIN sans 2FA recevrait un rappel
    try {
      await runTwoFactorGraceReminders(new Date());
    } finally {
      setStart(new Date(Date.now() - 60 * DAY));
    }
    expect(await prisma.notification.count({ where: { userId: u.id } })).toBe(0);
    expect(mailbox.outbox.filter((m) => m.to === u.email)).toHaveLength(0);
  });

  test("changement d'e-mail, de mot de passe, déconnexion générale, export, désactivation, suppression : inchangés", async () => {
    const u = await account(role);
    const t1 = (await auth.login({ email: u.email, password: PASSWORD })).accessToken;
    const next = "Nouveau-" + run + "-Bb2";
    expect((await request(app).post("/api/auth/change-password").set(bearer(t1)).send({ currentPassword: PASSWORD, newPassword: next })).status).toBe(200);
    const t2 = (await auth.login({ email: u.email, password: next })).accessToken;
    expect((await request(app).post("/api/auth/logout-all").set(bearer(t2))).status).toBe(200);

    const exported = await exportPersonalData(u.id);
    expect(exported.security.twoFactorEnabled).toBe(false);
    expect(exported.account.role).toBe(role);

    await auth.login({ email: u.email, password: next });
    await deactivateAccount(u.id, next);
    expect(await prisma.pushToken.count({ where: { userId: u.id } })).toBe(0);
    await deleteAccountPermanently(u.id, next);
    expect(await prisma.user.count({ where: { id: u.id } })).toBe(0);
  });

  test("la liste d'administration les montre sans double authentification, et sans fuite de secret", async () => {
    const owner = await account("OWNER");
    const u = await account(role);
    const { secret } = await sec.setupTwoFactor(owner.id, PASSWORD);
    const { backupCodes } = await sec.enableTwoFactor(owner.id, (await import("../../src/modules/auth/security/totp")).totpCodeAt(secret, Date.now()));
    const t = (await auth.login({ email: owner.email, password: PASSWORD, totpCode: backupCodes[0]! })).accessToken;
    const res = await request(app).get("/api/admin/users").query({ q: u.id }).set(bearer(t));
    const row = (res.body.data as Array<{ id: string; role: string; twoFactorEnabled: boolean }>).find((x) => x.id === u.id)!;
    expect(row).toMatchObject({ role, twoFactorEnabled: false });
    expect(JSON.stringify(res.body)).not.toMatch(/twoFactorSecret|passwordHash|codeHash/);
  });
});

describe("MODERATOR : fonctions de modération conservées, administration toujours fermée", () => {
  test("routes de modération 200, routes d'administration 403 « permissions » (jamais « 2FA »)", async () => {
    const mod = await account("MODERATOR");
    const t = (await auth.login({ email: mod.email, password: PASSWORD })).accessToken;
    expect((await request(app).get("/api/admin/reports").set(bearer(t))).status).toBe(200);
    for (const path of ["/api/admin/overview", "/api/admin/users"]) {
      const res = await request(app).get(path).set(bearer(t));
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    }
  });
});

describe("ADMIN rétrogradé", () => {
  test("un ADMIN bloqué puis rétrogradé en MODERATOR retrouve ses fonctions de modération, sans que sa 2FA soit touchée", async () => {
    const owner = await account("OWNER");
    const { secret } = await sec.setupTwoFactor(owner.id, PASSWORD);
    const totp = (await import("../../src/modules/auth/security/totp")).totpCodeAt;
    const { backupCodes } = await sec.enableTwoFactor(owner.id, totp(secret, Date.now()));
    const tOwner = (await auth.login({ email: owner.email, password: PASSWORD, totpCode: backupCodes[0]! })).accessToken;

    const admin = await account("ADMIN"); // existant, sans 2FA, délai dépassé
    const tAdmin = (await auth.login({ email: admin.email, password: PASSWORD })).accessToken;
    expect((await request(app).get("/api/admin/reports").set(bearer(tAdmin))).status).toBe(403);

    const demote = await request(app).patch(`/api/admin/users/${admin.id}/role`).set(bearer(tOwner)).send({ role: "MODERATOR" });
    expect(demote.status).toBe(200);
    expect((await request(app).get("/api/admin/reports").set(bearer(tAdmin))).status).toBe(200);
    expect((await sec.twoFactorStatus(admin.id)).enforcement.state).toBe("not_required");
  });
});

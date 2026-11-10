import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/config/prisma";
import { hashPassword } from "../../src/core/utils/hash";
import { MemoryTransport, setMailTransport } from "../../src/modules/mail/mailer";

/**
 * Parcours HTTP de la sécurité des comptes, boîte e-mail simulée.
 * Nécessite TEST_DATABASE_URL.
 */
const test = process.env.TEST_DATABASE_URL ? it : it.skip;
const mailbox = new MemoryTransport();
const run = Date.now() + "-" + Math.random().toString(36).slice(2, 7);
const id = `sechttp-${run}`;
const email = `${id}@test.local`;
const PASSWORD = "Depart-" + run + "-Aa1";
const NEW_PASSWORD = "Nouveau-" + run + "-Bb2";

beforeAll(async () => {
  if (!process.env.TEST_DATABASE_URL) return;
  setMailTransport(mailbox);
  await prisma.user.create({
    data: { id, email, passwordHash: await hashPassword(PASSWORD), wallet: { create: {} }, settings: { create: {} } },
  });
});
afterAll(async () => {
  if (!process.env.TEST_DATABASE_URL) return;
  await prisma.loginEvent.deleteMany({ where: { email } });
  await prisma.user.deleteMany({ where: { id } });
});

describe("API de sécurité des comptes", () => {
  test("mot de passe oublié : réponse strictement identique que le compte existe ou non", async () => {
    const known = await request(app).post("/api/auth/password/forgot").send({ email });
    const unknown = await request(app).post("/api/auth/password/forgot").send({ email: `absent-${run}@test.local` });
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(unknown.body).toEqual(known.body);
    expect(mailbox.outbox.filter((m) => m.kind === "password_reset")).toHaveLength(1);
  });

  test("réinitialisation : mot de passe faible refusé avec un message clair, lien inconnu refusé", async () => {
    const weak = await request(app).post("/api/auth/password/reset").send({ token: "x".repeat(43), newPassword: "court" });
    expect(weak.status).toBe(400);
    expect(JSON.stringify(weak.body)).toContain("8 caractères minimum");

    const bad = await request(app).post("/api/auth/password/reset").send({ token: "x".repeat(43), newPassword: NEW_PASSWORD });
    expect(bad.status).toBe(400);
    expect(bad.body.error.message).toMatch(/invalide ou a expiré/);
  });

  test("réinitialisation complète puis connexion, sessions, historique, déconnexion générale", async () => {
    const token = new URL(mailbox.last("password_reset")!.text.match(/https:\/\/\S+/)![0]).searchParams.get("token")!;
    const reset = await request(app).post("/api/auth/password/reset").send({ token, newPassword: NEW_PASSWORD });
    expect(reset.status).toBe(200);

    const login = await request(app)
      .post("/api/auth/login")
      .set("User-Agent", "JeuTaime/2.0 (iPhone)")
      .send({ email, password: NEW_PASSWORD });
    expect(login.status).toBe(200);
    const bearer = { Authorization: `Bearer ${login.body.data.accessToken}` };

    const sessions = await request(app).get("/api/auth/sessions").set(bearer);
    expect(sessions.status).toBe(200);
    expect(sessions.body.data).toHaveLength(1);
    expect(sessions.body.data[0].device).toBe("iPhone ou iPad");
    expect(JSON.stringify(sessions.body)).not.toContain("tokenHash");

    const history = await request(app).get("/api/auth/login-history").set(bearer);
    expect(history.body.data.length).toBeGreaterThan(0);

    const status = await request(app).get("/api/auth/security").set(bearer);
    expect(status.body.data).toMatchObject({ available: false, enabled: false, emailVerified: true });

    // Un compte USER ne peut pas activer la double authentification.
    const setup = await request(app).post("/api/auth/2fa/setup").set(bearer).send({ currentPassword: NEW_PASSWORD });
    expect([403, 422]).toContain(setup.status);

    const out = await request(app).post("/api/auth/logout-all").set(bearer);
    expect(out.status).toBe(200);
    const refresh = await request(app).post("/api/auth/refresh").send({ refreshToken: login.body.data.refreshToken });
    expect(refresh.status).toBe(401);
  });

  test("les routes de gestion exigent une session", async () => {
    for (const [method, path] of [
      ["get", "/api/auth/sessions"],
      ["get", "/api/auth/login-history"],
      ["post", "/api/auth/logout-all"],
      ["post", "/api/auth/2fa/setup"],
      ["post", "/api/auth/email/verify/resend"],
    ] as const) {
      expect((await request(app)[method](path)).status).toBe(401);
    }
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/config/prisma";
import { hashPassword } from "../../src/core/utils/hash";
import * as auth from "../../src/modules/auth/auth.service";
import { verifyAccessToken } from "../../src/core/utils/jwt";
import { changeEmail, changePassword } from "../../src/modules/auth/accountSecurity.service";

/**
 * Répétition, sur une base PostgreSQL de test, de l'opération prévue sur le
 * compte propriétaire : remplacement de l'adresse e-mail de test puis du mot
 * de passe, par les parcours authentifiés existants.
 *
 * Garanties vérifiées : identifiant, rôle OWNER, profil et portefeuille
 * inchangés ; toutes les sessions antérieures révoquées.
 *
 * Nécessite TEST_DATABASE_URL.
 */
const test = process.env.TEST_DATABASE_URL ? it : it.skip;

const suffix = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
const OWNER_ID = "owner-rotation-" + suffix;
const OLD_EMAIL = `owner-${suffix}@jeutaime.test`;
const NEW_EMAIL = `owner-${suffix}@exemple-reel.fr`;
// Valeurs jetables générées pour ce test uniquement.
const OLD_PASSWORD = "Ancien-" + suffix + "-Aa1";
const NEW_PASSWORD = "Nouveau-" + suffix + "-Bb2";

beforeAll(async () => {
  if (!process.env.TEST_DATABASE_URL) return;
  await prisma.user.create({
    data: {
      id: OWNER_ID,
      email: OLD_EMAIL,
      passwordHash: await hashPassword(OLD_PASSWORD),
      role: "OWNER",
      isVerified: true,
      premiumTier: "FREE",
      wallet: { create: { coins: 321 } },
      profile: {
        create: {
          pseudo: "owner_" + suffix.replace(/-/g, "_"),
          birthDate: new Date("1990-01-01T00:00:00.000Z"),
          gender: "HOMME",
          city: "Paris",
        },
      },
    },
  });
});

afterAll(async () => {
  if (!process.env.TEST_DATABASE_URL) return;
  await prisma.user.deleteMany({ where: { id: OWNER_ID } });
});

describe("Rotation des identifiants du compte propriétaire", () => {
  let sessionA = "";
  let sessionB = "";

  test("deux sessions sont ouvertes avec les anciens identifiants", async () => {
    sessionA = (await auth.login({ email: OLD_EMAIL, password: OLD_PASSWORD })).refreshToken;
    sessionB = (await auth.login({ email: OLD_EMAIL, password: OLD_PASSWORD })).refreshToken;
    expect(await prisma.refreshToken.count({ where: { userId: OWNER_ID, revokedAt: null } })).toBe(2);
  });

  test("le changement d'e-mail exige le mot de passe actuel", async () => {
    await expect(changeEmail(OWNER_ID, "mauvais-mot-de-passe", NEW_EMAIL)).rejects.toThrow(/incorrect/);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: OWNER_ID } })).email).toBe(OLD_EMAIL);
  });

  test("le changement d'e-mail conserve identifiant, rôle, profil et portefeuille, et révoque les sessions", async () => {
    const before = await prisma.user.findUniqueOrThrow({
      where: { id: OWNER_ID },
      include: { profile: true, wallet: true },
    });

    await changeEmail(OWNER_ID, OLD_PASSWORD, NEW_EMAIL);

    const after = await prisma.user.findUniqueOrThrow({
      where: { id: OWNER_ID },
      include: { profile: true, wallet: true },
    });
    expect(after.email).toBe(NEW_EMAIL);
    expect(after.id).toBe(before.id);
    expect(after.role).toBe("OWNER");
    expect(after.profile?.id).toBe(before.profile?.id);
    expect(after.wallet?.coins).toBe(321);
    expect(await prisma.user.count({ where: { email: OLD_EMAIL } })).toBe(0);
    expect(await prisma.refreshToken.count({ where: { userId: OWNER_ID, revokedAt: null } })).toBe(0);
  });

  test("les anciennes sessions ne peuvent plus être prolongées", async () => {
    await expect(auth.refresh(sessionA)).rejects.toThrow();
    await expect(auth.refresh(sessionB)).rejects.toThrow();
  });

  test("l'ancienne adresse ne permet plus de se connecter, la nouvelle oui", async () => {
    await expect(auth.login({ email: OLD_EMAIL, password: OLD_PASSWORD })).rejects.toThrow();
    const session = await auth.login({ email: NEW_EMAIL, password: OLD_PASSWORD });
    const payload = verifyAccessToken(session.accessToken);
    expect(payload.userId).toBe(OWNER_ID);
    expect(payload.role).toBe("OWNER");
    sessionA = session.refreshToken;
  });

  test("le changement de mot de passe révoque les sessions et invalide l'ancien mot de passe", async () => {
    await changePassword(OWNER_ID, OLD_PASSWORD, NEW_PASSWORD);

    expect(await prisma.refreshToken.count({ where: { userId: OWNER_ID, revokedAt: null } })).toBe(0);
    await expect(auth.refresh(sessionA)).rejects.toThrow();
    await expect(auth.login({ email: NEW_EMAIL, password: OLD_PASSWORD })).rejects.toThrow();

    const session = await auth.login({ email: NEW_EMAIL, password: NEW_PASSWORD });
    expect(verifyAccessToken(session.accessToken).userId).toBe(OWNER_ID);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: OWNER_ID } })).role).toBe("OWNER");
  });
});

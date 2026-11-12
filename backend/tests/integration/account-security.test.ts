import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// Variables lues au chargement de la configuration : à poser avant tout import applicatif.
vi.hoisted(() => {
  process.env.TWO_FACTOR_ENCRYPTION_KEY = "cle-de-test-uniquement-0123456789abcdef";
  process.env.APP_PUBLIC_URL = "https://app.test.invalid";
});

import { prisma } from "../../src/config/prisma";
import { hashPassword } from "../../src/core/utils/hash";
import * as auth from "../../src/modules/auth/auth.service";
import { changeEmail, changePassword } from "../../src/modules/auth/accountSecurity.service";
import * as sec from "../../src/modules/auth/security/accountSecurity.core";
import { totpCodeAt } from "../../src/modules/auth/security/totp";
import { MemoryTransport, setMailTransport, type MailTransport } from "../../src/modules/mail/mailer";
import { deleteAccountPermanently } from "../../src/modules/auth/accountDeletion.service";
import { deactivateAccount } from "../../src/modules/auth/accountLifecycle.service";
import { unregisterDeviceToken } from "../../src/modules/notifications/push.service";
import { exportPersonalData } from "../../src/modules/auth/dataExport.service";

/**
 * Sécurité des comptes, sur PostgreSQL, avec une boîte e-mail SIMULÉE :
 * aucun e-mail réel n'est envoyé. Nécessite TEST_DATABASE_URL.
 */
const test = process.env.TEST_DATABASE_URL ? it : it.skip;

const mailbox = new MemoryTransport();
const disabled: MailTransport = { name: "disabled", delivers: false, send: async () => undefined };
const run = Date.now() + "-" + Math.random().toString(36).slice(2, 7);
const users: string[] = [];
let n = 0;
const PASSWORD = "Depart-" + run + "-Aa1";
const NEW_PASSWORD = "Nouveau-" + run + "-Bb2";

async function account(role: "USER" | "ADMIN" | "OWNER" = "USER") {
  const id = `sec-${run}-${++n}`;
  const email = `${id}@test.local`;
  users.push(id);
  await prisma.user.create({
    data: {
      id,
      email,
      role,
      passwordHash: await hashPassword(PASSWORD),
      wallet: { create: { coins: 50 } },
      settings: { create: {} },
      profile: {
        create: { pseudo: id.replace(/-/g, "_"), birthDate: new Date("1990-01-01"), gender: "FEMME", city: "Lyon" },
      },
    },
  });
  return { id, email };
}
const tokenFrom = (text: string) => new URL(text.match(/https:\/\/\S+/)![0]).searchParams.get("token")!;
const lastLink = (kind: Parameters<MemoryTransport["last"]>[0]) => tokenFrom(mailbox.last(kind)!.text);
const activeSessions = (userId: string) => prisma.refreshToken.count({ where: { userId, revokedAt: null } });

beforeEach(() => {
  mailbox.clear();
  setMailTransport(mailbox);
});
afterAll(async () => {
  if (!process.env.TEST_DATABASE_URL) return;
  await prisma.loginEvent.deleteMany({ where: { email: { contains: `sec-${run}` } } });
  await prisma.user.deleteMany({ where: { id: { in: users } } });
});

describe("1. Mot de passe oublié", () => {
  test("adresse inconnue : aucun e-mail, et rien ne distingue la réponse", async () => {
    expect(await sec.requestPasswordReset("personne-" + run + "@test.local")).toBe("ignored");
    expect(mailbox.outbox).toHaveLength(0);
  });

  test("lien à usage unique : change le mot de passe, révoque les sessions, alerte l'utilisateur", async () => {
    const u = await account();
    await auth.login({ email: u.email, password: PASSWORD });
    await auth.login({ email: u.email, password: PASSWORD });
    expect(await activeSessions(u.id)).toBe(2);

    expect(await sec.requestPasswordReset(u.email.toUpperCase())).toBe("sent");
    const mail = mailbox.last("password_reset")!;
    expect(mail.to).toBe(u.email);
    expect(mail.text).toContain("https://app.test.invalid/reset-password?token=");
    const token = tokenFrom(mail.text);
    // Seule l'empreinte est en base : le jeton brut n'y figure pas.
    expect(await prisma.authToken.count({ where: { tokenHash: token } })).toBe(0);

    await sec.resetPassword(token, NEW_PASSWORD);

    expect(await activeSessions(u.id)).toBe(0);
    await expect(auth.login({ email: u.email, password: PASSWORD })).rejects.toThrow(/incorrect/);
    await auth.login({ email: u.email, password: NEW_PASSWORD });
    await expect(sec.resetPassword(token, "Autre-" + run + "-Cc3")).rejects.toThrow(/invalide ou a expiré/);
    expect(mailbox.last("security_alert")!.text).toContain("réinitialisé");
    expect(await prisma.notification.count({ where: { userId: u.id, type: "SECURITY_ALERT" } })).toBe(1);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).emailVerifiedAt).not.toBeNull();
  });

  test("deux utilisations simultanées du même lien : une seule réussit", async () => {
    const u = await account();
    await sec.requestPasswordReset(u.email);
    const token = lastLink("password_reset");
    const results = await Promise.allSettled([
      sec.resetPassword(token, NEW_PASSWORD),
      sec.resetPassword(token, "Pirate-" + run + "-Zz9"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });

  test("lien expiré refusé", async () => {
    const u = await account();
    await sec.requestPasswordReset(u.email);
    const token = lastLink("password_reset");
    await prisma.authToken.updateMany({ where: { userId: u.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await expect(sec.resetPassword(token, NEW_PASSWORD)).rejects.toThrow(/invalide ou a expiré/);
    await auth.login({ email: u.email, password: PASSWORD });
  });

  test("une nouvelle demande rend le lien précédent inutilisable ; 3 demandes par heure au plus", async () => {
    const u = await account();
    await sec.requestPasswordReset(u.email);
    const first = lastLink("password_reset");
    expect(await sec.requestPasswordReset(u.email)).toBe("sent");
    expect(await sec.requestPasswordReset(u.email)).toBe("sent");
    await expect(sec.resetPassword(first, NEW_PASSWORD)).rejects.toThrow();
    mailbox.clear();
    expect(await sec.requestPasswordReset(u.email)).toBe("limited");
    expect(mailbox.outbox).toHaveLength(0);
  });
});

describe("2. Vérification de l'adresse à l'inscription", () => {
  test("l'inscription envoie un lien ; l'ouvrir confirme l'adresse, une seule fois", async () => {
    const pseudo = ("ins_" + run).replace(/-/g, "_").slice(0, 28);
    const email = `inscription-${run}@test.local`;
    const { userId } = await auth.register({
      email,
      password: PASSWORD,
      pseudo,
      birthDate: new Date("1992-03-04"),
      gender: "HOMME",
      city: "Nantes",
      acceptedTerms: true,
      acceptedCommunityRules: true,
    } as never);
    users.push(userId);

    expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).emailVerifiedAt).toBeNull();
    const mail = mailbox.last("email_verify")!;
    expect(mail.to).toBe(email);
    const token = tokenFrom(mail.text);

    await sec.verifyEmail(token);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).emailVerifiedAt).not.toBeNull();
    await expect(sec.verifyEmail(token)).rejects.toThrow(/invalide ou a expiré/);
    expect(await sec.sendEmailVerification(userId)).toBe("already_verified");
  });

  test("sans fournisseur d'e-mails, l'inscription fonctionne et aucun lien n'est créé", async () => {
    setMailTransport(disabled);
    const u = await account();
    expect(await sec.sendEmailVerification(u.id)).toBe("delivery_disabled");
    expect(await prisma.authToken.count({ where: { userId: u.id } })).toBe(0);
  });
});

describe("3 et 4. Changement d'adresse", () => {
  test("l'adresse ne change qu'après confirmation ; l'ancienne adresse est alertée sans voir la nouvelle", async () => {
    const u = await account();
    const next = `nouvelle-${run}-${n}@test.local`;
    await auth.login({ email: u.email, password: PASSWORD });

    await expect(changeEmail(u.id, "mauvais", next)).rejects.toThrow(/incorrect/);
    expect(await changeEmail(u.id, PASSWORD, next)).toBeNull();

    // Rien n'a changé tant que le lien n'est pas ouvert.
    expect((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).email).toBe(u.email);
    expect(await activeSessions(u.id)).toBe(1);
    const confirm = mailbox.last("email_change_confirm")!;
    expect(confirm.to).toBe(next);

    await sec.confirmEmailChange(tokenFrom(confirm.text));

    const after = await prisma.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(after.email).toBe(next);
    expect(after.emailVerifiedAt).not.toBeNull();
    expect(await activeSessions(u.id)).toBe(0);
    const alert = mailbox.last("security_alert")!;
    expect(alert.to).toBe(u.email);
    expect(alert.text).not.toContain(next);
    await auth.login({ email: next, password: PASSWORD });
  });

  test("adresse déjà prise entre la demande et la confirmation : refus, rien ne change", async () => {
    const u = await account();
    const other = await account();
    const wanted = `convoitee-${run}@test.local`;
    await changeEmail(u.id, PASSWORD, wanted);
    const token = lastLink("email_change_confirm");
    await prisma.user.update({ where: { id: other.id }, data: { email: wanted } });
    await expect(sec.confirmEmailChange(token)).rejects.toThrow(/déjà utilisée/);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).email).toBe(u.email);
  });

  test("sans fournisseur d'e-mails : changement immédiat (comportement historique conservé)", async () => {
    setMailTransport(disabled);
    const u = await account();
    const next = `immediat-${run}@test.local`;
    expect(await changeEmail(u.id, PASSWORD, next)).toBe(next);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).email).toBe(next);
  });
});

describe("5. Tentatives répétées de connexion", () => {
  test("10 échecs : compte verrouillé même avec le bon mot de passe ; la réinitialisation déverrouille", async () => {
    const u = await account();
    for (let i = 0; i < 10; i++) {
      await expect(auth.login({ email: u.email, password: "faux-" + i })).rejects.toThrow(/incorrect/);
    }
    await expect(auth.login({ email: u.email, password: PASSWORD })).rejects.toThrow(/Trop de tentatives/);

    await sec.requestPasswordReset(u.email);
    await sec.resetPassword(lastLink("password_reset"), NEW_PASSWORD);
    await auth.login({ email: u.email, password: NEW_PASSWORD });
  }, 30_000);

  test("9 échecs puis une réussite : le compteur repart de zéro", async () => {
    const u = await account();
    for (let i = 0; i < 9; i++) await expect(auth.login({ email: u.email, password: "faux" })).rejects.toThrow();
    await auth.login({ email: u.email, password: PASSWORD });
    for (let i = 0; i < 9; i++) await expect(auth.login({ email: u.email, password: "faux" })).rejects.toThrow(/incorrect/);
    await auth.login({ email: u.email, password: PASSWORD });
  }, 30_000);
});

describe("6 et 7. Sessions, appareils, historique", () => {
  test("liste des appareils, déconnexion d'un seul, puis de tous avec retrait des jetons push", async () => {
    const u = await account();
    await auth.login({ email: u.email, password: PASSWORD }, { userAgent: "JeuTaime/2.0 (iPhone; iOS 18)", ip: "203.0.113.5" });
    const android = await auth.login({ email: u.email, password: PASSWORD }, { userAgent: "okhttp/4.12 Android", ip: "203.0.113.9" });
    await prisma.pushToken.createMany({
      data: [
        { userId: u.id, token: `ExponentPushToken[a-${run}]`, platform: "ios" },
        { userId: u.id, token: `ExponentPushToken[b-${run}]`, platform: "android" },
      ],
    });

    const sessions = await sec.listSessions(u.id);
    expect(sessions.map((s) => s.device).sort()).toEqual(["Android", "iPhone ou iPad"]);

    // Un appareil ne peut pas fermer la session d'un autre compte.
    const stranger = await account();
    await expect(sec.revokeSession(stranger.id, sessions[0]!.id)).rejects.toThrow();

    await sec.revokeSession(u.id, sessions.find((s) => s.device === "Android")!.id);
    await expect(auth.refresh(android.refreshToken)).rejects.toThrow();
    expect(await activeSessions(u.id)).toBe(1);

    // Déconnexion simple d'un appareil : route existante de « notifications » (PR #196).
    await unregisterDeviceToken({ userId: u.id, token: `ExponentPushToken[b-${run}]` });
    expect(await prisma.pushToken.count({ where: { userId: u.id } })).toBe(1);
    const result = await sec.logoutEverywhere(u.id);
    expect(result).toEqual({ sessions: 1, pushTokens: 1 });
    expect(await activeSessions(u.id)).toBe(0);
    expect(await prisma.pushToken.count({ where: { userId: u.id } })).toBe(0);
  });

  test("la rotation du jeton conserve l'appareil ; l'historique liste réussites et échecs", async () => {
    const u = await account();
    const s = await auth.login({ email: u.email, password: PASSWORD }, { userAgent: "Mozilla/5.0 Chrome" });
    await auth.refresh(s.refreshToken);
    expect((await sec.listSessions(u.id))[0]!.device).toBe("Navigateur web");

    await expect(auth.login({ email: u.email, password: "faux" })).rejects.toThrow();
    const history = await sec.loginHistory(u.id);
    expect(history.some((h) => h.success)).toBe(true);
    expect(history.some((h) => !h.success && h.reason === "INVALID_CREDENTIALS")).toBe(true);
  });
});

describe("8. Double authentification (OWNER et ADMIN)", () => {
  test("refusée à un compte USER", async () => {
    const u = await account("USER");
    await expect(sec.setupTwoFactor(u.id, PASSWORD)).rejects.toThrow(/réservée/);
  });

  test("activation, connexion avec code, codes de secours à usage unique, désactivation", async () => {
    const owner = await account("OWNER");
    await expect(sec.setupTwoFactor(owner.id, "mauvais")).rejects.toThrow(/incorrect/);
    const { secret, otpauthUri } = await sec.setupTwoFactor(owner.id, PASSWORD);
    expect(otpauthUri).toContain(secret);

    // Tant que le code n'est pas confirmé, la connexion reste inchangée.
    await auth.login({ email: owner.email, password: PASSWORD });
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: owner.id } });
    expect(stored.twoFactorSecret).toBeNull(); // rien n'est actif avant confirmation
    expect(stored.twoFactorPendingSecret).not.toContain(secret); // chiffré

    await expect(sec.enableTwoFactor(owner.id, "000000")).rejects.toThrow(/Code incorrect/);
    const { backupCodes } = await sec.enableTwoFactor(owner.id, totpCodeAt(secret, Date.now()));
    expect(backupCodes).toHaveLength(10);
    expect(await prisma.twoFactorBackupCode.count({ where: { userId: owner.id, codeHash: backupCodes[0]! } })).toBe(0);

    await expect(auth.login({ email: owner.email, password: PASSWORD })).rejects.toMatchObject({
      code: "TWO_FACTOR_REQUIRED",
    });
    await expect(auth.login({ email: owner.email, password: PASSWORD, totpCode: "123456" })).rejects.toThrow(
      /double authentification incorrect/,
    );
    // Le code utilisé pour l'activation ne sert plus ; le suivant (pas +30 s) est accepté, une seule fois.
    const next = totpCodeAt(secret, Date.now() + 30_000);
    await expect(auth.login({ email: owner.email, password: PASSWORD, totpCode: totpCodeAt(secret, Date.now()) })).rejects.toThrow(
      /incorrect/,
    );
    await auth.login({ email: owner.email, password: PASSWORD, totpCode: next });
    await expect(auth.login({ email: owner.email, password: PASSWORD, totpCode: next })).rejects.toThrow(/incorrect/);

    // Code de secours : accepté une fois, refusé ensuite.
    await auth.login({ email: owner.email, password: PASSWORD, totpCode: backupCodes[0]! });
    await expect(auth.login({ email: owner.email, password: PASSWORD, totpCode: backupCodes[0]! })).rejects.toThrow();
    expect((await sec.twoFactorStatus(owner.id)).backupCodesRemaining).toBe(9);

    // Le rôle n'a pas bougé.
    expect((await prisma.user.findUniqueOrThrow({ where: { id: owner.id } })).role).toBe("OWNER");

    await expect(sec.disableTwoFactor(owner.id, PASSWORD, "000000")).rejects.toThrow(/Code incorrect/);
    // Tous les codes TOTP de la fenêtre sont consommés : un code de secours est le recours.
    await sec.disableTwoFactor(owner.id, PASSWORD, backupCodes[1]!);
    await auth.login({ email: owner.email, password: PASSWORD });
    expect(await prisma.twoFactorBackupCode.count({ where: { userId: owner.id } })).toBe(0);
  });

  test("un mot de passe correct sans second facteur ne crée aucune session", async () => {
    const admin = await account("ADMIN");
    const { secret } = await sec.setupTwoFactor(admin.id, PASSWORD);
    await sec.enableTwoFactor(admin.id, totpCodeAt(secret, Date.now()));
    const before = await prisma.refreshToken.count({ where: { userId: admin.id } });
    await expect(auth.login({ email: admin.email, password: PASSWORD })).rejects.toThrow();
    expect(await prisma.refreshToken.count({ where: { userId: admin.id } })).toBe(before);
  });
});

describe("9. Alertes de sécurité", () => {
  test("changement de mot de passe : alerte interne et e-mail, sessions révoquées", async () => {
    const u = await account();
    await auth.login({ email: u.email, password: PASSWORD });
    await changePassword(u.id, PASSWORD, NEW_PASSWORD);
    expect(await activeSessions(u.id)).toBe(0);
    const alert = mailbox.last("security_alert")!;
    expect(alert.to).toBe(u.email);
    expect(alert.text).toContain("mot de passe");
    expect(alert.text).not.toContain(NEW_PASSWORD);
    expect(await prisma.notification.count({ where: { userId: u.id, type: "SECURITY_ALERT" } })).toBe(1);
  });

  test("connexion depuis un nouvel appareil : alerte ; depuis un appareil connu : aucune", async () => {
    const u = await account();
    await auth.login({ email: u.email, password: PASSWORD }, { userAgent: "JeuTaime iPhone" });
    await auth.login({ email: u.email, password: PASSWORD }, { userAgent: "JeuTaime iPhone" });
    await new Promise((r) => setTimeout(r, 150));
    expect(mailbox.outbox.filter((m) => m.kind === "security_alert")).toHaveLength(0);

    await auth.login({ email: u.email, password: PASSWORD }, { userAgent: "okhttp Android inconnu" });
    await new Promise((r) => setTimeout(r, 300));
    const alerts = mailbox.outbox.filter((m) => m.kind === "security_alert");
    expect(alerts).toHaveLength(1);
    expect(alerts[0]!.text).toContain("nouvel appareil");
  });
});

describe("10. Suppression, export", () => {
  test("la suppression efface aussi liens, codes de secours, sessions et jetons push", async () => {
    const admin = await account("ADMIN");
    const { secret } = await sec.setupTwoFactor(admin.id, PASSWORD);
    await sec.enableTwoFactor(admin.id, totpCodeAt(secret, Date.now()));
    await sec.requestPasswordReset(admin.email);
    await prisma.pushToken.create({ data: { userId: admin.id, token: `ExponentPushToken[d-${run}]`, platform: "ios" } });

    const exported = JSON.stringify(await exportPersonalData(admin.id));
    expect(exported).toContain(admin.email);
    // L'export ne doit contenir ni empreinte de mot de passe ni secret de double authentification.
    const row = await prisma.user.findUniqueOrThrow({ where: { id: admin.id } });
    expect(exported).not.toContain(row.passwordHash);
    expect(exported).not.toContain(row.twoFactorSecret!);

    // Historique de connexion rattaché au compte (par identifiant ET par adresse e-mail).
    await auth.login({ email: admin.email, password: PASSWORD, totpCode: totpCodeAt(secret, Date.now() + 30_000) });
    await expect(auth.login({ email: admin.email, password: "faux" })).rejects.toThrow();
    expect(await prisma.loginEvent.count({ where: { email: admin.email } })).toBeGreaterThan(0);

    await expect(deleteAccountPermanently(admin.id, "mauvais")).rejects.toThrow(/incorrect/);
    await deleteAccountPermanently(admin.id, PASSWORD);

    // Aucune trace de l'adresse ne doit subsister dans l'historique de connexion.
    expect(await prisma.loginEvent.count({ where: { OR: [{ userId: admin.id }, { email: admin.email }] } })).toBe(0);

    expect(await prisma.user.count({ where: { id: admin.id } })).toBe(0);
    expect(await prisma.authToken.count({ where: { userId: admin.id } })).toBe(0);
    expect(await prisma.twoFactorBackupCode.count({ where: { userId: admin.id } })).toBe(0);
    expect(await prisma.refreshToken.count({ where: { userId: admin.id } })).toBe(0);
    expect(await prisma.pushToken.count({ where: { userId: admin.id } })).toBe(0);
    expect(await prisma.profile.count({ where: { userId: admin.id } })).toBe(0);
  });
});

describe("10 bis. Désactivation du compte", () => {
  test("une désactivation ferme les sessions et retire les jetons push (plus aucune notification)", async () => {
    const u = await account();
    await auth.login({ email: u.email, password: PASSWORD });
    await prisma.pushToken.create({ data: { userId: u.id, token: `ExponentPushToken[deact-${run}]`, platform: "android" } });

    await deactivateAccount(u.id, PASSWORD);

    expect(await activeSessions(u.id)).toBe(0);
    expect(await prisma.pushToken.count({ where: { userId: u.id } })).toBe(0);
  });

  test("appareils : « cet appareil » repéré et placé en tête, session ancienne signalée sans rien inventer", async () => {
    const u = await account();
    const legacy = await auth.login({ email: u.email, password: PASSWORD }); // sans contexte : userAgent nul
    const phone = await auth.login({ email: u.email, password: PASSWORD }, { userAgent: "JeuTaime/2.0 (iPhone; iOS 18)", ip: "203.0.113.5" });
    const phoneId = (await prisma.refreshToken.findFirst({ where: { userId: u.id, userAgent: { not: null } } }))!.id;

    const list = await sec.listSessions(u.id, phoneId);
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ id: phoneId, current: true, identified: true, device: "iPhone ou iPad" });
    expect(list[1]).toMatchObject({ current: false, identified: false, device: "Appareil non identifié" });
    expect(sec.describeDevice("curl/8.5.0")).toBe("Appareil non reconnu"); // renseigné mais inconnu : pas confondu avec « non identifié »
    expect(sec.describeDevice(null)).toBe("Appareil non identifié");
    // Sans identifiant fourni, aucune session n'est présentée comme actuelle.
    expect((await sec.listSessions(u.id)).some((x) => x.current)).toBe(false);
    // Un identifiant étranger ne désigne aucune session.
    expect((await sec.listSessions(u.id, "inconnu")).some((x) => x.current)).toBe(false);
    void legacy; void phone;
  });

  test("appareils : la rotation complète une session ancienne avec la requête réelle, sans écraser une valeur connue", async () => {
    const u = await account();
    const legacy = await auth.login({ email: u.email, password: PASSWORD });
    const known = await auth.login({ email: u.email, password: PASSWORD }, { userAgent: "okhttp/4.12 Android", ip: "203.0.113.9" });

    await auth.refresh(legacy.refreshToken, { userAgent: "JeuTaime/2.0 CFNetwork/1568 Darwin/24.0", ip: "198.51.100.7" });
    await auth.refresh(known.refreshToken, { userAgent: "Mozilla/5.0 Chrome", ip: "198.51.100.8" });
    // Un renouvellement sans contexte ne fabrique rien.
    const noCtx = await auth.login({ email: u.email, password: PASSWORD });
    await auth.refresh(noCtx.refreshToken);

    const rows = await prisma.refreshToken.findMany({ where: { userId: u.id, revokedAt: null } });
    const byAgent = rows.map((r) => `${r.userAgent ?? "NUL"}|${r.ip ?? "NUL"}`).sort();
    expect(byAgent).toEqual([
      "JeuTaime/2.0 CFNetwork/1568 Darwin/24.0|198.51.100.7", // ancienne session complétée
      "NUL|NUL", // renouvellement sans contexte : toujours inconnu
      "okhttp/4.12 Android|203.0.113.9", // valeur connue conservée
    ].sort());
  });

  test("appareils : l'appareil actuel ne peut pas être déconnecté depuis la liste ; un autre appareil, oui", async () => {
    const u = await account();
    await auth.login({ email: u.email, password: PASSWORD }, { userAgent: "JeuTaime/2.0 (iPhone; iOS 18)" });
    await auth.login({ email: u.email, password: PASSWORD }, { userAgent: "okhttp/4.12 Android" });
    const rows = await prisma.refreshToken.findMany({ where: { userId: u.id }, orderBy: { createdAt: "asc" } });
    const [current, other] = [rows[0]!, rows[1]!];

    await expect(sec.revokeSession(u.id, current.id, current.id)).rejects.toThrow(/appareil que tu utilises/);
    expect(await activeSessions(u.id)).toBe(2); // rien n'a été révoqué

    await sec.revokeSession(u.id, other.id, current.id);
    expect(await activeSessions(u.id)).toBe(1);
    expect((await prisma.refreshToken.findUnique({ where: { id: current.id } }))!.revokedAt).toBeNull();
  });
});

import { randomBytes } from "crypto";
import { AuthTokenPurpose, NotificationType, Role } from "@prisma/client";
import { prisma } from "../../../config/prisma";
import { env } from "../../../config/env";
import { comparePassword, hashPassword, hashToken } from "../../../core/utils/hash";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  HttpError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
  UnprocessableError,
} from "../../../core/errors";
import {
  emailChangeConfirmMail,
  emailDeliveryEnabled,
  emailVerifyMail,
  passwordResetMail,
  securityAlertMail,
  securityAlertText,
  sendMail,
  type SecurityAlertReason,
} from "../../mail/mailer";
import { sendPushToUser } from "../../notifications/push.service";
import { recordLoginEvent } from "../../operations/operations.service";
import {
  decryptSecret,
  encryptSecret,
  generateBackupCodes,
  generateTotpSecret,
  hashBackupCode,
  matchTotpStep,
  otpauthUri,
} from "./totp";
import { evaluateTwoFactor, isPrivilegedRole } from "../../../policies/twoFactorEnforcement";
import { writeAudit } from "../../admin/admin.audit";

// ============================================================
// Durées et limites
// ============================================================
export const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;
export const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
export const EMAIL_CHANGE_TTL_MS = 60 * 60 * 1000;
/** Demandes maximum par compte et par heure, pour chaque type de lien. */
export const TOKEN_REQUESTS_PER_HOUR = 3;

const INVALID_LINK = "Ce lien est invalide ou a expiré. Refais une demande.";

// ============================================================
// Liens à usage unique
// ============================================================
function buildLink(path: string, rawToken: string): string {
  return `${env.APP_PUBLIC_URL.replace(/\/$/, "")}${path}?token=${rawToken}`;
}

async function recentTokenCount(userId: string, purpose: AuthTokenPurpose): Promise<number> {
  return prisma.authToken.count({
    where: { userId, purpose, createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
  });
}

/** Crée un lien ; les liens précédents du même type pour ce compte deviennent inutilisables. */
async function issueToken(params: {
  userId: string;
  purpose: AuthTokenPurpose;
  ttlMs: number;
  newEmail?: string;
}): Promise<string> {
  const raw = randomBytes(32).toString("base64url");
  const now = new Date();
  await prisma.$transaction([
    prisma.authToken.updateMany({
      where: { userId: params.userId, purpose: params.purpose, usedAt: null },
      data: { usedAt: now },
    }),
    prisma.authToken.create({
      data: {
        userId: params.userId,
        purpose: params.purpose,
        tokenHash: hashToken(raw),
        newEmail: params.newEmail ?? null,
        expiresAt: new Date(now.getTime() + params.ttlMs),
      },
    }),
  ]);
  return raw;
}

/** Consomme un lien de façon atomique : deux requêtes simultanées, une seule réussit. */
async function consumeToken(raw: string, purpose: AuthTokenPurpose) {
  const tokenHash = hashToken(raw);
  const now = new Date();
  const claimed = await prisma.authToken.updateMany({
    where: { tokenHash, purpose, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });
  if (claimed.count !== 1) throw new BadRequestError(INVALID_LINK);
  return prisma.authToken.findUniqueOrThrow({ where: { tokenHash } });
}

export async function revokeAllSessions(userId: string): Promise<number> {
  const res = await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return res.count;
}

// ============================================================
// Alertes de sécurité : cloche, push générique, e-mail
// ============================================================
export async function notifySecurity(
  userId: string,
  reason: SecurityAlertReason,
  opts: { emailTo?: string; skipInApp?: boolean } = {},
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user) return;
    if (!opts.skipInApp) {
      await prisma.notification.create({
        data: {
          userId,
          type: NotificationType.SECURITY_ALERT,
          message: securityAlertText(reason),
          meta: { reason },
        },
      });
      // Texte volontairement générique : rien de sensible sur l'écran verrouillé.
      void sendPushToUser({
        userId,
        title: "JeuTaime · Sécurité",
        body: "Une action de sécurité a eu lieu sur ton compte",
        data: { type: "SECURITY_ALERT" },
      });
    }
    await sendMail(securityAlertMail(opts.emailTo ?? user.email, reason));
  } catch {
    // Une alerte qui échoue ne doit jamais faire échouer l'action de sécurité elle-même.
  }
}

// ============================================================
// 1. Mot de passe oublié
// ============================================================
/**
 * Ne révèle jamais si l'adresse correspond à un compte : la réponse HTTP est
 * identique dans tous les cas. Retourne un état interne, utile aux tests.
 */
export async function requestPasswordReset(emailRaw: string): Promise<"sent" | "ignored" | "limited"> {
  const email = emailRaw.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, isBanned: true } });
  if (!user || user.isBanned) return "ignored";
  if ((await recentTokenCount(user.id, AuthTokenPurpose.PASSWORD_RESET)) >= TOKEN_REQUESTS_PER_HOUR) return "limited";

  const raw = await issueToken({ userId: user.id, purpose: AuthTokenPurpose.PASSWORD_RESET, ttlMs: PASSWORD_RESET_TTL_MS });
  await sendMail(passwordResetMail(user.email, buildLink("/reset-password", raw), PASSWORD_RESET_TTL_MS / 60000));
  return "sent";
}

export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  const token = await consumeToken(rawToken, AuthTokenPurpose.PASSWORD_RESET);
  const user = await prisma.user.findUnique({
    where: { id: token.userId },
    select: { id: true, email: true, isBanned: true, emailVerifiedAt: true },
  });
  if (!user || user.isBanned) throw new BadRequestError(INVALID_LINK);

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      // Avoir ouvert le lien prouve la possession de la boîte : l'adresse est vérifiée.
      data: { passwordHash, emailVerifiedAt: user.emailVerifiedAt ?? new Date() },
    }),
    prisma.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } }),
    prisma.authToken.updateMany({
      where: { userId: user.id, purpose: AuthTokenPurpose.PASSWORD_RESET, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);
  // Remet à zéro le compteur de tentatives échouées (voir assertLoginNotLocked).
  await recordLoginEvent({ email: user.email, userId: user.id, success: true, reason: "PASSWORD_RESET" });
  await notifySecurity(user.id, "password_reset");
}

// ============================================================
// 2. Vérification de l'adresse e-mail
// ============================================================
export async function sendEmailVerification(
  userId: string,
  opts: { explicit?: boolean } = {},
): Promise<"sent" | "already_verified" | "limited" | "delivery_disabled"> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, emailVerifiedAt: true } });
  if (!user) throw new NotFoundError("Utilisateur");
  if (user.emailVerifiedAt) return "already_verified";
  if (!emailDeliveryEnabled()) return "delivery_disabled";
  if ((await recentTokenCount(userId, AuthTokenPurpose.EMAIL_VERIFY)) >= TOKEN_REQUESTS_PER_HOUR) {
    if (opts.explicit) throw new TooManyRequestsError("Trop de demandes. Réessaie dans une heure.");
    return "limited";
  }
  const raw = await issueToken({ userId, purpose: AuthTokenPurpose.EMAIL_VERIFY, ttlMs: EMAIL_VERIFY_TTL_MS });
  await sendMail(emailVerifyMail(user.email, buildLink("/verify-email", raw)));
  return "sent";
}

export async function verifyEmail(rawToken: string): Promise<void> {
  const token = await consumeToken(rawToken, AuthTokenPurpose.EMAIL_VERIFY);
  await prisma.user.update({ where: { id: token.userId }, data: { emailVerifiedAt: new Date() } });
}

// ============================================================
// 3 et 4. Changement d'adresse avec confirmation de la nouvelle
// ============================================================
export type EmailChangeOutcome =
  | { status: "changed"; email: string }
  | { status: "pending_confirmation" };

/**
 * Si l'envoi d'e-mails est actif : l'adresse ne change PAS tout de suite ; un
 * lien est envoyé à la nouvelle adresse et le changement n'a lieu qu'à son
 * ouverture. Sinon (aucun fournisseur configuré) : comportement historique,
 * changement immédiat, pour ne pas bloquer les utilisateurs.
 */
export async function requestEmailChange(
  userId: string,
  currentPassword: string,
  newEmailRaw: string,
): Promise<EmailChangeOutcome> {
  const newEmail = newEmailRaw.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, passwordHash: true } });
  if (!user) throw new NotFoundError("Utilisateur");
  if (!(await comparePassword(currentPassword, user.passwordHash))) {
    throw new UnauthorizedError("Mot de passe actuel incorrect");
  }
  if (user.email.toLowerCase() === newEmail) {
    throw new ConflictError("Cette adresse e-mail est déjà celle de ton compte");
  }
  if (await prisma.user.findUnique({ where: { email: newEmail }, select: { id: true } })) {
    throw new ConflictError("Cette adresse e-mail est déjà utilisée");
  }

  if (!emailDeliveryEnabled()) {
    await applyEmailChange(userId, user.email, newEmail, false);
    return { status: "changed", email: newEmail };
  }

  if ((await recentTokenCount(userId, AuthTokenPurpose.EMAIL_CHANGE)) >= TOKEN_REQUESTS_PER_HOUR) {
    throw new TooManyRequestsError("Trop de demandes. Réessaie dans une heure.");
  }
  const raw = await issueToken({ userId, purpose: AuthTokenPurpose.EMAIL_CHANGE, ttlMs: EMAIL_CHANGE_TTL_MS, newEmail });
  await sendMail(emailChangeConfirmMail(newEmail, buildLink("/confirm-email-change", raw)));
  return { status: "pending_confirmation" };
}

async function applyEmailChange(userId: string, oldEmail: string, newEmail: string, verified: boolean) {
  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { email: newEmail, emailVerifiedAt: verified ? new Date() : null },
      }),
      prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
  } catch {
    throw new ConflictError("Cette adresse e-mail est déjà utilisée");
  }
  // L'alerte part vers l'ANCIENNE adresse et ne mentionne pas la nouvelle.
  await notifySecurity(userId, "email_changed", { emailTo: oldEmail });
}

export async function confirmEmailChange(rawToken: string): Promise<void> {
  const token = await consumeToken(rawToken, AuthTokenPurpose.EMAIL_CHANGE);
  if (!token.newEmail) throw new BadRequestError(INVALID_LINK);
  const user = await prisma.user.findUnique({ where: { id: token.userId }, select: { email: true } });
  if (!user) throw new BadRequestError(INVALID_LINK);
  await applyEmailChange(token.userId, user.email, token.newEmail, true);
}

// ============================================================
// 5. Protection contre les tentatives répétées de connexion
// ============================================================
const COUNTED_FAILURES = ["INVALID_CREDENTIALS", "TWO_FACTOR_INVALID"];

export async function assertLoginNotLocked(emailRaw: string): Promise<void> {
  const email = emailRaw.trim().toLowerCase();
  const windowStart = new Date(Date.now() - env.LOGIN_LOCK_WINDOW_MINUTES * 60 * 1000);
  const lastSuccess = await prisma.loginEvent.findFirst({
    where: { email, success: true, createdAt: { gt: windowStart } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const failures = await prisma.loginEvent.count({
    where: {
      email,
      success: false,
      reason: { in: COUNTED_FAILURES },
      createdAt: { gt: lastSuccess?.createdAt ?? windowStart },
    },
  });
  if (failures >= env.LOGIN_LOCK_MAX_FAILURES) {
    await recordLoginEvent({ email, success: false, reason: "LOCKED" });
    throw new TooManyRequestsError(
      `Trop de tentatives de connexion. Réessaie dans ${env.LOGIN_LOCK_WINDOW_MINUTES} minutes ou réinitialise ton mot de passe.`,
    );
  }
}

// ============================================================
// 6 et 7. Sessions, appareils, historique
// ============================================================
export async function listSessions(userId: string) {
  const rows = await prisma.refreshToken.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true, lastUsedAt: true, userAgent: true, ip: true, expiresAt: true },
  });
  return rows.map((r) => ({ ...r, device: describeDevice(r.userAgent) }));
}

export function describeDevice(userAgent: string | null): string {
  if (!userAgent) return "Appareil inconnu";
  if (/iphone|ipad|ios|darwin/i.test(userAgent)) return "iPhone ou iPad";
  if (/android|okhttp/i.test(userAgent)) return "Android";
  if (/mozilla|chrome|safari|firefox/i.test(userAgent)) return "Navigateur web";
  return "Appareil inconnu";
}

export async function revokeSession(userId: string, sessionId: string): Promise<void> {
  const res = await prisma.refreshToken.updateMany({
    where: { id: sessionId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (res.count !== 1) throw new NotFoundError("Session");
}

/** Déconnecte tous les appareils et retire tous les jetons de notification du compte. */
export async function logoutEverywhere(userId: string): Promise<{ sessions: number; pushTokens: number }> {
  const sessions = await revokeAllSessions(userId);
  const push = await prisma.pushToken.deleteMany({ where: { userId } });
  await notifySecurity(userId, "all_sessions_revoked");
  return { sessions, pushTokens: push.count };
}

/** Retire le jeton de notification d'UN appareil (déconnexion simple). */
export async function removePushToken(userId: string, token: string): Promise<number> {
  return (await prisma.pushToken.deleteMany({ where: { userId, token } })).count;
}

export async function loginHistory(userId: string, limit = 20) {
  return prisma.loginEvent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 50),
    select: { id: true, success: true, reason: true, createdAt: true },
  });
}

/** Une connexion est « nouvelle » si ce compte a déjà eu des sessions, mais aucune depuis cet appareil. */
export async function isNewDevice(userId: string, userAgent: string | null | undefined): Promise<boolean> {
  if (!userAgent) return false;
  const [total, same] = await Promise.all([
    prisma.refreshToken.count({ where: { userId } }),
    prisma.refreshToken.count({ where: { userId, userAgent } }),
  ]);
  return total > 0 && same === 0;
}

// ============================================================
// 8. Double authentification TOTP (OWNER et ADMIN)
// ============================================================
export class TwoFactorRequiredError extends HttpError {
  constructor() {
    super(401, "TWO_FACTOR_REQUIRED", "Saisis le code de ton application d'authentification.");
    this.name = "TwoFactorRequiredError";
  }
}

/** Délai de transition dépassé : les fonctions d'administration sont fermées jusqu'à la configuration. */
export class TwoFactorSetupRequiredError extends HttpError {
  constructor() {
    super(
      403,
      "TWO_FACTOR_SETUP_REQUIRED",
      "La double authentification est obligatoire pour accéder à l'administration. Configure-la dans Réglages → Sécurité et appareils.",
    );
    this.name = "TwoFactorSetupRequiredError";
  }
}

function requireEncryptionKey(): string {
  if (!env.TWO_FACTOR_ENCRYPTION_KEY) {
    throw new UnprocessableError("La double authentification n'est pas encore configurée sur ce serveur.");
  }
  return env.TWO_FACTOR_ENCRYPTION_KEY;
}

const TWO_FACTOR_FIELDS = {
  role: true,
  twoFactorEnabledAt: true,
  privilegedRoleSince: true,
} as const;

export function enforcementFor(user: { role: string; twoFactorEnabledAt: Date | null; privilegedRoleSince: Date | null }) {
  return evaluateTwoFactor({
    role: user.role,
    twoFactorEnabledAt: user.twoFactorEnabledAt,
    privilegedRoleSince: user.privilegedRoleSince,
    // Sans clé de chiffrement, la double authentification ne peut pas être configurée :
    // l'obligation n'est alors pas appliquée (jamais d'exigence impossible à satisfaire).
    enforcementStart: env.TWO_FACTOR_ENCRYPTION_KEY ? env.TWO_FACTOR_ENFORCEMENT_START : undefined,
  });
}

/**
 * Appelé pour toute route réservée au personnel. Lu en base à chaque requête :
 * une session ouverte avant l'échéance est donc bloquée dès l'échéance, et
 * un rôle ne peut pas être « emprunté » via un ancien jeton.
 * Ne concerne jamais MODERATOR ni USER, et ne ferme jamais les routes de configuration.
 */
export async function assertPrivilegedTwoFactor(userId: string, role: string): Promise<void> {
  if (!isPrivilegedRole(role)) return;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: TWO_FACTOR_FIELDS });
  if (!user) throw new UnauthorizedError("Utilisateur introuvable");
  if (enforcementFor(user).state === "blocked") throw new TwoFactorSetupRequiredError();
}

/** Code TOTP à usage unique : un pas déjà utilisé est refusé, y compris en cas de requêtes simultanées. */
async function acceptTotp(userId: string, secret: string, code: string): Promise<boolean> {
  const step = matchTotpStep(secret, code);
  if (step === null) return false;
  const claimed = await prisma.user.updateMany({
    where: { id: userId, OR: [{ twoFactorLastStep: null }, { twoFactorLastStep: { lt: step } }] },
    data: { twoFactorLastStep: step },
  });
  return claimed.count === 1;
}

/** Vérifie un code TOTP ou un code de secours (chacun à usage unique). */
export async function verifySecondFactor(userId: string, encryptedSecret: string, code: string): Promise<boolean> {
  const key = requireEncryptionKey();
  if (await acceptTotp(userId, decryptSecret(encryptedSecret, key), code)) return true;
  const used = await prisma.twoFactorBackupCode.updateMany({
    where: { userId, codeHash: hashBackupCode(code), usedAt: null },
    data: { usedAt: new Date() },
  });
  return used.count === 1;
}

async function loadSecurityUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      passwordHash: true,
      twoFactorSecret: true,
      twoFactorPendingSecret: true,
      ...TWO_FACTOR_FIELDS,
    },
  });
  if (!user) throw new NotFoundError("Utilisateur");
  return user;
}

/**
 * Prépare un secret. Il reste « en attente » et n'a aucun effet sur la connexion
 * tant qu'un code valide ne l'a pas confirmé. Si la double authentification est
 * déjà active (changement d'appareil), un code actuel est exigé en plus du mot de passe.
 */
export async function setupTwoFactor(userId: string, currentPassword: string, currentCode?: string) {
  const key = requireEncryptionKey();
  const user = await loadSecurityUser(userId);
  if (!isPrivilegedRole(user.role)) {
    throw new ForbiddenError("La double authentification est réservée aux comptes d'administration.");
  }
  if (!(await comparePassword(currentPassword, user.passwordHash))) {
    throw new UnauthorizedError("Mot de passe actuel incorrect");
  }
  if (user.twoFactorEnabledAt && user.twoFactorSecret) {
    if (!currentCode) throw new BadRequestError("Saisis un code actuel pour changer d'appareil.");
    if (!(await verifySecondFactor(userId, user.twoFactorSecret, currentCode))) {
      throw new BadRequestError("Code incorrect.");
    }
  }
  const secret = generateTotpSecret();
  await prisma.user.update({ where: { id: userId }, data: { twoFactorPendingSecret: encryptSecret(secret, key) } });
  // Le secret n'est renvoyé qu'ici, une seule fois, pour être saisi dans l'application d'authentification.
  return { secret, otpauthUri: otpauthUri(secret, user.email), replacing: Boolean(user.twoFactorEnabledAt) };
}

/** Confirme le secret en attente : l'active (ou remplace l'ancien) et émet 10 nouveaux codes de secours. */
export async function enableTwoFactor(userId: string, code: string): Promise<{ backupCodes: string[] }> {
  const key = requireEncryptionKey();
  const user = await loadSecurityUser(userId);
  if (!user.twoFactorPendingSecret) throw new BadRequestError("Commence par lancer la configuration.");
  const secret = decryptSecret(user.twoFactorPendingSecret, key);
  const step = matchTotpStep(secret, code);
  if (step === null) throw new BadRequestError("Code incorrect. Vérifie l'heure de ton téléphone et réessaie.");

  const wasEnabled = Boolean(user.twoFactorEnabledAt);
  const backupCodes = generateBackupCodes();
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: user.twoFactorPendingSecret,
        twoFactorPendingSecret: null,
        twoFactorEnabledAt: user.twoFactorEnabledAt ?? new Date(),
        twoFactorLastStep: step,
      },
    }),
    prisma.twoFactorBackupCode.deleteMany({ where: { userId } }),
    prisma.twoFactorBackupCode.createMany({ data: backupCodes.map((c) => ({ userId, codeHash: hashBackupCode(c) })) }),
  ]);
  await notifySecurity(userId, wasEnabled ? "two_factor_replaced" : "two_factor_enabled");
  return { backupCodes };
}

/** Nouveaux codes de secours : les précédents cessent immédiatement de fonctionner. */
export async function regenerateBackupCodes(userId: string, currentPassword: string, code: string) {
  const user = await loadSecurityUser(userId);
  if (!user.twoFactorEnabledAt || !user.twoFactorSecret) {
    throw new BadRequestError("La double authentification n'est pas active.");
  }
  if (!(await comparePassword(currentPassword, user.passwordHash))) {
    throw new UnauthorizedError("Mot de passe actuel incorrect");
  }
  if (!(await verifySecondFactor(userId, user.twoFactorSecret, code))) throw new BadRequestError("Code incorrect.");
  const backupCodes = generateBackupCodes();
  await prisma.$transaction([
    prisma.twoFactorBackupCode.deleteMany({ where: { userId } }),
    prisma.twoFactorBackupCode.createMany({ data: backupCodes.map((c) => ({ userId, codeHash: hashBackupCode(c) })) }),
  ]);
  await notifySecurity(userId, "backup_codes_regenerated");
  return { backupCodes };
}

/**
 * Désactivation voulue par l'utilisateur. Refusée tant que l'obligation est en vigueur
 * pour un compte OWNER ou ADMIN : seul un changement d'appareil est possible.
 */
export async function disableTwoFactor(userId: string, currentPassword: string, code: string): Promise<void> {
  const user = await loadSecurityUser(userId);
  if (!user.twoFactorEnabledAt || !user.twoFactorSecret) {
    throw new BadRequestError("La double authentification n'est pas active.");
  }
  if (enforcementFor(user).mandatory) {
    throw new ForbiddenError(
      "La double authentification est obligatoire pour ton rôle. Tu peux changer d'appareil, mais pas la désactiver.",
    );
  }
  if (!(await comparePassword(currentPassword, user.passwordHash))) {
    throw new UnauthorizedError("Mot de passe actuel incorrect");
  }
  if (!(await verifySecondFactor(userId, user.twoFactorSecret, code))) {
    throw new BadRequestError("Code incorrect.");
  }
  await clearTwoFactor(userId);
  await notifySecurity(userId, "two_factor_disabled");
}

/** Efface secret, secret en attente, anti-rejeu et codes de secours. Jamais appelée automatiquement. */
export async function clearTwoFactor(userId: string): Promise<void> {
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: null, twoFactorPendingSecret: null, twoFactorEnabledAt: null, twoFactorLastStep: null },
    }),
    prisma.twoFactorBackupCode.deleteMany({ where: { userId } }),
  ]);
}

/**
 * Récupération d'un compte dont le téléphone et les codes de secours sont perdus.
 * Action humaine de l'OWNER, jamais automatique : elle exige son mot de passe ET un
 * code de sa propre double authentification, est tracée au journal d'audit, ferme
 * toutes les sessions du compte concerné et l'en avertit.
 * Un OWNER qui se verrouille lui-même n'a pas de recours dans l'application
 * (voir scripts/reset-two-factor.ts).
 */
export async function resetTwoFactorByOwner(params: {
  actor: { id: string; role: string };
  targetId: string;
  actorPassword: string;
  actorCode: string;
  reason: string;
}): Promise<void> {
  const { actor, targetId, actorPassword, actorCode, reason } = params;
  if (actor.role !== Role.OWNER) throw new ForbiddenError("Réservé au propriétaire.");
  if (actor.id === targetId) {
    throw new BadRequestError("Tu ne peux pas réinitialiser ta propre double authentification depuis l'application.");
  }
  const owner = await loadSecurityUser(actor.id);
  if (!owner.twoFactorEnabledAt || !owner.twoFactorSecret) {
    throw new ForbiddenError("Active d'abord ta propre double authentification pour effectuer cette action.");
  }
  if (!(await comparePassword(actorPassword, owner.passwordHash))) {
    throw new UnauthorizedError("Mot de passe incorrect");
  }
  if (!(await verifySecondFactor(actor.id, owner.twoFactorSecret, actorCode))) {
    throw new BadRequestError("Code incorrect.");
  }

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, role: true, twoFactorEnabledAt: true },
  });
  if (!target) throw new NotFoundError("Utilisateur");
  if (target.role === Role.OWNER) throw new ForbiddenError("Le compte propriétaire ne peut pas être réinitialisé ainsi.");
  if (!target.twoFactorEnabledAt) throw new BadRequestError("La double authentification n'est pas active sur ce compte.");

  await clearTwoFactor(targetId);
  const sessions = await revokeAllSessions(targetId);
  await writeAudit({
    actorId: actor.id,
    action: "admin.user.two_factor.reset",
    target: targetId,
    meta: { reason, sessionsRevoked: sessions, targetRole: target.role },
  });
  await notifySecurity(targetId, "two_factor_reset");
}

/**
 * Dernier recours, exécuté par la personne qui détient l'accès à la base
 * (scripts/reset-two-factor.ts). Jamais déclenché automatiquement.
 * Efface la double authentification, ferme les sessions, laisse une trace d'audit
 * sans auteur applicatif, et avertit le compte.
 */
export async function resetTwoFactorByOperator(userId: string, note: string): Promise<{ sessionsRevoked: number }> {
  await clearTwoFactor(userId);
  const sessionsRevoked = await revokeAllSessions(userId);
  await prisma.auditLog.create({
    data: { actorId: null, action: "operator.user.two_factor.reset", target: userId, meta: { note, sessionsRevoked } },
  });
  await notifySecurity(userId, "two_factor_reset");
  return { sessionsRevoked };
}

export async function twoFactorStatus(userId: string) {
  const user = await loadSecurityUser(userId);
  const verified = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { emailVerifiedAt: true } });
  const enforcement = enforcementFor(user);
  const remaining = user.twoFactorEnabledAt
    ? await prisma.twoFactorBackupCode.count({ where: { userId, usedAt: null } })
    : 0;
  return {
    available: isPrivilegedRole(user.role) && Boolean(env.TWO_FACTOR_ENCRYPTION_KEY),
    enabled: Boolean(user.twoFactorEnabledAt),
    backupCodesRemaining: remaining,
    emailVerified: Boolean(verified.emailVerifiedAt),
    emailDelivery: emailDeliveryEnabled(),
    enforcement: {
      state: enforcement.state,
      mandatory: enforcement.mandatory,
      deadline: enforcement.deadline,
      daysLeft: enforcement.daysLeft,
    },
  };
}

import { Request, Response } from "express";
import * as authService from "./auth.service";
import { changeEmail, changePassword } from "./accountSecurity.service";
import { exportPersonalData } from "./dataExport.service";
import { deactivateAccount, reactivateAccountByEmail } from "./accountLifecycle.service";
import { deleteAccountPermanently } from "./accountDeletion.service";
import { AuthedRequest } from "../../core/types";
import { BadRequestError } from "../../core/errors";
import * as security from "./security/accountSecurity.core";
import { emailDeliveryEnabled } from "../mail/mailer";

function sessionContext(req: Request) {
  return { ip: req.ip ?? null, userAgent: req.get("user-agent") ?? null };
}

export async function handleRegister(req: Request, res: Response) {
  const tokens = await authService.register(req.body, sessionContext(req));
  res.status(201).json({ data: tokens });
}

export async function handleLogin(req: Request, res: Response) {
  const tokens = await authService.login(req.body, sessionContext(req));

  // La réactivation est un effet secondaire : elle ne doit jamais empêcher
  // une connexion valide si la table/migration de cycle de vie est indisponible.
  let reactivated = false;
  try {
    reactivated = await reactivateAccountByEmail(req.body.email);
  } catch {
    reactivated = false;
  }

  res.json({ data: tokens, meta: { reactivated } });
}

export async function handleRefresh(req: Request, res: Response) {
  const tokens = await authService.refresh(req.body.refreshToken, sessionContext(req));
  res.json({ data: tokens });
}

export async function handleLogout(req: AuthedRequest, res: Response) {
  const body = req.body as Record<string, unknown>;
  const refreshToken = typeof body["refreshToken"] === "string" ? body["refreshToken"] : "";
  if (!refreshToken) throw new BadRequestError("refreshToken requis dans le body");
  await authService.logout(req.user.userId, refreshToken);
  res.json({ data: { message: "Déconnecté avec succès" } });
}

export async function handleChangePassword(req: AuthedRequest, res: Response) {
  await changePassword(req.user.userId, req.body.currentPassword, req.body.newPassword);
  res.json({ data: { message: "Mot de passe modifié" } });
}

export async function handleChangeEmail(req: AuthedRequest, res: Response) {
  const email = await changeEmail(req.user.userId, req.body.currentPassword, req.body.newEmail);
  if (email === null) {
    res.json({
      data: {
        status: "pending_confirmation",
        message: "Un lien de confirmation a été envoyé à ta nouvelle adresse. Ton adresse actuelle reste valable tant que tu ne l'as pas ouvert.",
      },
    });
    return;
  }
  res.json({ data: { status: "changed", message: "Adresse e-mail modifiée", email } });
}

export async function handleDeactivate(req: AuthedRequest, res: Response) {
  await deactivateAccount(req.user.userId, req.body.currentPassword);
  res.json({ data: { message: "Compte désactivé" } });
}

export async function handleDeleteAccount(req: AuthedRequest, res: Response) {
  await deleteAccountPermanently(req.user.userId, req.body.currentPassword);
  res.json({ data: { message: "Compte supprimé définitivement" } });
}

export async function handleExportData(req: AuthedRequest, res: Response) {
  const data = await exportPersonalData(req.user.userId);
  res.json({ data });
}

export async function handleMe(req: AuthedRequest, res: Response) {
  const user = await authService.getMe(req.user.userId);
  res.json({ data: user });
}

// ------------------------------------------------------------------
// Sécurité des comptes
// ------------------------------------------------------------------
const GENERIC_RESET = "Si un compte existe pour cette adresse, un e-mail vient de lui être envoyé.";

export async function handleForgotPassword(req: Request, res: Response) {
  await security.requestPasswordReset(req.body.email);
  // Réponse identique que le compte existe ou non.
  res.json({ data: { message: GENERIC_RESET } });
}

export async function handleResetPassword(req: Request, res: Response) {
  await security.resetPassword(req.body.token, req.body.newPassword);
  res.json({ data: { message: "Mot de passe modifié. Tu peux te connecter." } });
}

export async function handleVerifyEmail(req: Request, res: Response) {
  await security.verifyEmail(req.body.token);
  res.json({ data: { message: "Adresse e-mail confirmée." } });
}

export async function handleResendVerification(req: AuthedRequest, res: Response) {
  const status = await security.sendEmailVerification(req.user.userId, { explicit: true });
  res.json({ data: { status } });
}

export async function handleConfirmEmailChange(req: Request, res: Response) {
  await security.confirmEmailChange(req.body.token);
  res.json({ data: { message: "Nouvelle adresse confirmée. Reconnecte-toi avec elle." } });
}

export async function handleLogoutAll(req: AuthedRequest, res: Response) {
  const result = await security.logoutEverywhere(req.user.userId);
  res.json({ data: { message: "Tous les appareils ont été déconnectés.", ...result } });
}

export async function handleListSessions(req: AuthedRequest, res: Response) {
  res.json({ data: await security.listSessions(req.user.userId, req.user.sessionId) });
}

export async function handleRevokeSession(req: AuthedRequest, res: Response) {
  await security.revokeSession(req.user.userId, String(req.params["id"]), req.user.sessionId);
  res.json({ data: { message: "Appareil déconnecté." } });
}

export async function handleLoginHistory(req: AuthedRequest, res: Response) {
  res.json({ data: await security.loginHistory(req.user.userId) });
}

export async function handleSecurityStatus(req: AuthedRequest, res: Response) {
  res.json({ data: await security.twoFactorStatus(req.user.userId) });
}

export async function handleTwoFactorSetup(req: AuthedRequest, res: Response) {
  res.json({ data: await security.setupTwoFactor(req.user.userId, req.body.currentPassword, req.body.currentCode) });
}

export async function handleTwoFactorEnable(req: AuthedRequest, res: Response) {
  const result = await security.enableTwoFactor(req.user.userId, req.body.code);
  res.json({
    data: {
      message: "Double authentification activée. Conserve ces codes de secours : ils ne seront plus affichés.",
      ...result,
    },
  });
}

export async function handleTwoFactorDisable(req: AuthedRequest, res: Response) {
  await security.disableTwoFactor(req.user.userId, req.body.currentPassword, req.body.code);
  res.json({ data: { message: "Double authentification désactivée." } });
}

/** Public : l'application s'en sert pour n'afficher « Mot de passe oublié ? » que si un e-mail peut réellement partir. */
export async function handleCapabilities(_req: Request, res: Response) {
  res.json({ data: { emailDelivery: emailDeliveryEnabled() } });
}

export async function handleBackupCodes(req: AuthedRequest, res: Response) {
  const result = await security.regenerateBackupCodes(req.user.userId, req.body.currentPassword, req.body.code);
  res.json({
    data: { message: "Nouveaux codes de secours générés. Les anciens ne fonctionnent plus.", ...result },
  });
}

import { env } from "../../config/env";
import { logger } from "../../config/logger";

/**
 * Envoi d'e-mails transactionnels.
 *
 * Architecture : une interface unique, plusieurs transports.
 * - "disabled" (par défaut) : rien n'est envoyé. Seule la nature du message est journalisée.
 * - "memory" : boîte simulée, pour les tests et le développement.
 * - un transport de fournisseur réel sera ajouté ici après le choix du fournisseur
 *   (voir docs/authentification-comptes.md) ; aucun n'est branché aujourd'hui.
 *
 * Le corps des messages et les liens ne sont jamais journalisés.
 */
export type MailKind =
  | "password_reset"
  | "email_verify"
  | "email_change_confirm"
  | "security_alert";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  kind: MailKind;
}

export interface MailTransport {
  readonly name: string;
  /** Vrai si un message remis à ce transport peut réellement atteindre son destinataire. */
  readonly delivers: boolean;
  send(message: MailMessage & { from: string }): Promise<void>;
}

class DisabledTransport implements MailTransport {
  readonly name = "disabled";
  readonly delivers = false;
  async send(message: MailMessage): Promise<void> {
    logger.info({ kind: message.kind }, "E-mail non envoyé : transport désactivé");
  }
}

export class MemoryTransport implements MailTransport {
  readonly name = "memory";
  readonly delivers = true;
  readonly outbox: Array<MailMessage & { from: string }> = [];
  async send(message: MailMessage & { from: string }): Promise<void> {
    this.outbox.push(message);
  }
  last(kind?: MailKind) {
    const list = kind ? this.outbox.filter((m) => m.kind === kind) : this.outbox;
    return list[list.length - 1];
  }
  clear() {
    this.outbox.length = 0;
  }
}

let transport: MailTransport =
  env.EMAIL_TRANSPORT === "memory" ? new MemoryTransport() : new DisabledTransport();

export function getMailTransport(): MailTransport {
  return transport;
}

/** Réservé aux tests et à l'initialisation : remplace le transport courant. */
export function setMailTransport(next: MailTransport): void {
  transport = next;
}

export function emailDeliveryEnabled(): boolean {
  return transport.delivers;
}

/** N'échoue jamais : un e-mail non parti ne doit pas faire échouer l'action de sécurité. */
export async function sendMail(message: MailMessage): Promise<boolean> {
  try {
    await transport.send({ ...message, from: env.EMAIL_FROM });
    return transport.delivers;
  } catch (err) {
    logger.error({ err, kind: message.kind }, "Échec d'envoi d'e-mail");
    return false;
  }
}

// ------------------------------------------------------------------
// Modèles de messages (texte brut, sans donnée sensible inutile)
// ------------------------------------------------------------------
const SIGNATURE = "\n\nL'équipe JeuTaime\nSi tu n'es pas à l'origine de cette demande, ignore ce message : rien ne changera.";

export function passwordResetMail(to: string, link: string, minutes: number): MailMessage {
  return {
    to,
    kind: "password_reset",
    subject: "JeuTaime — réinitialiser ton mot de passe",
    text: `Tu as demandé à réinitialiser ton mot de passe.\n\nOuvre ce lien (valable ${minutes} minutes, utilisable une seule fois) :\n${link}${SIGNATURE}`,
  };
}

export function emailVerifyMail(to: string, link: string): MailMessage {
  return {
    to,
    kind: "email_verify",
    subject: "JeuTaime — confirme ton adresse e-mail",
    text: `Bienvenue sur JeuTaime.\n\nConfirme ton adresse en ouvrant ce lien (valable 24 heures) :\n${link}${SIGNATURE}`,
  };
}

export function emailChangeConfirmMail(to: string, link: string): MailMessage {
  return {
    to,
    kind: "email_change_confirm",
    subject: "JeuTaime — confirme ta nouvelle adresse e-mail",
    text: `Une demande de changement d'adresse a été faite pour un compte JeuTaime.\n\nPour confirmer que cette adresse est la tienne, ouvre ce lien (valable 1 heure) :\n${link}\n\nTant que ce lien n'est pas ouvert, l'adresse du compte ne change pas.${SIGNATURE}`,
  };
}

export type SecurityAlertReason =
  | "password_changed"
  | "password_reset"
  | "email_changed"
  | "new_device_login"
  | "two_factor_enabled"
  | "two_factor_disabled"
  | "all_sessions_revoked";

const ALERT_TEXT: Record<SecurityAlertReason, string> = {
  password_changed: "Le mot de passe de ton compte JeuTaime vient d'être modifié.",
  password_reset: "Le mot de passe de ton compte JeuTaime vient d'être réinitialisé.",
  // Volontairement sans la nouvelle adresse : ce message part vers l'ancienne.
  email_changed: "L'adresse e-mail de ton compte JeuTaime vient d'être modifiée. Cette adresse n'y est plus associée.",
  new_device_login: "Une connexion à ton compte JeuTaime vient d'avoir lieu depuis un nouvel appareil.",
  two_factor_enabled: "La double authentification vient d'être activée sur ton compte JeuTaime.",
  two_factor_disabled: "La double authentification vient d'être désactivée sur ton compte JeuTaime.",
  all_sessions_revoked: "Tous les appareils ont été déconnectés de ton compte JeuTaime.",
};

export function securityAlertText(reason: SecurityAlertReason): string {
  return ALERT_TEXT[reason];
}

export function securityAlertMail(to: string, reason: SecurityAlertReason): MailMessage {
  return {
    to,
    kind: "security_alert",
    subject: "JeuTaime — alerte de sécurité",
    text: `${ALERT_TEXT[reason]}\n\nSi c'est bien toi, tu n'as rien à faire.\nSinon, change ton mot de passe immédiatement et contacte le support depuis l'application.\n\nL'équipe JeuTaime`,
  };
}

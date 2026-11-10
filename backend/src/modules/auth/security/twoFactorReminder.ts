import { NotificationType, Role } from "@prisma/client";
import { prisma } from "../../../config/prisma";
import { logger } from "../../../config/logger";
import { TWO_FACTOR_GRACE_DAYS } from "../../../policies/twoFactorEnforcement";
import { reminderMessage, reminderToSend } from "../../../policies/twoFactorReminder";
import { sendMail, twoFactorReminderMail } from "../../mail/mailer";
import { sendPushToUser } from "../../notifications/push.service";
import { enforcementFor } from "./accountSecurity.core";

const DAY_MS = 24 * 60 * 60 * 1000;
const REMINDER_REASON = "two_factor_reminder";

export interface ReminderRunResult {
  scanned: number;
  sent: number;
}

async function sentThresholds(userId: string, since: Date): Promise<number[]> {
  const rows = await prisma.notification.findMany({
    where: {
      userId,
      type: NotificationType.SECURITY_ALERT,
      createdAt: { gte: since },
      meta: { path: ["reason"], equals: REMINDER_REASON },
    },
    select: { meta: true },
  });
  return rows
    .map((r) => (r.meta as { threshold?: unknown } | null)?.threshold)
    .filter((t): t is number => typeof t === "number");
}

/**
 * Envoie, au plus une fois par seuil et par compte, le rappel de sécurité aux
 * OWNER et ADMIN dont le délai de transition court encore et qui n'ont pas
 * configuré la double authentification. Ne concerne jamais USER ni MODERATOR,
 * ni un compte déjà protégé, ni un compte déjà bloqué, ni un compte suspendu.
 * Idempotent, y compris si le job tourne en double.
 */
export async function runTwoFactorGraceReminders(now: Date = new Date()): Promise<ReminderRunResult> {
  const users = await prisma.user.findMany({
    where: { role: { in: [Role.OWNER, Role.ADMIN] }, twoFactorEnabledAt: null, isBanned: false },
    select: { id: true, email: true, role: true, twoFactorEnabledAt: true, privilegedRoleSince: true },
  });

  let sent = 0;
  for (const user of users) {
    const enforcement = enforcementFor(user, now);
    if (enforcement.state !== "grace" || !enforcement.deadline || enforcement.daysLeft === null) continue;

    // Cycle d'obligation courant : tout rappel antérieur à (échéance − 14 jours) appartient à un cycle passé.
    const cycleStart = new Date(enforcement.deadline.getTime() - TWO_FACTOR_GRACE_DAYS * DAY_MS);
    const threshold = reminderToSend(enforcement.daysLeft, await sentThresholds(user.id, cycleStart));
    if (threshold === null) continue;

    const daysLeft = enforcement.daysLeft;
    const created = await prisma.$transaction(async (tx) => {
      // Un seul exécuteur à la fois par compte : deux jobs simultanés n'envoient pas deux rappels.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"2fa-reminder:" + user.id}))`;
      const already = await tx.notification.findMany({
        where: {
          userId: user.id,
          type: NotificationType.SECURITY_ALERT,
          createdAt: { gte: cycleStart },
          meta: { path: ["reason"], equals: REMINDER_REASON },
        },
        select: { meta: true },
      });
      const done = already
        .map((r) => (r.meta as { threshold?: unknown } | null)?.threshold)
        .filter((t): t is number => typeof t === "number");
      if (reminderToSend(daysLeft, done) === null) return false;
      await tx.notification.create({
        data: {
          userId: user.id,
          type: NotificationType.SECURITY_ALERT,
          message: reminderMessage(daysLeft),
          meta: { reason: REMINDER_REASON, threshold, daysLeft },
        },
      });
      return true;
    });
    if (!created) continue;
    sent += 1;

    try {
      // Texte volontairement générique : rien de sensible sur l'écran verrouillé.
      void sendPushToUser({
        userId: user.id,
        title: "JeuTaime · Sécurité",
        body: "Une action de sécurité t'attend sur ton compte",
        data: { type: "SECURITY_ALERT" },
      });
      await sendMail(twoFactorReminderMail(user.email, daysLeft, enforcement.deadline));
    } catch (err) {
      logger.warn({ err }, "Rappel de double authentification : envoi push ou e-mail impossible");
    }
  }
  return { scanned: users.length, sent };
}

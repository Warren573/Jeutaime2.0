/**
 * Helper centralisé pour logger les actions admin dans AuditLog.
 * Toutes les mutations admin DOIVENT passer par ici pour garantir
 * une traçabilité homogène.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

export interface AuditEntry {
  actorId: string;
  action: string; // ex: "admin.salon.update"
  target?: string | null; // ex: salonId
  meta?: Prisma.InputJsonValue;
}

/**
 * Écrit une entrée AuditLog. À appeler APRÈS la réussite d'une mutation.
 *
 * N'est PAS inclus dans la transaction métier : un échec de logging
 * ne doit jamais annuler une opération déjà validée. Les erreurs sont
 * swallowed mais loggées via pino (côté global error handler si besoin).
 */
export async function writeAudit(entry: AuditEntry): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      target: entry.target ?? null,
      ...(entry.meta !== undefined ? { meta: entry.meta } : {}),
    },
  });
}

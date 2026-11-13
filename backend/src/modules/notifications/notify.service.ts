/**
 * Point d'entrée UNIQUE des notifications d'événements (phase 2) : notification interne (cloche)
 * + push, avec les mêmes garde-fous pour tous les événements.
 *
 * Garde-fous, dans l'ordre :
 *   1. jamais de notification à l'auteur de l'action (`actorId`) ;
 *   2. destinataire inexistant (compte supprimé), banni ou désactivé : rien ;
 *   3. blocage entre l'auteur et le destinataire (dans un sens ou dans l'autre) : rien ;
 *   4. coalescence optionnelle : une seule notification NON LUE par ressource (ex. une bouteille) ;
 *   5. idempotence en base : une seule notification par (destinataire, `dedupeKey`) ;
 *   6. push générique via le service existant (préférences, catégories, état du compte, jetons).
 *
 * Ne lève JAMAIS : une notification ne doit pas faire échouer l'action métier qui l'a déclenchée.
 * Aucun texte, pseudo, montant ni contenu privé n'est transmis : seuls les identifiants de routage
 * autorisés par `sanitizeNotificationMeta` sont conservés.
 */
import { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { logger } from "../../config/logger";
import { isAccountDeactivated } from "../auth/accountLifecycle.service";
import { buildPushPayload, sanitizeNotificationMeta, type AllowedMetaKey } from "../../policies/notifications";
import { createNotification } from "./notifications.service";
import { sendPushToUser } from "./push.service";

export type NotifyOutcome =
  | { created: true; notificationId: string }
  | { created: false; reason: "self" | "recipient_unavailable" | "blocked" | "coalesced" | "duplicate" | "error" };

export interface NotifyEventParams {
  recipientId: string;
  /** Auteur de l'action déclenchante ; absent pour un événement système (expiration, tâche planifiée). */
  actorId?: string | null;
  /**
   * Autre participant de l'événement, pour contrôler les blocages quand il n'y a pas d'auteur
   * (événement système entre deux personnes, ex. expiration d'un duel).
   */
  counterpartId?: string | null;
  type: NotificationType;
  /** Identifiants de routage (filtrés par la liste blanche) ; jamais de contenu. */
  meta?: Record<string, unknown> | null;
  /** Identité réelle de l'événement, ex. `duel-received:<duelId>`. */
  dedupeKey: string;
  /** Une seule notification non lue de ce type pour cette ressource (clé de `meta`, valeur). */
  coalesceUnread?: { metaKey: AllowedMetaKey; value: string };
}

async function isBlockedEitherWay(a: string, b: string): Promise<boolean> {
  const block = await prisma.block.findFirst({
    where: { OR: [{ fromId: a, toId: b }, { fromId: b, toId: a }] },
    select: { id: true },
  });
  return !!block;
}

export async function notifyEvent(params: NotifyEventParams): Promise<NotifyOutcome> {
  try {
    const { recipientId, actorId, type, dedupeKey } = params;

    // 1. Jamais de notification pour sa propre action.
    if (actorId && actorId === recipientId) return { created: false, reason: "self" };

    // 2. Destinataire disponible.
    const recipient = await prisma.user.findUnique({ where: { id: recipientId }, select: { isBanned: true } });
    if (!recipient || recipient.isBanned) return { created: false, reason: "recipient_unavailable" };
    if (await isAccountDeactivated(recipientId)) return { created: false, reason: "recipient_unavailable" };

    // 3. Blocage.
    const other = actorId ?? params.counterpartId ?? null;
    if (other && other !== recipientId && (await isBlockedEitherWay(other, recipientId))) {
      return { created: false, reason: "blocked" };
    }

    const meta = sanitizeNotificationMeta(params.meta);

    // 4. Coalescence : une seule notification non lue par ressource.
    if (params.coalesceUnread) {
      const existing = await prisma.notification.findFirst({
        where: {
          userId: recipientId,
          type,
          isRead: false,
          meta: { path: [params.coalesceUnread.metaKey], equals: params.coalesceUnread.value },
        },
        select: { id: true },
      });
      if (existing) return { created: false, reason: "coalesced" };
    }

    // 5. Idempotence en base (unique (userId, dedupeKey)).
    let created;
    try {
      created = await createNotification({ userId: recipientId, type, meta, dedupeKey });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return { created: false, reason: "duplicate" };
      }
      throw err;
    }

    // 6. Push générique (le service applique préférences, catégories, état du compte et jetons).
    void sendPushToUser({ userId: recipientId, ...buildPushPayload(type, meta), idempotencyKey: dedupeKey });
    return { created: true, notificationId: created.id };
  } catch (err) {
    logger.error({ err, type: params.type }, "[notify] notification d'événement impossible");
    return { created: false, reason: "error" };
  }
}

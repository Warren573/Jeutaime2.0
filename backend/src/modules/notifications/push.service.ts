/**
 * Service push via l'API Expo Push Notifications.
 * Le backend envoie une requête HTTP à Expo qui route vers APNs/FCM.
 * Aucun SDK Firebase Admin requis.
 *
 * Toutes les erreurs push sont fire-and-forget : elles ne bloquent pas
 * le flux principal et ne propagent pas d'exception à l'appelant.
 *
 * Garanties (voir aussi expoPush.ts et pushReceipts.ts) :
 *   - aucun envoi vers un compte banni, désactivé ou supprimé ;
 *   - préférences respectées avant tout appel réseau (général, catégorie, son) ;
 *   - seuls les jetons au format Expo sont utilisés ;
 *   - un jeton n'est supprimé que sur une erreur DÉFINITIVE (DeviceNotRegistered) ;
 *   - AUCUNE suppression fondée sur le texte ou le contenu : deux événements distincts
 *     produisent toujours deux notifications, même au texte identique. Seule une clé
 *     d'idempotence liée à l'identité réelle de l'événement (`idempotencyKey`) empêche
 *     qu'un MÊME événement rejoué soit envoyé deux fois. Sans clé : aucun filtrage.
 */
import { prisma } from "../../config/prisma";
import { logger } from "../../config/logger";
import { BadRequestError } from "../../core/errors";
import { recordSystemIncident } from "../operations/operations.service";
import { isAccountDeactivated } from "../auth/accountLifecycle.service";
import { pushCategoryFor } from "../../policies/pushRouting";
import {
  EXPO_BATCH_SIZE,
  classifyExpoError,
  isExpoPushToken,
  postPushBatch,
  type ExpoPushMessage,
  type ExpoTicket,
} from "./expoPush";
import { rememberTickets } from "./pushReceipts";

/**
 * Idempotence par identité d'événement.
 *
 * Une clé (ex. `letter:<id>`) est réservée au premier traitement d'un événement pour un
 * utilisateur ; un rejeu du MÊME événement (relance technique, double émission) est ignoré,
 * y compris s'il arrive pendant que le premier envoi est encore en cours. La réservation est
 * rendue si l'événement n'a PAS pu être traité (erreur interne, échec certain d'envoi), afin
 * qu'une relance légitime puisse aboutir. Une clé n'est jamais dérivée du texte.
 *
 * Mémoire du processus, bornée, expirante : aucune migration. Elle ne protège pas entre
 * plusieurs instances (voir la description de la PR).
 */
export const PUSH_IDEMPOTENCY_TTL_MS = 30 * 60 * 1000;
const IDEMPOTENCY_MAX_ENTRIES = 10_000;
const claimedEvents = new Map<string, number>();

/** Réservé aux tests. */
export function resetPushIdempotency(): void {
  claimedEvents.clear();
}

function claimEvent(userId: string, key: string, now: number): boolean {
  const id = `${userId}|${key}`;
  const claimedAt = claimedEvents.get(id);
  if (claimedAt !== undefined && now - claimedAt < PUSH_IDEMPOTENCY_TTL_MS) return false;
  if (claimedEvents.size >= IDEMPOTENCY_MAX_ENTRIES) {
    for (const [k, t] of claimedEvents) if (now - t >= PUSH_IDEMPOTENCY_TTL_MS) claimedEvents.delete(k);
    if (claimedEvents.size >= IDEMPOTENCY_MAX_ENTRIES) {
      // Table saturée de réservations récentes : on retire les plus anciennes.
      const oldest = claimedEvents.keys().next().value;
      if (oldest !== undefined) claimedEvents.delete(oldest);
    }
  }
  claimedEvents.set(id, now);
  return true;
}

function releaseEvent(userId: string, key: string): void {
  claimedEvents.delete(`${userId}|${key}`);
}

// ============================================================
// registerDeviceToken
// Upsert par token : si le même token est ré-enregistré (ex : reconnexion),
// on met à jour userId et platform sans dupliquer.
// ============================================================
export async function registerDeviceToken(params: {
  userId: string;
  token: string;
  platform: string;
}): Promise<void> {
  if (!isExpoPushToken(params.token)) {
    throw new BadRequestError("Jeton de notification invalide.");
  }
  await prisma.pushToken.upsert({
    where: { token: params.token },
    create: {
      userId: params.userId,
      token: params.token,
      platform: params.platform,
    },
    update: {
      userId: params.userId,
      platform: params.platform,
    },
  });
}

// ============================================================
// État du destinataire
// ============================================================
type RecipientState = "ok" | "missing" | "banned" | "deactivated" | "unknown";

async function purgeTokens(userId: string, reason: string): Promise<void> {
  try {
    const res = await prisma.pushToken.deleteMany({ where: { userId } });
    if (res.count > 0) logger.info({ count: res.count, reason }, "[push] jetons retirés");
  } catch (err) {
    logger.warn({ err, reason }, "[push] retrait des jetons impossible");
  }
}

// ============================================================
// sendPushToUser
// Contrôle le compte destinataire, puis respecte UserSettings avant tout appel
// réseau vers Expo. Récupère ensuite les jetons valides et envoie.
// ============================================================
export interface SendPushParams {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  /**
   * Identité réelle de l'événement (ex. `letter:<id>`, `offering:<id>`), si elle existe.
   * Le même événement rejoué n'est envoyé qu'une fois ; sans clé, aucun filtrage.
   */
  idempotencyKey?: string;
}

/** Issue d'un traitement : ce qui a réellement eu lieu, pour décider de rendre ou non la réservation. */
interface SendOutcomeSummary {
  /** Vrai si l'événement a été traité (envoyé, ou écarté volontairement : préférences, compte, pas de jeton). */
  handled: boolean;
}

export async function sendPushToUser(params: SendPushParams): Promise<void> {
  const key = params.idempotencyKey;
  if (key && !claimEvent(params.userId, key, Date.now())) {
    logger.debug({ userId: params.userId }, "[push] même événement déjà traité, envoi ignoré");
    return;
  }
  let handled = false;
  try {
    handled = (await sendPushToUserUnsafe(params)).handled;
  } catch (err) {
    // Une notification ne doit jamais faire échouer l'action qui l'a déclenchée.
    logger.error({ err, userId: params.userId }, "[push] erreur inattendue à l'envoi");
  } finally {
    // Événement non traité (erreur interne, échec certain d'envoi) : la réservation est rendue,
    // une relance légitime pourra aboutir.
    if (key && !handled) releaseEvent(params.userId, key);
  }
}

async function sendPushToUserUnsafe(params: SendPushParams): Promise<SendOutcomeSummary> {
  const now = Date.now();

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: {
      isBanned: true,
      settings: {
        select: {
          notifPush: true,
          soundEnabled: true,
          notifMeetings: true,
          notifLetters: true,
          notifSalons: true,
          notifActivities: true,
          notifNews: true,
        },
      },
    },
  });

  let state: RecipientState = "ok";
  if (!user) state = "missing";
  else if (user.isBanned) state = "banned";
  else {
    try {
      if (await isAccountDeactivated(params.userId)) state = "deactivated";
    } catch (err) {
      // Statut indéterminable : par prudence, aucun envoi.
      logger.warn({ err, userId: params.userId }, "[push] statut de désactivation illisible");
      state = "unknown";
    }
  }
  if (state !== "ok") {
    // Banni : la révocation est justifiée, les jetons sont retirés (le compte les ré-enregistrera
    // s'il est un jour rétabli). Désactivé : ses jetons sont déjà retirés à la désactivation.
    if (state === "banned") await purgeTokens(params.userId, "compte banni");
    // Statut indéterminable : rien n'a été décidé, la réservation est rendue pour une relance.
    return { handled: state !== "unknown" };
  }
  const settings = user!.settings;

  // Le réglage est créé à l'inscription et vaut true par défaut. Si une
  // ancienne donnée n'a pas encore de ligne UserSettings, on conserve le
  // comportement historique (push autorisé) plutôt que de couper en silence.
  if (settings?.notifPush === false) return { handled: true };
  const category = pushCategoryFor(params.data?.type);
  if (category && settings?.[category] === false) return { handled: true };

  const rows = await prisma.pushToken.findMany({
    where: { userId: params.userId },
    select: { id: true, token: true },
  });
  // Les jetons au format inattendu ne sont jamais envoyés à Expo (un lot entier peut être refusé).
  const usable = rows.filter((r) => isExpoPushToken(r.token));
  if (usable.length < rows.length) {
    logger.warn({ ignored: rows.length - usable.length, userId: params.userId }, "[push] jetons au format inattendu ignorés");
  }
  if (usable.length === 0) return { handled: true };

  const messages: ExpoPushMessage[] = usable.map(({ token }) => ({
    to: token,
    title: params.title,
    body: params.body,
    data: params.data ?? {},
    sound: settings?.soundEnabled === false ? null : "default",
    priority: "high",
    channelId: "default",
  }));

  // Expo accepte au maximum 100 messages par requête.
  // Un échec d'un lot ne doit pas empêcher l'envoi aux autres appareils.
  let accepted = 0;
  let ambiguous = false;
  for (let offset = 0; offset < messages.length; offset += EXPO_BATCH_SIZE) {
    const batchMessages = messages.slice(offset, offset + EXPO_BATCH_SIZE);
    const batchRows = usable.slice(offset, offset + EXPO_BATCH_SIZE);
    const outcome = await postPushBatch(batchMessages);

    if (outcome.kind === "failed") {
      // Échec CERTAIN (HTTP refusé, connexion jamais établie) ou INCERTAIN (coupure, délai dépassé,
      // réponse illisible : Expo a peut-être traité le lot).
      if (!outcome.retryable && (outcome.status === undefined || outcome.status < 300)) ambiguous = true;
      logger.warn({ status: outcome.status, reason: outcome.reason, userId: params.userId }, "[push] envoi Expo en échec");
      void recordSystemIncident({
        level: outcome.retryable ? "WARNING" : "ERROR",
        source: "push",
        code: outcome.status !== undefined ? "EXPO_NON_OK" : "PUSH_SEND_FAILED",
        message: outcome.reason,
        userId: params.userId,
        ...(outcome.status !== undefined ? { statusCode: outcome.status } : {}),
      });
      continue; // jamais de suppression de jeton sur un échec technique
    }

    const invalidTokens: string[] = [];
    const tracked: Array<{ ticketId: string; token: string; userId: string; sentAt: number }> = [];
    outcome.tickets.forEach((ticket, i) => {
      const row = batchRows[i];
      if (!row) return;
      handleTicket(ticket, row.token, params.userId, now, invalidTokens, tracked);
    });
    accepted += outcome.tickets.length;

    if (invalidTokens.length > 0) {
      // Ne supprime jamais un jeton réattribué entre l'envoi et la réponse d'Expo.
      await prisma.pushToken.deleteMany({
        where: { userId: params.userId, token: { in: invalidTokens } },
      });
      logger.info({ count: invalidTokens.length }, "[push] Tokens invalides purgés");
    }
    if (tracked.length > 0) rememberTickets(tracked);
  }
  // Traité si Expo a répondu pour au moins un lot, ou si un échec incertain interdit de rejouer.
  return { handled: accepted > 0 || ambiguous };
}

/** Classe un ticket : accepté (suivi du reçu), jeton définitivement invalide, ou erreur journalisée. */
function handleTicket(
  ticket: ExpoTicket,
  token: string,
  userId: string,
  sentAt: number,
  invalidTokens: string[],
  accepted: Array<{ ticketId: string; token: string; userId: string; sentAt: number }>,
): void {
  if (ticket.status === "ok") {
    if (ticket.id) accepted.push({ ticketId: ticket.id, token, userId, sentAt });
    return;
  }
  const code = ticket.details?.error;
  const kind = classifyExpoError(code);
  if (kind === "invalid_token") {
    invalidTokens.push(token);
    return;
  }
  // Temporaire, configuration ou inconnu : le jeton est conservé.
  logger.warn({ code, kind, userId }, "[push] ticket Expo en erreur (jeton conservé)");
  if (kind === "configuration") {
    void recordSystemIncident({
      level: "ERROR",
      source: "push",
      code: `EXPO_TICKET_${String(code).toUpperCase()}`,
      message: `Ticket Expo en erreur : ${code}`,
      userId,
    });
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

/**
 * Une seule exécution à la fois par édition dans ce processus : si une exécution est encore en cours
 * (envoi lent) quand le planificateur relance le job, la seconde ne fait rien. Sans cela, deux
 * exécutions lisent les mêmes jetons « pas encore servis » et envoient deux fois.
 */
const dailyEditionInFlight = new Set<string>();

export async function sendDailyEditionPush(params: {
  editionKey: string;
  title: string;
  body: string;
}): Promise<{ scanned: number; sent: number }> {
  if (dailyEditionInFlight.has(params.editionKey)) {
    logger.info({ editionKey: params.editionKey }, "[push] édition du jour déjà en cours d'envoi, exécution ignorée");
    return { scanned: 0, sent: 0 };
  }
  dailyEditionInFlight.add(params.editionKey);
  try {
    return await sendDailyEditionPushUnsafe(params);
  } finally {
    dailyEditionInFlight.delete(params.editionKey);
  }
}

async function sendDailyEditionPushUnsafe(params: {
  editionKey: string;
  title: string;
  body: string;
}): Promise<{ scanned: number; sent: number }> {
  const rows = await prisma.pushToken.findMany({
    where: {
      AND: [
        {
          OR: [
            { lastDailyEditionKey: null },
            { lastDailyEditionKey: { not: params.editionKey } },
          ],
        },
        // Jamais d'envoi à un compte banni (les comptes désactivés n'ont plus de jeton).
        { user: { isBanned: false } },
      ],
    },
    select: {
      id: true,
      token: true,
      userId: true,
      user: {
        select: {
          settings: { select: { notifPush: true, soundEnabled: true, notifNews: true } },
        },
      },
    },
  });

  const eligible = rows.filter(
    (row) =>
      row.user.settings?.notifPush !== false &&
      row.user.settings?.notifNews !== false &&
      isExpoPushToken(row.token),
  );
  let sent = 0;

  for (const batch of chunk(eligible, EXPO_BATCH_SIZE)) {
    const messages: ExpoPushMessage[] = batch.map((row) => ({
      to: row.token,
      title: params.title,
      body: params.body,
      data: { route: "/journal", editionKey: params.editionKey },
      sound: row.user.settings?.soundEnabled === false ? null : "default",
      priority: "high",
      channelId: "default",
    }));

    const outcome = await postPushBatch(messages);
    if (outcome.kind === "failed") {
      // Les jetons du lot gardent leur clé : la prochaine exécution du job réessaie.
      void recordSystemIncident({
        level: outcome.retryable ? "WARNING" : "ERROR",
        source: "push",
        code: outcome.status !== undefined ? "DAILY_PUSH_NON_OK" : "DAILY_PUSH_FAILED",
        message: `Édition quotidienne : ${outcome.reason}`,
        ...(outcome.status !== undefined ? { statusCode: outcome.status } : {}),
      });
      continue;
    }

    const deliveredIds: string[] = [];
    const invalidIds: string[] = [];
    const accepted: Array<{ ticketId: string; token: string; userId: string; sentAt: number }> = [];
    const sentAt = Date.now();

    outcome.tickets.forEach((ticket, index) => {
      const row = batch[index];
      if (!row) return;
      if (ticket.status === "ok") {
        deliveredIds.push(row.id);
        sent += 1;
        if (ticket.id) accepted.push({ ticketId: ticket.id, token: row.token, userId: row.userId, sentAt });
      } else if (classifyExpoError(ticket.details?.error) === "invalid_token") {
        invalidIds.push(row.id);
      } else {
        logger.warn({ code: ticket.details?.error }, "[push] ticket édition quotidienne en erreur (jeton conservé)");
      }
    });

    if (deliveredIds.length > 0) {
      await prisma.pushToken.updateMany({
        where: { id: { in: deliveredIds } },
        data: { lastDailyEditionKey: params.editionKey },
      });
    }
    if (invalidIds.length > 0) {
      await prisma.pushToken.deleteMany({ where: { id: { in: invalidIds } } });
    }
    if (accepted.length > 0) rememberTickets(accepted);
  }

  return { scanned: rows.length, sent };
}

// Retire uniquement le token de l'utilisateur authentifié.
// Une déconnexion d'un appareil ne doit pas couper les autres appareils.
export async function unregisterDeviceToken(params: {
  userId: string;
  token: string;
}): Promise<void> {
  await prisma.pushToken.deleteMany({
    where: { userId: params.userId, token: params.token },
  });
}

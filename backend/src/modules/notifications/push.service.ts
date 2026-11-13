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
 *   - un envoi identique au même utilisateur dans une courte fenêtre n'est fait qu'une fois.
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

/** Fenêtre pendant laquelle un envoi strictement identique au même utilisateur n'est pas répété. */
export const PUSH_DEDUPE_WINDOW_MS = 10_000;
const DEDUPE_MAX_ENTRIES = 5000;
const recentSends = new Map<string, number>();

/** Réservé aux tests. */
export function resetPushDedupe(): void {
  recentSends.clear();
}

function stableData(data: Record<string, string> | undefined): string {
  if (!data) return "";
  return JSON.stringify(Object.keys(data).sort().map((k) => [k, data[k]]));
}

/** Vrai si cet envoi est un doublon récent ; sinon l'enregistre. */
function isRecentDuplicate(key: string, now: number): boolean {
  const seen = recentSends.get(key);
  if (seen !== undefined && now - seen < PUSH_DEDUPE_WINDOW_MS) return true;
  if (recentSends.size >= DEDUPE_MAX_ENTRIES) {
    for (const [k, t] of recentSends) if (now - t >= PUSH_DEDUPE_WINDOW_MS) recentSends.delete(k);
    if (recentSends.size >= DEDUPE_MAX_ENTRIES) recentSends.clear();
  }
  recentSends.set(key, now);
  return false;
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
export async function sendPushToUser(params: {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<void> {
  try {
    await sendPushToUserUnsafe(params);
  } catch (err) {
    // Une notification ne doit jamais faire échouer l'action qui l'a déclenchée.
    logger.error({ err, userId: params.userId }, "[push] erreur inattendue à l'envoi");
  }
}

async function sendPushToUserUnsafe(params: {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<void> {
  const now = Date.now();
  const dedupeKey = `${params.userId}|${params.title}|${params.body}|${stableData(params.data)}`;
  if (isRecentDuplicate(dedupeKey, now)) {
    logger.debug({ userId: params.userId }, "[push] doublon récent ignoré");
    return;
  }

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
    return;
  }
  const settings = user!.settings;

  // Le réglage est créé à l'inscription et vaut true par défaut. Si une
  // ancienne donnée n'a pas encore de ligne UserSettings, on conserve le
  // comportement historique (push autorisé) plutôt que de couper en silence.
  if (settings?.notifPush === false) return;
  const category = pushCategoryFor(params.data?.type);
  if (category && settings?.[category] === false) return;

  const rows = await prisma.pushToken.findMany({
    where: { userId: params.userId },
    select: { id: true, token: true },
  });
  // Les jetons au format inattendu ne sont jamais envoyés à Expo (un lot entier peut être refusé).
  const usable = rows.filter((r) => isExpoPushToken(r.token));
  if (usable.length < rows.length) {
    logger.warn({ ignored: rows.length - usable.length, userId: params.userId }, "[push] jetons au format inattendu ignorés");
  }
  if (usable.length === 0) return;

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
  for (let offset = 0; offset < messages.length; offset += EXPO_BATCH_SIZE) {
    const batchMessages = messages.slice(offset, offset + EXPO_BATCH_SIZE);
    const batchRows = usable.slice(offset, offset + EXPO_BATCH_SIZE);
    const outcome = await postPushBatch(batchMessages);

    if (outcome.kind === "failed") {
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
    const accepted: Array<{ ticketId: string; token: string; userId: string; sentAt: number }> = [];
    outcome.tickets.forEach((ticket, i) => {
      const row = batchRows[i];
      if (!row) return;
      handleTicket(ticket, row.token, params.userId, now, invalidTokens, accepted);
    });

    if (invalidTokens.length > 0) {
      // Ne supprime jamais un jeton réattribué entre l'envoi et la réponse d'Expo.
      await prisma.pushToken.deleteMany({
        where: { userId: params.userId, token: { in: invalidTokens } },
      });
      logger.info({ count: invalidTokens.length }, "[push] Tokens invalides purgés");
    }
    if (accepted.length > 0) rememberTickets(accepted);
  }
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

export async function sendDailyEditionPush(params: {
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

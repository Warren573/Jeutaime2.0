/**
 * Service push in-app via l'API Expo Push Notifications.
 * Le backend envoie une requête HTTP à Expo qui route vers FCM/APNS.
 * Aucun SDK Firebase Admin requis.
 *
 * Toutes les erreurs push sont fire-and-forget : elles ne bloquent pas
 * le flux principal et ne propagent pas d'exception à l'appelant.
 */
import { prisma } from "../../config/prisma";
import { logger } from "../../config/logger";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: "default" | null;
  priority?: "default" | "normal" | "high";
  channelId?: string;
}

interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
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
// sendPushToUser
// Récupère tous les tokens du user et envoie la notification.
// Les tickets d'erreur Expo (ex : DeviceNotRegistered) purgent le token.
// ============================================================
export async function sendPushToUser(params: {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<void> {
  const rows = await prisma.pushToken.findMany({
    where: { userId: params.userId },
    select: { id: true, token: true },
  });

  if (rows.length === 0) return;

  const messages: ExpoPushMessage[] = rows.map(({ token }) => ({
    to: token,
    title: params.title,
    body: params.body,
    data: params.data ?? {},
    sound: "default",
    priority: "high",
    channelId: "default",
  }));

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(messages.length === 1 ? messages[0] : messages),
    });

    if (!res.ok) {
      logger.warn(
        { status: res.status, userId: params.userId },
        "[push] Expo push API non-ok",
      );
      return;
    }

    const json = (await res.json()) as { data: ExpoPushTicket | ExpoPushTicket[] };
    const tickets = Array.isArray(json.data) ? json.data : [json.data];

    // Purger les tokens invalides (DeviceNotRegistered)
    const invalidTokenIds: string[] = [];
    tickets.forEach((ticket, i) => {
      if (
        ticket.status === "error" &&
        ticket.details?.error === "DeviceNotRegistered"
      ) {
        const row = rows[i];
        if (row) invalidTokenIds.push(row.id);
      }
    });

    if (invalidTokenIds.length > 0) {
      await prisma.pushToken.deleteMany({
        where: { id: { in: invalidTokenIds } },
      });
      logger.info(
        { count: invalidTokenIds.length },
        "[push] Tokens invalides purgés",
      );
    }
  } catch (err) {
    logger.error({ err, userId: params.userId }, "[push] Erreur envoi Expo push");
  }
}

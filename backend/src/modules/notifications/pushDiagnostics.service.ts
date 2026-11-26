import { prisma } from "../../config/prisma";
import { logger } from "../../config/logger";
import { TooManyRequestsError } from "../../core/errors";
import { fetchReceipts, isExpoPushToken, postPushBatch, type ExpoPushMessage } from "./expoPush";

/**
 * Diagnostic des notifications push, à la demande de l'utilisateur (écran « Diagnostic des notifications »).
 *
 * Ne remplace RIEN du fonctionnement des push : lecture de l'état (appareils, réglages) et envoi d'UNE notification de test
 * visible, sur demande. Aucune écriture en base, aucun sondage : les requêtes n'ont lieu que sur action de l'utilisateur.
 * Confidentialité : un jeton n'est jamais renvoyé en entier (type + 6 derniers caractères seulement).
 */

export const TEST_PUSH_TITLE = "JeuTaime";
export const TEST_PUSH_BODY = "Test de notification : si tu lis ceci hors de l'application, les notifications fonctionnent.";
export const MAX_TEST_DELAY_S = 30;
export const TEST_COOLDOWN_MS = 20_000;

export interface PushDeviceView {
  platform: string;
  kind: "ExponentPushToken" | "ExpoPushToken" | "inconnu";
  /** 6 derniers caractères du jeton : suffisent pour reconnaître l'appareil, insuffisants pour l'utiliser. */
  suffix: string;
  valid: boolean;
  updatedAt: string;
}

export interface PushStatusView {
  settings: { notifPush: boolean; notifActivities: boolean; notifMeetings: boolean; notifLetters: boolean };
  devices: PushDeviceView[];
}

export interface PushTestResult {
  sentAt: string;
  devices: number;
  skipped: string | null;
  /** Un élément par appareil : accepté par Expo (« ok ») ou refusé (« error:<code> »). */
  tickets: Array<{ status: string; ticketId: string | null }>;
}

export function describeToken(token: string): Pick<PushDeviceView, "kind" | "suffix" | "valid"> {
  const kind = token.startsWith("ExponentPushToken[") ? "ExponentPushToken" : token.startsWith("ExpoPushToken[") ? "ExpoPushToken" : "inconnu";
  return { kind, suffix: token.replace(/\]$/, "").slice(-6), valid: isExpoPushToken(token) };
}

export async function getPushStatus(userId: string): Promise<PushStatusView> {
  const [settings, tokens] = await Promise.all([
    prisma.userSettings.findUnique({
      where: { userId },
      select: { notifPush: true, notifActivities: true, notifMeetings: true, notifLetters: true },
    }),
    prisma.pushToken.findMany({ where: { userId }, select: { token: true, platform: true, updatedAt: true }, orderBy: { updatedAt: "desc" } }),
  ]);
  return {
    // Pas de ligne de réglages : comportement historique (push autorisé), comme dans sendPushToUser.
    settings: {
      notifPush: settings?.notifPush ?? true,
      notifActivities: settings?.notifActivities ?? true,
      notifMeetings: settings?.notifMeetings ?? true,
      notifLetters: settings?.notifLetters ?? true,
    },
    devices: tokens.map((t) => ({ platform: t.platform, ...describeToken(t.token), updatedAt: t.updatedAt.toISOString() })),
  };
}

// ── Test d'envoi ────────────────────────────────────────────────────────────
const lastResult = new Map<string, { result: PushTestResult; ticketIds: string[] }>();
const lastRequest = new Map<string, number>();
const MAX_TRACKED_USERS = 500;

function bound<T>(map: Map<string, T>): void {
  while (map.size > MAX_TRACKED_USERS) {
    const oldest = map.keys().next().value;
    if (oldest === undefined) break;
    map.delete(oldest);
  }
}

export function resetPushTests(): void {
  lastResult.clear();
  lastRequest.clear();
}

/** Envoie la notification de test maintenant. N'écrit rien en base. Ne lève jamais. */
export async function runPushTest(userId: string): Promise<PushTestResult> {
  const sentAt = new Date().toISOString();
  const finish = (result: PushTestResult, ticketIds: string[] = []) => {
    lastResult.set(userId, { result, ticketIds });
    bound(lastResult);
    logger.info({ userId, devices: result.devices, skipped: result.skipped, tickets: result.tickets.map((t) => t.status) }, "[push] test demandé par l'utilisateur");
    return result;
  };
  try {
    const status = await getPushStatus(userId);
    if (!status.settings.notifPush) return finish({ sentAt, devices: 0, skipped: "notifications push désactivées dans les réglages de JeuTaime", tickets: [] });
    const rows = await prisma.pushToken.findMany({ where: { userId }, select: { token: true } });
    const usable = rows.map((r) => r.token).filter((t) => isExpoPushToken(t));
    if (usable.length === 0) return finish({ sentAt, devices: 0, skipped: "aucun appareil enregistré pour ce compte", tickets: [] });

    const messages: ExpoPushMessage[] = usable.map((to) => ({
      to, title: TEST_PUSH_TITLE, body: TEST_PUSH_BODY, data: { type: "PUSH_TEST" }, sound: "default", priority: "high", channelId: "default",
    }));
    const outcome = await postPushBatch(messages);
    if (outcome.kind === "failed") return finish({ sentAt, devices: usable.length, skipped: `envoi à Expo impossible (${outcome.reason})`, tickets: [] });
    const tickets = outcome.tickets.map((t) => ({ status: t.status === "ok" ? "ok" : `error:${t.details?.error ?? "?"}`, ticketId: t.id ?? null }));
    return finish({ sentAt, devices: usable.length, skipped: null, tickets }, tickets.flatMap((t) => (t.ticketId ? [t.ticketId] : [])));
  } catch (err) {
    logger.error({ err, userId }, "[push] test en échec");
    return finish({ sentAt, devices: 0, skipped: "erreur interne pendant le test", tickets: [] });
  }
}

/**
 * Programme le test dans `delaySeconds` (laisse le temps de fermer l'application / verrouiller l'iPhone).
 * Refus (429) si un test a été demandé il y a moins de 20 s : un test ne doit jamais devenir un envoi en rafale.
 */
export function scheduleTestPush(userId: string, delaySeconds: number, now: number = Date.now()): { scheduledFor: string } {
  const previous = lastRequest.get(userId) ?? 0;
  if (now - previous < TEST_COOLDOWN_MS) throw new TooManyRequestsError("Un test vient d'être demandé : patiente quelques secondes.");
  lastRequest.set(userId, now);
  bound(lastRequest);
  const delay = Math.max(0, Math.min(MAX_TEST_DELAY_S, Math.floor(delaySeconds)));
  lastResult.delete(userId);
  setTimeout(() => void runPushTest(userId), delay * 1000);
  return { scheduledFor: new Date(now + delay * 1000).toISOString() };
}

export interface PushTestView {
  state: "none" | "pending" | "sent";
  result: PushTestResult | null;
  /** Reçu de remise Expo → Apple (disponible ~15 min après l'envoi) : « ok », « error:<code> » ou « pas encore disponible ». */
  receipts: string[];
}

/** Dernier test de l'utilisateur ; les reçus sont lus chez Expo À LA DEMANDE (jamais en continu). */
export async function getPushTest(userId: string): Promise<PushTestView> {
  const entry = lastResult.get(userId);
  if (!entry) return { state: lastRequest.has(userId) ? "pending" : "none", result: null, receipts: [] };
  if (entry.ticketIds.length === 0) return { state: "sent", result: entry.result, receipts: [] };
  const outcome = await fetchReceipts(entry.ticketIds);
  const receipts =
    outcome.kind === "failed"
      ? entry.ticketIds.map(() => "lecture impossible")
      : entry.ticketIds.map((id) => {
          const r = outcome.receipts[id];
          return !r ? "pas encore disponible" : r.status === "ok" ? "ok" : `error:${r.details?.error ?? "?"}`;
        });
  return { state: "sent", result: entry.result, receipts };
}

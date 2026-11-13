/**
 * Suivi des reçus Expo.
 *
 * Un ticket « ok » signifie seulement qu'Expo a accepté le message. L'échec de
 * remise à Apple/Google (jeton désinstallé, par exemple) n'apparaît que dans le
 * REÇU, disponible environ 15 minutes plus tard.
 *
 * Stockage : en mémoire, borné. Aucune migration : après un redémarrage, les
 * reçus en attente sont perdus, ce qui retarde seulement le nettoyage d'un jeton
 * mort (il sera retrouvé à l'envoi suivant). Si cela devenait gênant, une table
 * dédiée serait la suite logique (non faite ici, faute de nécessité démontrée).
 *
 * Règles de suppression d'un jeton :
 *   - uniquement sur `DeviceNotRegistered` (définitif) ;
 *   - jamais sur une erreur temporaire, de configuration, inconnue, ni sur un échec
 *     de lecture des reçus ;
 *   - jamais si le jeton a été ré-enregistré après l'envoi (`updatedAt`).
 */
import { prisma } from "../../config/prisma";
import { logger } from "../../config/logger";
import { recordSystemIncident } from "../operations/operations.service";
import { classifyExpoError, fetchReceipts, EXPO_RECEIPTS_BATCH_SIZE } from "./expoPush";

export const RECEIPT_MIN_AGE_MS = 15 * 60 * 1000;
export const RECEIPT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_PENDING = 5000;
const MAX_FETCH_FAILURES = 5;

export interface PendingTicket {
  ticketId: string;
  token: string;
  userId: string;
  sentAt: number;
  failures: number;
}

const pending = new Map<string, PendingTicket>();
let timer: ReturnType<typeof setTimeout> | null = null;

export function pendingReceiptCount(): number {
  return pending.size;
}

/** Réservé aux tests. */
export function resetPendingReceipts(): void {
  pending.clear();
  if (timer) clearTimeout(timer);
  timer = null;
}

/** Mémorise des tickets acceptés pour vérifier leur reçu plus tard. Un identifiant n'est suivi qu'une fois. */
export function rememberTickets(items: Array<Omit<PendingTicket, "failures">>): void {
  for (const item of items) {
    if (!item.ticketId || pending.has(item.ticketId)) continue;
    if (pending.size >= MAX_PENDING) {
      const oldest = pending.keys().next().value;
      if (oldest !== undefined) pending.delete(oldest);
    }
    pending.set(item.ticketId, { ...item, failures: 0 });
  }
  if (pending.size > 0) scheduleReceiptCheck();
}

function scheduleReceiptCheck(): void {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    void processPendingReceipts()
      .catch((err) => logger.error({ err }, "[push] traitement des reçus en échec"))
      .finally(() => {
        if (pending.size > 0) scheduleReceiptCheck();
      });
  }, RECEIPT_MIN_AGE_MS + 5_000);
  // Ne retient jamais l'arrêt du processus.
  timer.unref?.();
}

export interface ReceiptRunResult {
  checked: number;
  tokensRemoved: number;
  dropped: number;
}

export async function processPendingReceipts(now: number = Date.now()): Promise<ReceiptRunResult> {
  const result: ReceiptRunResult = { checked: 0, tokensRemoved: 0, dropped: 0 };

  // Abandon des tickets trop anciens (le reçu n'est conservé que 24 h par Expo).
  for (const [id, t] of pending) {
    if (now - t.sentAt > RECEIPT_MAX_AGE_MS) {
      pending.delete(id);
      result.dropped += 1;
    }
  }

  const due = [...pending.values()].filter((t) => now - t.sentAt >= RECEIPT_MIN_AGE_MS);
  for (let i = 0; i < due.length; i += EXPO_RECEIPTS_BATCH_SIZE) {
    const batch = due.slice(i, i + EXPO_RECEIPTS_BATCH_SIZE);
    const outcome = await fetchReceipts(batch.map((t) => t.ticketId));

    if (outcome.kind === "failed") {
      // Échec technique : aucune suppression, nouvel essai plus tard, abandon après plusieurs échecs.
      for (const t of batch) {
        t.failures += 1;
        if (t.failures >= MAX_FETCH_FAILURES) {
          pending.delete(t.ticketId);
          result.dropped += 1;
        }
      }
      void recordSystemIncident({
        level: "WARNING",
        source: "push",
        code: "EXPO_RECEIPTS_UNAVAILABLE",
        message: `Lecture des reçus Expo impossible : ${outcome.reason}`,
        ...(outcome.status !== undefined ? { statusCode: outcome.status } : {}),
      });
      continue;
    }

    for (const t of batch) {
      const receipt = outcome.receipts[t.ticketId];
      if (!receipt) continue; // pas encore disponible : on réessaiera
      result.checked += 1;
      pending.delete(t.ticketId);
      if (receipt.status === "ok") continue;

      const code = receipt.details?.error;
      const kind = classifyExpoError(code);
      if (kind === "invalid_token") {
        const removed = await prisma.pushToken.deleteMany({
          // Le jeton ré-enregistré après l'envoi (updatedAt plus récent) est conservé.
          where: { userId: t.userId, token: t.token, updatedAt: { lte: new Date(t.sentAt) } },
        });
        result.tokensRemoved += removed.count;
      } else {
        // Temporaire, configuration ou inconnu : trace seulement, jamais de suppression.
        logger.warn({ code, kind, userId: t.userId }, "[push] reçu Expo en erreur (jeton conservé)");
        if (kind === "configuration") {
          void recordSystemIncident({
            level: "ERROR",
            source: "push",
            code: `EXPO_RECEIPT_${String(code).toUpperCase()}`,
            message: `Reçu Expo en erreur : ${code}`,
            userId: t.userId,
          });
        }
      }
    }
  }
  return result;
}

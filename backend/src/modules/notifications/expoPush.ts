/**
 * Client minimal de l'API Expo Push : envoi par lots, lecture des reçus,
 * classification des erreurs. Aucune écriture en base ici.
 *
 * Règles de fiabilité :
 *   - Expo n'offre AUCUNE clé d'idempotence. Un envoi est donc rejoué uniquement
 *     quand il n'a certainement pas été traité : HTTP 429/5xx, ou connexion jamais
 *     établie (DNS, connexion refusée). Un délai dépassé ou une coupure en cours de
 *     réponse n'est PAS rejoué (risque de doublon) ; l'appelant journalise.
 *   - Jamais plus de MAX_ATTEMPTS essais, avec attente exponentielle.
 */
import { logger } from "../../config/logger";

export const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
export const EXPO_RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts";
export const EXPO_BATCH_SIZE = 100;
export const EXPO_RECEIPTS_BATCH_SIZE = 300;

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 500;
const REQUEST_TIMEOUT_MS = 10_000;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
/** Codes réseau garantissant qu'aucune requête n'est partie (donc rejeu sans risque de doublon). */
const NEVER_SENT_CODES = new Set(["ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN"]);

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: "default" | null;
  priority?: "default" | "normal" | "high";
  channelId?: string;
}

export interface ExpoTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

export interface ExpoReceipt {
  status: "ok" | "error";
  message?: string;
  details?: { error?: string };
}

export type SendOutcome =
  | { kind: "ok"; tickets: ExpoTicket[] }
  | { kind: "failed"; retryable: boolean; status?: number; reason: string };

export type ReceiptsOutcome =
  | { kind: "ok"; receipts: Record<string, ExpoReceipt> }
  | { kind: "failed"; status?: number; reason: string };

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Jeton Expo pris en charge : `ExponentPushToken[…]` (historique) ou `ExpoPushToken[…]`.
 * Le contenu entre crochets est alphanumérique, `-` ou `_`.
 */
const EXPO_TOKEN_RE = /^(?:ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]{8,200}\]$/;
export function isExpoPushToken(token: unknown): token is string {
  return typeof token === "string" && token.length <= 512 && EXPO_TOKEN_RE.test(token);
}

function networkCode(err: unknown): string | undefined {
  const e = err as { code?: unknown; cause?: { code?: unknown } } | null;
  const code = e?.cause?.code ?? e?.code;
  return typeof code === "string" ? code : undefined;
}

async function postJson(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

/** Envoie un lot (≤ 100 messages) et renvoie les tickets, ou l'échec classé. Ne lève jamais. */
export async function postPushBatch(messages: ExpoPushMessage[], options: RetryOptions = {}): Promise<SendOutcome> {
  const maxAttempts = options.maxAttempts ?? MAX_ATTEMPTS;
  const baseDelay = options.baseDelayMs ?? BASE_DELAY_MS;
  const sleep = options.sleep ?? defaultSleep;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let res: Response;
    try {
      res = await postJson(EXPO_PUSH_URL, messages);
    } catch (err) {
      const code = networkCode(err);
      const neverSent = code !== undefined && NEVER_SENT_CODES.has(code);
      if (neverSent && attempt < maxAttempts) {
        await sleep(baseDelay * 2 ** (attempt - 1));
        continue;
      }
      return {
        kind: "failed",
        // Un délai dépassé ou une coupure pourrait avoir été traité : pas de rejeu automatique.
        retryable: neverSent,
        reason: err instanceof Error ? err.message : "erreur réseau",
      };
    }

    if (res.ok) {
      try {
        const json = (await res.json()) as { data?: ExpoTicket | ExpoTicket[] };
        const tickets = Array.isArray(json.data) ? json.data : json.data ? [json.data] : [];
        return { kind: "ok", tickets };
      } catch {
        // Réponse 2xx illisible : le lot a pu être traité, on ne rejoue pas.
        return { kind: "failed", retryable: false, status: res.status, reason: "réponse Expo illisible" };
      }
    }

    if (RETRYABLE_STATUS.has(res.status) && attempt < maxAttempts) {
      await sleep(baseDelay * 2 ** (attempt - 1));
      continue;
    }
    return {
      kind: "failed",
      retryable: RETRYABLE_STATUS.has(res.status),
      status: res.status,
      reason: `Expo a répondu ${res.status}`,
    };
  }
  return { kind: "failed", retryable: true, reason: "tentatives épuisées" };
}

/** Lit les reçus d'une liste d'identifiants de tickets. Ne lève jamais. */
export async function fetchReceipts(ids: string[]): Promise<ReceiptsOutcome> {
  try {
    const res = await postJson(EXPO_RECEIPTS_URL, { ids });
    if (!res.ok) return { kind: "failed", status: res.status, reason: `Expo a répondu ${res.status}` };
    const json = (await res.json()) as { data?: Record<string, ExpoReceipt> };
    return { kind: "ok", receipts: json.data ?? {} };
  } catch (err) {
    logger.warn({ err }, "[push] lecture des reçus Expo impossible");
    return { kind: "failed", reason: err instanceof Error ? err.message : "erreur réseau" };
  }
}

// ============================================================
// Classification des erreurs Expo (ticket ou reçu)
// ============================================================
export type ExpoErrorClass =
  /** Jeton définitivement invalide : à supprimer. */
  | "invalid_token"
  /** Limite de débit : temporaire, jamais de suppression. */
  | "transient"
  /** Problème de configuration ou de message : à journaliser, jamais de suppression. */
  | "configuration"
  | "unknown";

export function classifyExpoError(code: string | undefined): ExpoErrorClass {
  switch (code) {
    case "DeviceNotRegistered":
      return "invalid_token";
    case "MessageRateExceeded":
      return "transient";
    case "InvalidCredentials":
    case "MismatchSenderId":
    case "MessageTooBig":
      return "configuration";
    default:
      return "unknown";
  }
}

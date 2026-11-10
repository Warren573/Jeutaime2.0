import { createPublicKey, createVerify, type KeyObject } from "crypto";
import { AD_REWARD_MAX_AGE_MS } from "../../policies/adRewards";

/**
 * Vérification serveur (SSV) des publicités récompensées Google AdMob.
 *
 * Google appelle notre URL en GET après un visionnage complet. La requête est
 * signée (ECDSA P-256 / SHA-256). Le message signé est la chaîne de requête
 * brute, telle que reçue, jusqu'au paramètre `signature` exclu ; `signature`
 * et `key_id` sont toujours les deux derniers paramètres.
 *
 * Rien de ce que l'application mobile envoie n'est utilisé pour créditer des
 * pièces : seule cette requête signée par Google fait foi.
 */

export interface SsvKey {
  keyId: string;
  pem: string;
}

export type SsvKeyFetcher = () => Promise<SsvKey[]>;

export interface VerifiedAdReward {
  provider: "admob";
  transactionId: string;
  userId: string;
  adUnit: string;
  timestamp: Date;
}

export type SsvRejection =
  | "malformed_query"
  | "missing_parameter"
  | "unknown_key"
  | "bad_signature"
  | "stale_timestamp"
  | "ad_unit_not_allowed";

export type SsvResult =
  | { ok: true; reward: VerifiedAdReward }
  | { ok: false; reason: SsvRejection };

const SIGNATURE_MARKER = "&signature=";
const KEY_ID_MARKER = "&key_id=";

function base64UrlToBuffer(value: string): Buffer {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export async function verifyAdmobSsv(params: {
  /** Chaîne de requête brute, sans le « ? » initial. */
  rawQuery: string;
  fetchKeys: SsvKeyFetcher;
  /** Emplacements acceptés. Liste vide : tout emplacement est refusé. */
  allowedAdUnits: readonly string[];
  now?: Date;
}): Promise<SsvResult> {
  const { rawQuery, fetchKeys, allowedAdUnits } = params;
  const now = params.now ?? new Date();

  const sigIndex = rawQuery.indexOf(SIGNATURE_MARKER);
  if (sigIndex <= 0) return { ok: false, reason: "malformed_query" };

  const message = rawQuery.slice(0, sigIndex);
  const tail = rawQuery.slice(sigIndex + SIGNATURE_MARKER.length);
  const keyIndex = tail.indexOf(KEY_ID_MARKER);
  if (keyIndex <= 0) return { ok: false, reason: "malformed_query" };

  const signature = tail.slice(0, keyIndex);
  const keyId = tail.slice(keyIndex + KEY_ID_MARKER.length);
  if (!signature || !/^\d+$/.test(keyId)) return { ok: false, reason: "malformed_query" };

  const fields = new URLSearchParams(message);
  const transactionId = fields.get("transaction_id")?.trim() ?? "";
  const userId = fields.get("user_id")?.trim() ?? "";
  const adUnit = fields.get("ad_unit")?.trim() ?? "";
  const timestampMs = Number(fields.get("timestamp"));
  if (!transactionId || !userId || !adUnit || !Number.isFinite(timestampMs) || timestampMs <= 0) {
    return { ok: false, reason: "missing_parameter" };
  }

  const keys = await fetchKeys();
  const key = keys.find((k) => k.keyId === keyId);
  if (!key) return { ok: false, reason: "unknown_key" };

  let publicKey: KeyObject;
  try {
    publicKey = createPublicKey(key.pem);
  } catch {
    return { ok: false, reason: "unknown_key" };
  }

  let valid = false;
  try {
    valid = createVerify("SHA256").update(message, "utf8").verify(publicKey, base64UrlToBuffer(signature));
  } catch {
    valid = false;
  }
  if (!valid) return { ok: false, reason: "bad_signature" };

  // Les contrôles métier ne se font qu'après la signature : aucun détail
  // n'est révélé à un appelant qui ne détient pas une requête signée.
  const age = now.getTime() - timestampMs;
  if (age > AD_REWARD_MAX_AGE_MS || age < -5 * 60 * 1000) {
    return { ok: false, reason: "stale_timestamp" };
  }
  if (!allowedAdUnits.includes(adUnit)) return { ok: false, reason: "ad_unit_not_allowed" };

  return {
    ok: true,
    reward: { provider: "admob", transactionId, userId, adUnit, timestamp: new Date(timestampMs) },
  };
}

// ------------------------------------------------------------------
// Récupération des clés publiques Google, avec cache en mémoire.
// ------------------------------------------------------------------
const KEYS_TTL_MS = 12 * 60 * 60 * 1000;

export function createCachedKeyFetcher(url: string, fetchImpl: typeof fetch = fetch): SsvKeyFetcher {
  let cache: { keys: SsvKey[]; at: number } | null = null;

  return async () => {
    if (cache && Date.now() - cache.at < KEYS_TTL_MS) return cache.keys;

    const res = await fetchImpl(url);
    if (!res.ok) {
      if (cache) return cache.keys; // clés précédentes plutôt qu'une panne
      throw new Error(`Clés de vérification publicitaire indisponibles (HTTP ${res.status})`);
    }
    const body = (await res.json()) as { keys?: Array<{ keyId?: number | string; pem?: string }> };
    const keys = (body.keys ?? [])
      .filter((k) => k.keyId !== undefined && typeof k.pem === "string")
      .map((k) => ({ keyId: String(k.keyId), pem: k.pem as string }));
    if (keys.length === 0) throw new Error("Aucune clé de vérification publicitaire reçue");

    cache = { keys, at: Date.now() };
    return keys;
  };
}

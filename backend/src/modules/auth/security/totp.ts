import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

/**
 * Double authentification TOTP (RFC 6238 : SHA-1, 6 chiffres, pas de 30 secondes),
 * compatible avec les applications d'authentification courantes.
 * Logique pure, sans dépendance externe.
 */
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const TOTP_STEP_SECONDS = 30;
export const TOTP_DIGITS = 6;

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    value = (value << 5) | BASE32.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

export function totpCodeAt(secret: string, timeMs: number): string {
  const counter = Math.floor(timeMs / 1000 / TOTP_STEP_SECONDS);
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", base32Decode(secret)).update(msg).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const binary = (hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** TOTP_DIGITS;
  return binary.toString().padStart(TOTP_DIGITS, "0");
}

/**
 * Retourne le numéro de pas TOTP correspondant au code (pas courant ou un pas de
 * dérive de chaque côté), ou null. Le numéro sert à refuser le rejeu d'un code déjà utilisé.
 */
export function matchTotpStep(secret: string, code: string, nowMs: number = Date.now()): number | null {
  const normalized = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return null;
  for (const drift of [-1, 0, 1]) {
    const at = nowMs + drift * TOTP_STEP_SECONDS * 1000;
    const expected = totpCodeAt(secret, at);
    if (timingSafeEqual(Buffer.from(expected), Buffer.from(normalized))) {
      return Math.floor(at / 1000 / TOTP_STEP_SECONDS);
    }
  }
  return null;
}

/** Accepte le pas courant et un pas de dérive de chaque côté (dérive d'horloge du téléphone). */
export function verifyTotp(secret: string, code: string, nowMs: number = Date.now()): boolean {
  return matchTotpStep(secret, code, nowMs) !== null;
}

export function otpauthUri(secret: string, account: string, issuer = "JeuTaime"): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_STEP_SECONDS}`;
}

// ------------------------------------------------------------------
// Chiffrement du secret au repos (AES-256-GCM)
// ------------------------------------------------------------------
function deriveKey(masterKey: string): Buffer {
  return createHash("sha256").update(masterKey, "utf8").digest();
}

export function encryptSecret(secret: string, masterKey: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(masterKey), iv);
  const data = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(":");
}

export function decryptSecret(payload: string, masterKey: string): string {
  const [version, iv, tag, data] = payload.split(":");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Secret de double authentification illisible");
  const decipher = createDecipheriv("aes-256-gcm", deriveKey(masterKey), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}

// ------------------------------------------------------------------
// Codes de secours : 10 codes de 10 caractères, affichés une seule fois.
// ------------------------------------------------------------------
const BACKUP_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans I, O, 0, 1

export function generateBackupCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const raw = Array.from(randomBytes(10), (b) => BACKUP_ALPHABET[b % BACKUP_ALPHABET.length]).join("");
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}

export function normalizeBackupCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function hashBackupCode(code: string): string {
  return createHash("sha256").update(normalizeBackupCode(code), "utf8").digest("hex");
}

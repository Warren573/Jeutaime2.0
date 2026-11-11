import { describe, it, expect } from "vitest";
import {
  base32Decode,
  base32Encode,
  decryptSecret,
  encryptSecret,
  generateBackupCodes,
  generateTotpSecret,
  hashBackupCode,
  otpauthUri,
  totpCodeAt,
  verifyTotp,
} from "../../src/modules/auth/security/totp";

// Secret des vecteurs de test de la RFC 6238 : "12345678901234567890" en ASCII.
const RFC_SECRET = base32Encode(Buffer.from("12345678901234567890", "ascii"));

describe("TOTP (RFC 6238)", () => {
  it("reproduit les vecteurs de la norme (6 derniers chiffres)", () => {
    expect(totpCodeAt(RFC_SECRET, 59 * 1000)).toBe("287082");
    expect(totpCodeAt(RFC_SECRET, 1111111109 * 1000)).toBe("081804");
    expect(totpCodeAt(RFC_SECRET, 1234567890 * 1000)).toBe("005924");
    expect(totpCodeAt(RFC_SECRET, 2000000000 * 1000)).toBe("279037");
  });

  it("base32 : aller-retour", () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(base32Encode(base32Decode(secret))).toBe(secret);
  });

  it("accepte le pas courant et un pas de dérive, refuse au-delà", () => {
    const now = 1_700_000_000_000;
    const secret = generateTotpSecret();
    expect(verifyTotp(secret, totpCodeAt(secret, now), now)).toBe(true);
    expect(verifyTotp(secret, totpCodeAt(secret, now - 30_000), now)).toBe(true);
    expect(verifyTotp(secret, totpCodeAt(secret, now + 30_000), now)).toBe(true);
    expect(verifyTotp(secret, totpCodeAt(secret, now - 120_000), now)).toBe(false);
  });

  it("refuse les codes mal formés", () => {
    const secret = generateTotpSecret();
    for (const bad of ["", "12345", "1234567", "abcdef", "12 34"]) expect(verifyTotp(secret, bad)).toBe(false);
  });

  it("adresse otpauth lisible par les applications d'authentification", () => {
    const uri = otpauthUri("ABCDEFGHIJKLMNOP", "moi@exemple.fr");
    expect(uri).toContain("otpauth://totp/JeuTaime%3Amoi%40exemple.fr");
    expect(uri).toContain("secret=ABCDEFGHIJKLMNOP");
    expect(uri).toContain("issuer=JeuTaime");
  });
});

describe("chiffrement du secret", () => {
  const key = "cle-de-test-uniquement-0123456789abcdef";
  it("le secret stocké n'est pas lisible et se déchiffre avec la bonne clé", () => {
    const secret = generateTotpSecret();
    const stored = encryptSecret(secret, key);
    expect(stored).not.toContain(secret);
    expect(decryptSecret(stored, key)).toBe(secret);
  });
  it("deux chiffrements du même secret diffèrent", () => {
    expect(encryptSecret("AAAA", key)).not.toBe(encryptSecret("AAAA", key));
  });
  it("échoue avec une autre clé ou un contenu altéré", () => {
    const stored = encryptSecret("AAAABBBB", key);
    expect(() => decryptSecret(stored, key + "x")).toThrow();
    expect(() => decryptSecret(stored.slice(0, -4) + "AAAA", key)).toThrow();
  });
});

describe("codes de secours", () => {
  it("10 codes distincts au format XXXXX-XXXXX, sans caractères ambigus", () => {
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const c of codes) expect(c).toMatch(/^[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/);
  });
  it("l'empreinte ignore la casse, les espaces et le tiret", () => {
    expect(hashBackupCode("abcde-fgh23")).toBe(hashBackupCode(" ABCDEFGH23 "));
    expect(hashBackupCode("ABCDE-FGH23")).not.toBe(hashBackupCode("ABCDE-FGH24"));
  });
});

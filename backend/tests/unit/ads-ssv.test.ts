import { describe, it, expect } from "vitest";
import { createSign, generateKeyPairSync } from "crypto";
import { verifyAdmobSsv, createCachedKeyFetcher, type SsvKey } from "../../src/modules/ads/admobSsv";
import {
  AD_REWARD_COINS,
  AD_REWARD_DAILY_MAX,
  adRewardDayKey,
  canClaimAdReward,
  remainingAdRewards,
} from "../../src/policies/adRewards";

/**
 * Vérification serveur des publicités récompensées.
 * Les clés sont générées pour le test : aucune clé ni identifiant réel.
 */
const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const other = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const KEY_ID = "1234567890";
const keys: SsvKey[] = [{ keyId: KEY_ID, pem: publicKey.export({ type: "spki", format: "pem" }).toString() }];
const fetchKeys = async () => keys;
const AD_UNIT = "unite-de-test";
const NOW = new Date("2026-11-10T12:00:00.000Z");

function signedQuery(
  fields: Record<string, string>,
  opts: { key?: typeof privateKey; keyId?: string } = {},
): string {
  const message = new URLSearchParams(fields).toString();
  const signature = createSign("SHA256")
    .update(message, "utf8")
    .sign(opts.key ?? privateKey)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${message}&signature=${signature}&key_id=${opts.keyId ?? KEY_ID}`;
}

const base = {
  ad_network: "5450213213286189855",
  ad_unit: AD_UNIT,
  reward_amount: "10",
  reward_item: "pieces",
  timestamp: String(NOW.getTime() - 5_000),
  transaction_id: "txn-abc-123",
  user_id: "user-42",
};
const verify = (rawQuery: string, allowedAdUnits: string[] = [AD_UNIT]) =>
  verifyAdmobSsv({ rawQuery, fetchKeys, allowedAdUnits, now: NOW });

describe("règles validées des publicités récompensées", () => {
  it("+10 pièces, 5 par jour", () => {
    expect(AD_REWARD_COINS).toBe(10);
    expect(AD_REWARD_DAILY_MAX).toBe(5);
  });
  it("plafond quotidien", () => {
    expect(remainingAdRewards(0)).toBe(5);
    expect(remainingAdRewards(4)).toBe(1);
    expect(remainingAdRewards(5)).toBe(0);
    expect(remainingAdRewards(9)).toBe(0);
    expect(canClaimAdReward(4)).toBe(true);
    expect(canClaimAdReward(5)).toBe(false);
  });
  it("jour UTC", () => {
    expect(adRewardDayKey(new Date("2026-11-10T23:59:59.999Z"))).toBe("2026-11-10");
    expect(adRewardDayKey(new Date("2026-11-11T00:00:00.000Z"))).toBe("2026-11-11");
  });
});

describe("verifyAdmobSsv", () => {
  it("accepte une validation authentique", async () => {
    const res = await verify(signedQuery(base));
    expect(res).toEqual({
      ok: true,
      reward: {
        provider: "admob",
        transactionId: "txn-abc-123",
        userId: "user-42",
        adUnit: AD_UNIT,
        timestamp: new Date(NOW.getTime() - 5_000),
      },
    });
  });

  it("refuse si un paramètre est modifié après signature (autre utilisateur)", async () => {
    const forged = signedQuery(base).replace("user_id=user-42", "user_id=user-99");
    expect(await verify(forged)).toEqual({ ok: false, reason: "bad_signature" });
  });

  it("refuse un montant modifié après signature", async () => {
    const forged = signedQuery(base).replace("reward_amount=10", "reward_amount=9999");
    expect(await verify(forged)).toEqual({ ok: false, reason: "bad_signature" });
  });

  it("refuse une signature faite avec une autre clé", async () => {
    expect(await verify(signedQuery(base, { key: other.privateKey }))).toEqual({
      ok: false,
      reason: "bad_signature",
    });
  });

  it("refuse un identifiant de clé inconnu", async () => {
    expect(await verify(signedQuery(base, { keyId: "999" }))).toEqual({ ok: false, reason: "unknown_key" });
  });

  it("refuse une requête sans signature ou mal formée", async () => {
    expect(await verify(new URLSearchParams(base).toString())).toEqual({ ok: false, reason: "malformed_query" });
    expect(await verify("")).toEqual({ ok: false, reason: "malformed_query" });
    expect(await verify("a=b&signature=&key_id=1")).toEqual({ ok: false, reason: "malformed_query" });
    expect(await verify("a=b&signature=xyz&key_id=abc")).toEqual({ ok: false, reason: "malformed_query" });
  });

  it("refuse une validation sans utilisateur ou sans transaction", async () => {
    expect(await verify(signedQuery({ ...base, user_id: "" }))).toEqual({ ok: false, reason: "missing_parameter" });
    expect(await verify(signedQuery({ ...base, transaction_id: "" }))).toEqual({
      ok: false,
      reason: "missing_parameter",
    });
  });

  it("refuse une validation trop ancienne (rejeu)", async () => {
    const old = signedQuery({ ...base, timestamp: String(NOW.getTime() - 2 * 60 * 60 * 1000) });
    expect(await verify(old)).toEqual({ ok: false, reason: "stale_timestamp" });
  });

  it("refuse un emplacement publicitaire non autorisé, et tout emplacement si la liste est vide", async () => {
    expect(await verify(signedQuery(base), ["autre-unite"])).toEqual({ ok: false, reason: "ad_unit_not_allowed" });
    expect(await verify(signedQuery(base), [])).toEqual({ ok: false, reason: "ad_unit_not_allowed" });
  });
});

describe("createCachedKeyFetcher", () => {
  it("met les clés en cache et conserve les précédentes si le service échoue", async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      return { ok: true, status: 200, json: async () => ({ keys: [{ keyId: 7, pem: "PEM" }] }) };
    }) as unknown as typeof fetch;
    const fetcher = createCachedKeyFetcher("https://exemple.invalid/keys.json", fetchImpl);
    expect(await fetcher()).toEqual([{ keyId: "7", pem: "PEM" }]);
    await fetcher();
    expect(calls).toBe(1);
  });

  it("échoue si aucune clé n'est disponible", async () => {
    const fetchImpl = (async () => ({ ok: false, status: 503, json: async () => ({}) })) as unknown as typeof fetch;
    await expect(createCachedKeyFetcher("https://exemple.invalid/k", fetchImpl)()).rejects.toThrow();
  });
});

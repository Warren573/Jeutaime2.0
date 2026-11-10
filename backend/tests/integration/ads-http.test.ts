import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createSign, generateKeyPairSync } from "crypto";
import request from "supertest";

/**
 * Parcours HTTP complet de la validation serveur des publicités récompensées.
 * Clés générées pour le test ; aucun appel réseau vers le réseau publicitaire.
 * Nécessite TEST_DATABASE_URL.
 */
const test = process.env.TEST_DATABASE_URL ? it : it.skip;

const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const KEY_ID = "42";
const AD_UNIT = "unite-http-test";

vi.mock("../../src/modules/ads/admobSsv", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/modules/ads/admobSsv")>();
  return {
    ...actual,
    createCachedKeyFetcher: () => async () => [
      { keyId: KEY_ID, pem: publicKey.export({ type: "spki", format: "pem" }).toString() },
    ],
  };
});

function signed(fields: Record<string, string>): string {
  const message = new URLSearchParams(fields).toString();
  const signature = createSign("SHA256").update(message, "utf8").sign(privateKey).toString("base64url");
  return `${message}&signature=${signature}&key_id=${KEY_ID}`;
}

async function loadApp(enabled: boolean) {
  vi.resetModules();
  vi.stubEnv("ADS_REWARDED_ENABLED", enabled ? "true" : "false");
  vi.stubEnv("ADMOB_REWARDED_AD_UNITS", AD_UNIT);
  const app = (await import("../../src/app")).default;
  const { prisma } = await import("../../src/config/prisma");
  return { app, prisma };
}

const userId = "ads-http-" + Date.now();

describe("GET /api/ads/admob/ssv", () => {
  beforeAll(async () => {
    if (!process.env.TEST_DATABASE_URL) return;
    const { prisma } = await loadApp(true);
    await prisma.user.create({
      data: { id: userId, email: userId + "@test.local", passwordHash: "test", role: "USER", isVerified: true },
    });
    await prisma.wallet.create({ data: { userId, coins: 0 } });
  });
  afterAll(async () => {
    vi.unstubAllEnvs();
    if (!process.env.TEST_DATABASE_URL) return;
    const { prisma } = await import("../../src/config/prisma");
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  const fields = () => ({
    ad_network: "1",
    ad_unit: AD_UNIT,
    reward_amount: "10",
    reward_item: "pieces",
    timestamp: String(Date.now()),
    transaction_id: "http-txn-" + Date.now(),
    user_id: userId,
  });

  test("fonction désactivée : 404, rien n'est crédité", async () => {
    const { app, prisma } = await loadApp(false);
    const res = await request(app).get("/api/ads/admob/ssv?" + signed(fields()));
    expect(res.status).toBe(404);
    expect((await prisma.wallet.findUniqueOrThrow({ where: { userId } })).coins).toBe(0);
  });

  test("requête non signée ou falsifiée : 403, rien n'est crédité", async () => {
    const { app, prisma } = await loadApp(true);
    expect((await request(app).get("/api/ads/admob/ssv?user_id=" + userId + "&transaction_id=x")).status).toBe(403);
    const forged = signed(fields()).replace("reward_amount=10", "reward_amount=5000");
    expect((await request(app).get("/api/ads/admob/ssv?" + forged)).status).toBe(403);
    expect((await prisma.wallet.findUniqueOrThrow({ where: { userId } })).coins).toBe(0);
  });

  test("validation authentique : 200 et +10 ; renvoyée une seconde fois : 200 sans second crédit", async () => {
    const { app, prisma } = await loadApp(true);
    const query = signed(fields());
    const first = await request(app).get("/api/ads/admob/ssv?" + query);
    expect(first.status).toBe(200);
    expect(first.body.status).toBe("granted");
    const second = await request(app).get("/api/ads/admob/ssv?" + query);
    expect(second.status).toBe(200);
    expect(second.body.status).toBe("already_granted");
    expect((await prisma.wallet.findUniqueOrThrow({ where: { userId } })).coins).toBe(10);
  });

  test("l'état des récompenses exige une session", async () => {
    const { app } = await loadApp(true);
    expect((await request(app).get("/api/ads/rewarded/status")).status).toBe(401);
  });
});

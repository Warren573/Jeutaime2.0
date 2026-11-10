import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/config/prisma";
import { grantVerifiedAdReward, getRewardedAdStatus } from "../../src/modules/ads/ads.service";
import type { VerifiedAdReward } from "../../src/modules/ads/admobSsv";

/**
 * Publicités récompensées sur PostgreSQL : +10 pièces, 5 par jour UTC,
 * une seule récompense par transaction du réseau, même en concurrence.
 * Nécessite TEST_DATABASE_URL.
 */
const test = process.env.TEST_DATABASE_URL ? it : it.skip;
const users: string[] = [];
let seq = 0;

async function player(coins = 0, banned = false) {
  const id = "ads-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
  users.push(id);
  await prisma.user.create({
    data: { id, email: id + "@test.local", passwordHash: "test", role: "USER", isVerified: true, isBanned: banned },
  });
  await prisma.wallet.create({ data: { userId: id, coins } });
  return id;
}
const reward = (userId: string, transactionId = "txn-" + Date.now() + "-" + ++seq): VerifiedAdReward => ({
  provider: "admob",
  transactionId,
  userId,
  adUnit: "unite-de-test",
  timestamp: new Date(),
});
const coinsOf = async (id: string) => (await prisma.wallet.findUniqueOrThrow({ where: { userId: id } })).coins;

afterEach(async () => {
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  users.length = 0;
});

describe("Publicités récompensées — PostgreSQL", () => {
  test("une validation crédite 10 pièces et laisse une trace au journal", async () => {
    const id = await player(3);
    const outcome = await grantVerifiedAdReward(reward(id));
    expect(outcome).toEqual({ status: "granted", coins: 10, balance: 13, remainingToday: 4 });
    const txns = await prisma.coinTransaction.findMany({ where: { walletId: id } });
    expect(txns).toHaveLength(1);
    expect(txns[0]).toMatchObject({ type: "AD_REWARD", amount: 10, balance: 13 });
  });

  test("la même transaction livrée 6 fois en même temps ne crédite qu'une fois", async () => {
    const id = await player(0);
    const same = reward(id, "txn-rejouee-" + Date.now());
    const results = await Promise.all(Array.from({ length: 6 }, () => grantVerifiedAdReward(same)));
    expect(results.filter((r) => r.status === "granted")).toHaveLength(1);
    expect(results.filter((r) => r.status === "already_granted")).toHaveLength(5);
    expect(await coinsOf(id)).toBe(10);
    expect(await prisma.coinTransaction.count({ where: { walletId: id, type: "AD_REWARD" } })).toBe(1);
  });

  test("12 validations distinctes simultanées : 5 créditées, 50 pièces, jamais plus", async () => {
    const id = await player(0);
    const results = await Promise.all(Array.from({ length: 12 }, () => grantVerifiedAdReward(reward(id))));
    expect(results.filter((r) => r.status === "granted")).toHaveLength(5);
    expect(results.filter((r) => r.status === "daily_limit")).toHaveLength(7);
    expect(await coinsOf(id)).toBe(50);
    expect(await prisma.adRewardClaim.count({ where: { userId: id } })).toBe(5);
    expect(await prisma.coinTransaction.count({ where: { walletId: id, type: "AD_REWARD" } })).toBe(5);
  });

  test("le plafond repart à zéro le jour UTC suivant", async () => {
    const id = await player(0);
    const day1 = new Date("2026-11-10T22:00:00.000Z");
    for (let i = 0; i < 5; i++) await grantVerifiedAdReward(reward(id), day1);
    expect((await grantVerifiedAdReward(reward(id), new Date("2026-11-10T23:59:59.000Z"))).status).toBe("daily_limit");
    expect((await grantVerifiedAdReward(reward(id), new Date("2026-11-11T00:00:01.000Z"))).status).toBe("granted");
    expect(await coinsOf(id)).toBe(60);
  });

  test("une transaction déjà utilisée par un compte ne crédite pas un autre compte", async () => {
    const a = await player(0);
    const b = await player(0);
    const txn = "txn-partagee-" + Date.now();
    expect((await grantVerifiedAdReward(reward(a, txn))).status).toBe("granted");
    expect((await grantVerifiedAdReward(reward(b, txn))).status).toBe("already_granted");
    expect(await coinsOf(b)).toBe(0);
  });

  test("compte inconnu ou banni : rien n'est crédité", async () => {
    expect((await grantVerifiedAdReward(reward("compte-inexistant"))).status).toBe("unknown_user");
    const banned = await player(0, true);
    expect((await grantVerifiedAdReward(reward(banned))).status).toBe("unknown_user");
    expect(await coinsOf(banned)).toBe(0);
  });

  test("état affiché à l'utilisateur", async () => {
    const id = await player(0);
    const now = new Date("2026-11-12T10:00:00.000Z");
    await grantVerifiedAdReward(reward(id), now);
    await grantVerifiedAdReward(reward(id), now);
    expect(await getRewardedAdStatus(id, true, now)).toEqual({
      enabled: true, rewardCoins: 10, dailyMax: 5, claimedToday: 2, remainingToday: 3,
    });
    expect((await getRewardedAdStatus(id, false, now)).remainingToday).toBe(0);
  });
});

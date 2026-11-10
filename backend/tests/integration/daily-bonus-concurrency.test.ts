import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/config/prisma";
import * as wallet from "../../src/modules/wallet/wallet.service";
import { DAILY_BONUS_FREE } from "../../src/config/constants";

/**
 * Régression économie : le bonus quotidien ne doit être crédité qu'UNE fois
 * par jour UTC, même si plusieurs requêtes arrivent en même temps
 * (double tap, deux appareils, rejeu réseau).
 *
 * Nécessite une vraie base PostgreSQL : TEST_DATABASE_URL doit être défini.
 */
const test = process.env.TEST_DATABASE_URL ? it : it.skip;
const users: string[] = [];

async function player(coins = 0) {
  const id = "bonus-concurrency-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
  users.push(id);
  await prisma.user.create({
    data: { id, email: id + "@test.local", passwordHash: "test", role: "USER", isVerified: true, premiumTier: "FREE" },
  });
  await prisma.wallet.create({ data: { userId: id, coins } });
  return id;
}

afterEach(async () => {
  await prisma.coinTransaction.deleteMany({ where: { walletId: { in: users } } });
  await prisma.wallet.deleteMany({ where: { userId: { in: users } } });
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  users.length = 0;
});

describe("Daily bonus PostgreSQL concurrency", () => {
  test("8 réclamations simultanées ne créditent le bonus qu'une seule fois", async () => {
    const id = await player(0);

    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () => wallet.claimDailyBonus(id)),
    );

    const fulfilled = results.filter((r) => r.status === "fulfilled").length;
    const coins = (await prisma.wallet.findUniqueOrThrow({ where: { userId: id } })).coins;
    const txns = await prisma.coinTransaction.count({ where: { walletId: id, type: "DAILY_BONUS" } });

    expect({ fulfilled, coins, txns }).toEqual({ fulfilled: 1, coins: DAILY_BONUS_FREE, txns: 1 });
  });

  test("une seconde réclamation le même jour est refusée et ne crédite rien", async () => {
    const id = await player(7);

    await wallet.claimDailyBonus(id);
    await expect(wallet.claimDailyBonus(id)).rejects.toThrow(/déjà réclamé/);

    const coins = (await prisma.wallet.findUniqueOrThrow({ where: { userId: id } })).coins;
    expect(coins).toBe(7 + DAILY_BONUS_FREE);
  });

  test("crédits et débits administratifs simultanés ne perdent aucune écriture", async () => {
    const id = await player(100);

    await Promise.all([
      ...Array.from({ length: 5 }, () => wallet.creditWallet({ userId: id, amount: 10, type: "ADMIN_ADJUST" })),
      ...Array.from({ length: 5 }, () => wallet.debitWallet({ userId: id, amount: 4, type: "ADMIN_ADJUST" })),
    ]);

    const coins = (await prisma.wallet.findUniqueOrThrow({ where: { userId: id } })).coins;
    expect(coins).toBe(100 + 5 * 10 - 5 * 4);
  });
});

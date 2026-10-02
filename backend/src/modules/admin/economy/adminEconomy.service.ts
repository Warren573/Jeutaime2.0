import { CoinTxnType, Prisma } from "@prisma/client";
import { prisma } from "../../../config/prisma";
import { NotFoundError } from "../../../core/errors";
import { writeAudit } from "../admin.audit";

export async function getEconomyOverview() {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    walletAgg,
    txToday,
    tx7d,
    earnedToday,
    spentToday,
    coinPurchasesToday,
    premiumPurchasesToday,
    refundsToday,
    activePremium,
    offeringsSentToday,
    magiesCastToday,
    offeringsEnabled,
    offeringsTotal,
    magiesEnabled,
    magiesTotal,
  ] = await Promise.all([
    prisma.wallet.aggregate({
      _sum: { coins: true },
      _avg: { coins: true },
      _max: { coins: true },
      _count: { userId: true },
    }),
    prisma.coinTransaction.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.coinTransaction.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.coinTransaction.aggregate({
      where: { createdAt: { gte: startOfDay }, amount: { gt: 0 } },
      _sum: { amount: true },
    }),
    prisma.coinTransaction.aggregate({
      where: { createdAt: { gte: startOfDay }, amount: { lt: 0 } },
      _sum: { amount: true },
    }),
    prisma.coinTransaction.count({
      where: { createdAt: { gte: startOfDay }, type: CoinTxnType.PURCHASE_COINS },
    }),
    prisma.coinTransaction.count({
      where: { createdAt: { gte: startOfDay }, type: CoinTxnType.PREMIUM_PURCHASE },
    }),
    prisma.coinTransaction.count({
      where: { createdAt: { gte: startOfDay }, type: CoinTxnType.REFUND },
    }),
    prisma.user.count({
      where: { premiumTier: "PREMIUM", premiumUntil: { gt: now } },
    }),
    prisma.offeringSent.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.magieCast.count({ where: { castAt: { gte: startOfDay } } }),
    prisma.offeringCatalog.count({ where: { enabled: true } }),
    prisma.offeringCatalog.count(),
    prisma.magieCatalog.count({ where: { enabled: true } }),
    prisma.magieCatalog.count(),
  ]);

  return {
    wallets: {
      count: walletAgg._count.userId,
      totalCoins: walletAgg._sum.coins ?? 0,
      averageCoins: Math.round(walletAgg._avg.coins ?? 0),
      maxCoins: walletAgg._max.coins ?? 0,
    },
    today: {
      transactions: txToday,
      earnedCoins: earnedToday._sum.amount ?? 0,
      spentCoins: Math.abs(spentToday._sum.amount ?? 0),
      coinPurchases: coinPurchasesToday,
      premiumPurchases: premiumPurchasesToday,
      refunds: refundsToday,
      offeringsSent: offeringsSentToday,
      magiesCast: magiesCastToday,
    },
    transactions7d: tx7d,
    premiumActive: activePremium,
    catalog: {
      offeringsEnabled,
      offeringsTotal,
      magiesEnabled,
      magiesTotal,
    },
  };
}

export async function listTransactions(query: {
  type?: string;
  userId?: string;
  page: number;
  pageSize: number;
}) {
  const where: Prisma.CoinTransactionWhereInput = {};
  if (query.userId) where.walletId = query.userId;
  if (query.type && Object.values(CoinTxnType).includes(query.type as CoinTxnType)) {
    where.type = query.type as CoinTxnType;
  }

  const [items, total] = await Promise.all([
    prisma.coinTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        walletId: true,
        type: true,
        amount: true,
        balance: true,
        meta: true,
        createdAt: true,
        wallet: {
          select: {
            user: {
              select: {
                email: true,
                profile: { select: { pseudo: true } },
              },
            },
          },
        },
      },
    }),
    prisma.coinTransaction.count({ where }),
  ]);

  return {
    items: items.map((tx) => ({
      id: tx.id,
      userId: tx.walletId,
      email: tx.wallet.user.email,
      pseudo: tx.wallet.user.profile?.pseudo ?? null,
      type: tx.type,
      amount: tx.amount,
      balance: tx.balance,
      meta: tx.meta,
      createdAt: tx.createdAt,
    })),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function listCatalog() {
  const [offerings, magies] = await Promise.all([
    prisma.offeringCatalog.findMany({
      orderBy: [{ enabled: "desc" }, { category: "asc" }, { cost: "asc" }, { name: "asc" }],
      select: {
        id: true,
        emoji: true,
        name: true,
        cost: true,
        category: true,
        durationMs: true,
        salonOnly: true,
        enabled: true,
        consumptionMode: true,
        _count: { select: { sentOfferings: true } },
      },
    }),
    prisma.magieCatalog.findMany({
      orderBy: [{ enabled: "desc" }, { cost: "asc" }, { name: "asc" }],
      select: {
        id: true,
        emoji: true,
        name: true,
        cost: true,
        durationSec: true,
        type: true,
        enabled: true,
        _count: { select: { casts: true } },
      },
    }),
  ]);

  return {
    offerings: offerings.map((o) => ({
      id: o.id,
      emoji: o.emoji,
      name: o.name,
      cost: o.cost,
      category: o.category,
      durationMs: o.durationMs,
      salonOnly: o.salonOnly,
      enabled: o.enabled,
      consumptionMode: o.consumptionMode,
      sentCount: o._count.sentOfferings,
    })),
    magies: magies.map((m) => ({
      id: m.id,
      emoji: m.emoji,
      name: m.name,
      cost: m.cost,
      durationSec: m.durationSec,
      type: m.type,
      enabled: m.enabled,
      castCount: m._count.casts,
    })),
  };
}

export async function updateOffering(
  actorId: string,
  id: string,
  data: { enabled?: boolean; cost?: number },
) {
  const before = await prisma.offeringCatalog.findUnique({
    where: { id },
    select: { id: true, name: true, enabled: true, cost: true },
  });
  if (!before) throw new NotFoundError("Offrande");

  const updated = await prisma.offeringCatalog.update({
    where: { id },
    data,
    select: { id: true, name: true, enabled: true, cost: true, category: true, salonOnly: true },
  });

  await writeAudit({
    actorId,
    action: "admin.shop.offering.update",
    target: id,
    meta: {
      name: before.name,
      from: { enabled: before.enabled, cost: before.cost },
      to: { enabled: updated.enabled, cost: updated.cost },
    } as Prisma.InputJsonValue,
  });

  return updated;
}

export async function updateMagie(
  actorId: string,
  id: string,
  data: { enabled?: boolean; cost?: number },
) {
  const before = await prisma.magieCatalog.findUnique({
    where: { id },
    select: { id: true, name: true, enabled: true, cost: true },
  });
  if (!before) throw new NotFoundError("Magie");

  const updated = await prisma.magieCatalog.update({
    where: { id },
    data,
    select: { id: true, name: true, enabled: true, cost: true, type: true, durationSec: true },
  });

  await writeAudit({
    actorId,
    action: "admin.shop.magie.update",
    target: id,
    meta: {
      name: before.name,
      from: { enabled: before.enabled, cost: before.cost },
      to: { enabled: updated.enabled, cost: updated.cost },
    } as Prisma.InputJsonValue,
  });

  return updated;
}

export async function listPremiumUsers() {
  const now = new Date();
  const rows = await prisma.user.findMany({
    where: { premiumTier: "PREMIUM" },
    orderBy: [{ premiumUntil: "asc" }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true,
      email: true,
      premiumUntil: true,
      createdAt: true,
      profile: { select: { pseudo: true } },
      wallet: { select: { coins: true } },
    },
  });

  return rows.map((u) => ({
    id: u.id,
    email: u.email,
    pseudo: u.profile?.pseudo ?? null,
    premiumUntil: u.premiumUntil,
    active: !!u.premiumUntil && u.premiumUntil > now,
    coins: u.wallet?.coins ?? 0,
    createdAt: u.createdAt,
  }));
}

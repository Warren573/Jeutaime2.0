import {
  CoinTxnType,
  OfferingCatalog,
  OfferingSent,
  Prisma,
  SalonKind,
} from "@prisma/client";
import { prisma } from "../../config/prisma";
import {
  ForbiddenError,
  NotFoundError,
} from "../../core/errors";
import {
  assertNotSelfOffering,
  assertOfferingUsable,
  assertSalonOnlyRespected,
  computeOfferingExpiry,
  isOfferingActive,
} from "../../policies/offerings";
import { computeDebitBalance } from "../../policies/wallet";
import type {
  ListReceivedQueryDto,
  SendOfferingDto,
} from "./offerings.schemas";

// ============================================================
// DTOs
// ============================================================

export interface OfferingCatalogDto {
  id: string;
  emoji: string;
  name: string;
  cost: number;
  category: OfferingCatalog["category"];
  durationMs: number | null;
  stackPriority: number;
  salonOnly: OfferingCatalog["salonOnly"];
}

export interface OfferingSentDto {
  id: string;
  offeringId: string;
  offering: OfferingCatalogDto;
  fromUserId: string;
  toUserId: string;
  salonId: string | null;
  createdAt: Date;
  expiresAt: Date | null;
  isActive: boolean;
}

export interface ListReceivedResponse {
  items: OfferingSentDto[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

type OfferingSentWithCatalog = OfferingSent & { offering: OfferingCatalog };

function toCatalogDto(c: OfferingCatalog): OfferingCatalogDto {
  return {
    id: c.id,
    emoji: c.emoji,
    name: c.name,
    cost: c.cost,
    category: c.category,
    durationMs: c.durationMs,
    stackPriority: c.stackPriority,
    salonOnly: c.salonOnly,
  };
}

function toSentDto(
  row: OfferingSentWithCatalog,
  now: Date,
): OfferingSentDto {
  return {
    id: row.id,
    offeringId: row.offeringId,
    offering: toCatalogDto(row.offering),
    fromUserId: row.fromUserId,
    toUserId: row.toUserId,
    salonId: row.salonId,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    isActive: isOfferingActive(row, now),
  };
}

// ============================================================
// listCatalog — uniquement les offerings enabled
// ============================================================
export async function listCatalog(): Promise<OfferingCatalogDto[]> {
  const rows = await prisma.offeringCatalog.findMany({
    where: { enabled: true },
    orderBy: [
      { category: "asc" },
      { stackPriority: "desc" },
      { cost: "asc" },
      { id: "asc" },
    ],
  });
  return rows.map(toCatalogDto);
}

// ============================================================
// sendOffering — envoi atomique avec débit wallet
// ============================================================
export async function sendOffering(
  fromUserId: string,
  dto: SendOfferingDto,
): Promise<OfferingSentDto> {
  // 1. Sanity checks hors DB
  assertNotSelfOffering(fromUserId, dto.toUserId);

  // 2. Lectures hors transaction : catalog, target, salon
  const catalog = await prisma.offeringCatalog.findUnique({
    where: { id: dto.offeringId },
  });
  if (!catalog) throw new NotFoundError("Offering");
  assertOfferingUsable(catalog);

  const target = await prisma.user.findUnique({
    where: { id: dto.toUserId },
    select: { id: true, isBanned: true },
  });
  if (!target) throw new NotFoundError("Destinataire");
  if (target.isBanned) {
    throw new ForbiddenError(
      "Impossible d'envoyer un cadeau à un utilisateur banni",
    );
  }

  // Charger le salon si fourni
  let salon: { id: string; isActive: boolean; kind: SalonKind } | null = null;
  if (dto.salonId !== undefined) {
    const s = await prisma.salon.findUnique({
      where: { id: dto.salonId },
      select: { id: true, isActive: true, kind: true },
    });
    if (!s || !s.isActive) throw new NotFoundError("Salon");
    salon = s;
  }

  // Cohérence salonOnly
  assertSalonOnlyRespected(
    catalog.salonOnly,
    salon ? { isActive: salon.isActive, kind: salon.kind } : null,
  );

  const now = new Date();
  const expiresAt = computeOfferingExpiry(now, catalog.durationMs);

  // 3. Transaction : débit wallet + CoinTransaction + OfferingSent
  const result = await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({
      where: { userId: fromUserId },
    });
    if (!wallet) throw new NotFoundError("Wallet");

    // Pure : throws NotEnoughCoinsError si fonds insuffisants
    const newBalance = computeDebitBalance(wallet.coins, catalog.cost);

    await tx.wallet.update({
      where: { userId: fromUserId },
      data: { coins: newBalance },
    });

    await tx.coinTransaction.create({
      data: {
        walletId: fromUserId,
        type: CoinTxnType.OFFERING_SENT,
        amount: -catalog.cost,
        balance: newBalance,
        meta: {
          offeringId: catalog.id,
          toUserId: dto.toUserId,
          ...(dto.salonId !== undefined ? { salonId: dto.salonId } : {}),
        } as Prisma.InputJsonValue,
      },
    });

    const sent = await tx.offeringSent.create({
      data: {
        offeringId: catalog.id,
        fromUserId,
        toUserId: dto.toUserId,
        salonId: dto.salonId ?? null,
        expiresAt,
      },
      include: { offering: true },
    });

    return sent;
  });

  return toSentDto(result, now);
}

// ============================================================
// listReceived — cadeaux reçus par un user, paginé
// ============================================================
export async function listReceived(
  userId: string,
  query: ListReceivedQueryDto,
  now: Date = new Date(),
): Promise<ListReceivedResponse> {
  const { onlyActive, page, pageSize } = query;
  const skip = (page - 1) * pageSize;

  // WHERE filtrage actif en SQL : expiresAt null OR expiresAt > now
  const where: Prisma.OfferingSentWhereInput = { toUserId: userId };
  if (onlyActive) {
    where.OR = [
      { expiresAt: null },
      { expiresAt: { gt: now } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.offeringSent.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: { offering: true },
      skip,
      take: pageSize,
    }),
    prisma.offeringSent.count({ where }),
  ]);

  // Défense en profondeur : on refiltre via la policy (parité avec magies).
  const items = (onlyActive
    ? rows.filter((r) => isOfferingActive(r, now))
    : rows
  ).map((r) => toSentDto(r, now));

  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

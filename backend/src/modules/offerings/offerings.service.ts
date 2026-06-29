import {
  CoinTxnType,
  OfferingCatalog,
  OfferingSent,
  Prisma,
  SalonKind,
  ConsumptionMode,
} from "@prisma/client";
import { prisma } from "../../config/prisma";
import {
  ForbiddenError,
  NotFoundError,
  BadRequestError,
} from "../../core/errors";
import {
  assertNotSelfOffering,
  assertOfferingUsable,
  assertSalonOnlyRespected,
  computeOfferingExpiry,
  isOfferingActive,
} from "../../policies/offerings";
import { computeDebitBalance } from "../../policies/wallet";
import { emitOfferingSent } from "../../events";
import type {
  ListReceivedQueryDto,
  SendOfferingDto,
  SendOfferingToSessionDto,
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
  consumptionMode: ConsumptionMode;
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
  consumptionCount: number;
  currentStage: number;
  lastConsumedAt: Date | null;
  lastConsumedBy: string | null;
}

export interface ListReceivedResponse {
  items: OfferingSentDto[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

type OfferingSentWithCatalog = OfferingSent & { offering: OfferingCatalog };

export function getCurrentStage(consumptionCount: number): number {
  return Math.min(consumptionCount + 1, 3);
}

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
    consumptionMode: c.consumptionMode,
  };
}

export function toSentDto(
  row: OfferingSentWithCatalog,
  now: Date,
): OfferingSentDto {
  const currentStage = getCurrentStage(row.consumptionCount);
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
    consumptionCount: row.consumptionCount,
    currentStage,
    lastConsumedAt: row.lastConsumedAt,
    lastConsumedBy: row.lastConsumedBy,
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
  console.log('[VALIDATION-1] assertNotSelfOffering');
  assertNotSelfOffering(fromUserId, dto.toUserId);

  // 2. Lectures hors transaction : catalog, target, salon
  console.log('[VALIDATION-2] checking catalog existence');
  const catalog = await prisma.offeringCatalog.findUnique({
    where: { id: dto.offeringId },
  });
  if (!catalog) {
    console.error('[ERROR-400] Offering not found');
    throw new NotFoundError("Offering");
  }
  console.log('[VALIDATION-3] assertOfferingUsable');
  assertOfferingUsable(catalog);

  console.log('[VALIDATION-4] checking target user');
  const target = await prisma.user.findUnique({
    where: { id: dto.toUserId },
    select: { id: true, isBanned: true },
  });
  if (!target) {
    console.error('[ERROR-400] Target user not found');
    throw new NotFoundError("Destinataire");
  }
  if (target.isBanned) {
    console.error('[ERROR-403] Target user is banned');
    throw new ForbiddenError(
      "Impossible d'envoyer un cadeau à un utilisateur banni",
    );
  }

  // Charger le salon si fourni
  console.log('[VALIDATION-5] checking salon if provided', { salonId: dto.salonId });
  let salon: { id: string; isActive: boolean; kind: SalonKind } | null = null;
  if (dto.salonId !== undefined) {
    const s = await prisma.salon.findUnique({
      where: { id: dto.salonId },
      select: { id: true, isActive: true, kind: true },
    });
    if (!s || !s.isActive) {
      console.error('[ERROR-400] Salon not found or inactive');
      throw new NotFoundError("Salon");
    }
    salon = s;
  }

  // Cohérence salonOnly
  console.log('[VALIDATION-6] assertSalonOnlyRespected');
  assertSalonOnlyRespected(
    catalog.salonOnly,
    salon ? { isActive: salon.isActive, kind: salon.kind } : null,
  );

  const now = new Date();
  const expiresAt = computeOfferingExpiry(now, catalog.durationMs);

  // 3. Transaction : débit wallet + CoinTransaction + OfferingSent
  console.log('[VALIDATION-7] entering transaction for wallet debit');
  const result = await prisma.$transaction(async (tx) => {
    console.log('[VALIDATION-8] fetching wallet');
    const wallet = await tx.wallet.findUnique({
      where: { userId: fromUserId },
    });
    if (!wallet) {
      console.error('[ERROR-400] Wallet not found');
      throw new NotFoundError("Wallet");
    }

    // Pure : throws NotEnoughCoinsError si fonds insuffisants
    console.log('[VALIDATION-9] computing debit balance', { coins: wallet.coins, cost: catalog.cost });
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

  // Event émis après succès de la transaction — non bloquant
  emitOfferingSent({
    offeringSentId: result.id,
    offeringId: catalog.id,
    fromUserId,
    toUserId: dto.toUserId,
    salonId: dto.salonId ?? null,
    cost: catalog.cost,
    expiresAt,
  });

  return toSentDto(result, now);
}

// ============================================================
// sendOfferingToSession — Tournée générale (to all active session participants)
// ============================================================
export async function sendOfferingToSession(
  fromUserId: string,
  dto: SendOfferingToSessionDto,
): Promise<{ success: boolean; count: number }> {
  const { offeringId, sessionId } = dto;

  // 1. Validate offering catalog
  const catalog = await prisma.offeringCatalog.findUnique({
    where: { id: offeringId },
  });
  if (!catalog) {
    throw new NotFoundError("Offering");
  }
  assertOfferingUsable(catalog);

  // 2. Validate session and get active participants
  const session = await prisma.salonSession.findUnique({
    where: { id: sessionId },
    include: {
      salon: true,
      participants: {
        where: { status: "ACTIVE" },
        include: { user: { select: { id: true, isBanned: true } } },
      },
    },
  });
  if (!session) {
    throw new NotFoundError("Session");
  }

  // 3. Verify sender is active participant in this session
  const senderIsParticipant = session.participants.some(p => p.userId === fromUserId && p.status === "ACTIVE");
  if (!senderIsParticipant) {
    throw new BadRequestError("User is not an active participant in this session");
  }

  // 4. Filter out banned users and get valid recipients
  const recipients = session.participants
    .map(p => p.user)
    .filter(u => !u.isBanned)
    .map(u => u.id);

  if (recipients.length === 0) {
    throw new BadRequestError("No valid recipients in this session");
  }

  // 5. Check salon-only restrictions
  assertSalonOnlyRespected(
    catalog.salonOnly,
    { isActive: session.salon.isActive, kind: session.salon.kind }
  );

  // 6. Calculate total cost and validate wallet
  const totalCost = catalog.cost * recipients.length;
  const now = new Date();
  const expiresAt = computeOfferingExpiry(now, catalog.durationMs);

  // 7. Transaction: debit wallet once and create OfferingSent for each recipient
  const result = await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({
      where: { userId: fromUserId },
    });
    if (!wallet) {
      throw new NotFoundError("Wallet");
    }

    const newBalance = computeDebitBalance(wallet.coins, totalCost);

    // Debit wallet once for all recipients
    await tx.wallet.update({
      where: { userId: fromUserId },
      data: { coins: newBalance },
    });

    // Single coin transaction for the batch
    await tx.coinTransaction.create({
      data: {
        walletId: fromUserId,
        type: CoinTxnType.OFFERING_SENT,
        amount: -totalCost,
        balance: newBalance,
        meta: {
          offeringId: catalog.id,
          sessionId: sessionId,
          recipientCount: recipients.length,
          toUserIds: recipients,
        } as Prisma.InputJsonValue,
      },
    });

    // Create OfferingSent for each recipient
    const sent = await Promise.all(
      recipients.map(toUserId =>
        tx.offeringSent.create({
          data: {
            offeringId: catalog.id,
            fromUserId,
            toUserId,
            salonId: session.salon.id,
            expiresAt,
          },
        })
      )
    );

    return { count: sent.length };
  });

  // Emit events for each offering sent
  recipients.forEach(toUserId => {
    emitOfferingSent({
      offeringSentId: `batch-${sessionId}-${offeringId}`,
      offeringId: catalog.id,
      fromUserId,
      toUserId,
      salonId: session.salon.id,
      cost: catalog.cost,
      expiresAt,
    });
  });

  return { success: true, count: result.count };
}

// ============================================================
// consumeOffering — consommer une offrande via une action
// ============================================================
export async function consumeOffering(
  offeringId: string,
  actorId: string,
): Promise<OfferingSentDto> {
  const now = new Date();

  // Fetch the offering with catalog info
  const offering = await prisma.offeringSent.findUnique({
    where: { id: offeringId },
    include: { offering: true },
  });

  if (!offering) throw new NotFoundError("Offrande");

  // Check PRIVATE vs SHARED consumption mode
  if (offering.offering.consumptionMode === ConsumptionMode.PRIVATE) {
    if (actorId !== offering.toUserId) {
      throw new ForbiddenError(
        "Seul le destinataire peut consommer cette offrande",
      );
    }
  }

  // Check if expired
  if (offering.expiresAt && now > offering.expiresAt) {
    throw new ForbiddenError("Cette offrande a expiré");
  }

  // Check if already fully consumed (stage 3 means consumptionCount >= 3)
  if (offering.consumptionCount >= 3) {
    throw new ForbiddenError(
      "Cette offrande a déjà complètement disparue",
    );
  }

  // Atomic increment via Prisma
  const updated = await prisma.offeringSent.update({
    where: { id: offeringId },
    data: {
      consumptionCount: { increment: 1 },
      lastConsumedAt: now,
      lastConsumedBy: actorId,
    },
    include: { offering: true },
  });

  return toSentDto(updated, now);
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
  // Filtrer aussi consumptionCount < 3 (disparition après 3 consommations)
  const items = (onlyActive
    ? rows.filter((r) => isOfferingActive(r, now) && r.consumptionCount < 3)
    : rows.filter((r) => r.consumptionCount < 3)
  ).map((r) => toSentDto(r, now));

  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

// ============================================================
// SalonOfferingDto — DTO retourné par GET /api/offerings/salon/:salonId
// ============================================================
export interface SalonOfferingDto {
  id: string;
  offeringId: string;
  emoji: string;
  name: string;
  fromUserId: string;
  fromPseudo: string;
  toUserId: string;
  toPseudo: string;
  salonId: string;
  createdAt: Date;
  expiresAt: Date | null;
  isActive: boolean;
  consumptionCount: number;
  currentStage: number;
  consumptionMode: ConsumptionMode;
  lastConsumedBy: string | null;
}

// ============================================================
// listSalonOfferings — offrandes récentes d'un salon (24h, max 100)
// Sécurité : le salon doit exister et être actif ; l'acteur doit être
// authentifié (garanti par requireAuth en amont, actorId non utilisé
// ici car les salons sont ouverts — pas de membership table).
// ============================================================
export async function listSalonOfferings(
  salonId: string,
  now: Date = new Date(),
): Promise<SalonOfferingDto[]> {
  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: { id: true, isActive: true },
  });
  if (!salon || !salon.isActive) throw new NotFoundError("Salon");

  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const rows = await prisma.offeringSent.findMany({
    where: {
      salonId,
      createdAt: { gt: since },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: 100,
    include: {
      offering: { select: { emoji: true, name: true, consumptionMode: true } },
      fromUser: { select: { profile: { select: { pseudo: true } } } },
      toUser: { select: { profile: { select: { pseudo: true } } } },
    },
  });

  // Filtrer consumptionCount >= 3 (offrande disparue après 3 consommations)
  return rows
    .filter((r) => r.consumptionCount < 3)
    .map((r) => ({
      id: r.id,
      offeringId: r.offeringId,
      emoji: r.offering.emoji,
      name: r.offering.name,
      fromUserId: r.fromUserId,
      fromPseudo: r.fromUser.profile?.pseudo ?? "Anonyme",
      toUserId: r.toUserId,
      toPseudo: r.toUser.profile?.pseudo ?? "Anonyme",
      salonId: salonId,
      createdAt: r.createdAt,
      expiresAt: r.expiresAt,
      isActive: isOfferingActive(r, now),
      consumptionCount: r.consumptionCount,
      currentStage: getCurrentStage(r.consumptionCount),
      consumptionMode: r.offering.consumptionMode,
      lastConsumedBy: r.lastConsumedBy,
    }));
}

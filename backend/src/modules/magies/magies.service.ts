import {
  CoinTxnType,
  MagieCast,
  MagieCatalog,
  Prisma,
} from "@prisma/client";
import { prisma } from "../../config/prisma";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../../core/errors";
import {
  assertAntiSpellBreaksCondition,
  assertCanBreakMagie,
  assertCastableSpell,
  assertNotSelfCast,
  assertValidAntiSpell,
  computeMagieExpiry,
  isMagieActive,
} from "../../policies/magies";
import { computeDebitBalance } from "../../policies/wallet";
import { emitMagieBroken, emitMagieCast } from "../../events";
import type { CastMagieDto } from "./magies.schemas";

// ============================================================
// DTOs
// ============================================================

export interface MagieCatalogDto {
  id: string;
  emoji: string;
  name: string;
  cost: number;
  durationSec: number;
  type: MagieCatalog["type"];
  breakConditionId: string | null;
}

export interface MagieCatalogResponse {
  spells: MagieCatalogDto[];
  antiSpells: MagieCatalogDto[];
}

export interface MagieCastDto {
  id: string;
  magieId: string;
  magie: MagieCatalogDto;
  fromUserId: string;
  toUserId: string;
  salonId: string | null;
  castAt: Date;
  expiresAt: Date;
  brokenAt: Date | null;
  brokenBy: string | null;
}

type MagieCastWithCatalog = MagieCast & { magie: MagieCatalog };

function toCatalogDto(c: MagieCatalog): MagieCatalogDto {
  return {
    id: c.id,
    emoji: c.emoji,
    name: c.name,
    cost: c.cost,
    durationSec: c.durationSec,
    type: c.type,
    breakConditionId: c.breakConditionId,
  };
}

function toCastDto(c: MagieCastWithCatalog): MagieCastDto {
  return {
    id: c.id,
    magieId: c.magieId,
    magie: toCatalogDto(c.magie),
    fromUserId: c.fromUserId,
    toUserId: c.toUserId,
    salonId: c.salonId,
    castAt: c.castAt,
    expiresAt: c.expiresAt,
    brokenAt: c.brokenAt,
    brokenBy: c.brokenBy,
  };
}

// ============================================================
// listCatalog — sorts + anti-sorts, séparés
// ============================================================
export async function listCatalog(): Promise<MagieCatalogResponse> {
  const rows = await prisma.magieCatalog.findMany({
    where: { enabled: true },
    orderBy: [{ type: "asc" }, { cost: "asc" }, { id: "asc" }],
  });

  const spells: MagieCatalogDto[] = [];
  const antiSpells: MagieCatalogDto[] = [];
  for (const r of rows) {
    const dto = toCatalogDto(r);
    if (r.durationSec > 0) spells.push(dto);
    else antiSpells.push(dto);
  }
  return { spells, antiSpells };
}

// ============================================================
// castSpell — lance un sort, débit atomique
// ============================================================
export async function castSpell(
  actorId: string,
  dto: CastMagieDto,
): Promise<MagieCastDto> {
  // 1. Sanity checks hors DB
  assertNotSelfCast(actorId, dto.toUserId);

  // 2. Catalog + cible + salon : lectures hors transaction pour éviter
  //    de polluer la transaction avec des reads longs
  const catalog = await prisma.magieCatalog.findUnique({
    where: { id: dto.magieId },
  });
  if (!catalog) throw new NotFoundError("Magie");
  assertCastableSpell(catalog); // throws BadRequest si disabled ou anti-sort

  const target = await prisma.user.findUnique({
    where: { id: dto.toUserId },
    select: { id: true, isBanned: true },
  });
  if (!target) throw new NotFoundError("Cible");
  if (target.isBanned) {
    throw new ForbiddenError("Impossible de caster sur un utilisateur banni");
  }

  if (dto.salonId !== undefined) {
    const salon = await prisma.salon.findUnique({
      where: { id: dto.salonId },
      select: { id: true, isActive: true },
    });
    if (!salon || !salon.isActive) {
      throw new NotFoundError("Salon");
    }
  }

  const now = new Date();
  const expiresAt = computeMagieExpiry(now, catalog.durationSec);

  // 3. Transaction atomique : débit wallet + CoinTransaction + MagieCast
  const result = await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({
      where: { userId: actorId },
    });
    if (!wallet) throw new NotFoundError("Wallet");

    // Pure : throws NotEnoughCoinsError si fonds insuffisants
    const newBalance = computeDebitBalance(wallet.coins, catalog.cost);

    await tx.wallet.update({
      where: { userId: actorId },
      data: { coins: newBalance },
    });

    await tx.coinTransaction.create({
      data: {
        walletId: actorId,
        type: CoinTxnType.POWER_USED,
        amount: -catalog.cost,
        balance: newBalance,
        meta: {
          magieId: catalog.id,
          toUserId: dto.toUserId,
          ...(dto.salonId !== undefined ? { salonId: dto.salonId } : {}),
        } as Prisma.InputJsonValue,
      },
    });

    const cast = await tx.magieCast.create({
      data: {
        magieId: catalog.id,
        fromUserId: actorId,
        toUserId: dto.toUserId,
        salonId: dto.salonId ?? null,
        castAt: now,
        expiresAt,
      },
      include: { magie: true },
    });

    return cast;
  });

  // Event émis après succès de la transaction — non bloquant
  emitMagieCast({
    magieCastId: result.id,
    magieId: catalog.id,
    fromUserId: actorId,
    toUserId: dto.toUserId,
    salonId: dto.salonId ?? null,
    expiresAt,
    cost: catalog.cost,
  });

  return toCastDto(result);
}

// ============================================================
// listActive — magies réellement actives ciblées sur un user
// ============================================================
export async function listActive(
  userId: string,
  now: Date = new Date(),
): Promise<MagieCastDto[]> {
  const rows = await prisma.magieCast.findMany({
    where: {
      toUserId: userId,
      brokenAt: null,
      expiresAt: { gt: now },
    },
    orderBy: [{ expiresAt: "asc" }, { id: "asc" }],
    include: { magie: true },
  });

  // Défense en profondeur : on refiltre avec la policy au cas où une
  // condition de course aurait laissé passer une cast obsolète.
  return rows
    .filter((r) => isMagieActive(r, now))
    .map(toCastDto);
}

// ============================================================
// breakMagie — casse un sort actif avec un anti-sort payant
// ============================================================
export async function breakMagie(
  actorId: string,
  castId: string,
  antiSpellId: string,
): Promise<MagieCastDto> {
  // 1. Lectures hors transaction
  const cast = await prisma.magieCast.findUnique({
    where: { id: castId },
    include: { magie: true },
  });
  if (!cast) throw new NotFoundError("Magie");

  const now = new Date();
  assertCanBreakMagie(cast, now);

  const antiSpell = await prisma.magieCatalog.findUnique({
    where: { id: antiSpellId },
  });
  if (!antiSpell) throw new NotFoundError("Anti-sort");
  assertValidAntiSpell(antiSpell);

  // L'anti-sort doit matcher la condition de rupture du sort
  assertAntiSpellBreaksCondition(cast.magie.breakConditionId, antiSpell.id);

  // 2. Transaction : débit wallet + txn + update magieCast
  const result = await prisma.$transaction(async (tx) => {
    // Re-check sous lock pour éviter double-break concurrent
    const fresh = await tx.magieCast.findUnique({
      where: { id: castId },
      select: { id: true, brokenAt: true, expiresAt: true },
    });
    if (!fresh) throw new NotFoundError("Magie");
    if (fresh.brokenAt !== null) {
      throw new BadRequestError("Cette magie vient d'être brisée");
    }
    if (fresh.expiresAt.getTime() <= now.getTime()) {
      throw new BadRequestError("Cette magie est déjà expirée");
    }

    const wallet = await tx.wallet.findUnique({
      where: { userId: actorId },
    });
    if (!wallet) throw new NotFoundError("Wallet");

    const newBalance = computeDebitBalance(wallet.coins, antiSpell.cost);

    await tx.wallet.update({
      where: { userId: actorId },
      data: { coins: newBalance },
    });

    await tx.coinTransaction.create({
      data: {
        walletId: actorId,
        type: CoinTxnType.POWER_USED,
        amount: -antiSpell.cost,
        balance: newBalance,
        meta: {
          antiSpellId: antiSpell.id,
          brokeCastId: castId,
        } as Prisma.InputJsonValue,
      },
    });

    const updated = await tx.magieCast.update({
      where: { id: castId },
      data: { brokenAt: now, brokenBy: actorId },
      include: { magie: true },
    });

    return updated;
  });

  // Event émis après succès de la transaction — non bloquant
  emitMagieBroken({
    magieCastId: castId,
    magieId: cast.magieId,
    antiSpellId: antiSpell.id,
    brokenBy: actorId,
    originalToUserId: cast.toUserId,
  });

  return toCastDto(result);
}

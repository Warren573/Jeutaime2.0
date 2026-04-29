import { CardGameStatus, CoinTxnType, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnprocessableError,
} from "../../core/errors";
import { computeDebitBalance, computeCreditBalance } from "../../policies/wallet";
import {
  buildDeck,
  applyCardEffect,
  computeStartHint,
  countHiddenHearts,
  isCardRevealed,
  markCardRevealed,
  areAllCardsRevealed,
  ENTRY_COST,
  SESSION_TTL_MS,
  DeckCard,
  CardEffect,
  GameStartHint,
} from "../../policies/cardGame";

// ── DTOs de sortie ────────────────────────────────────────────────────────────

export interface StartResult {
  sessionId: string;
  hint: GameStartHint;
  expiresAt: Date;
}

export interface RevealResult {
  cardIndex: number;
  effect: CardEffect;
  gainsCurrent: number;
}

export interface ClaimResult {
  gained: number;
  newBalance: number;
}

export interface BetResult {
  heartsRemaining: number;
  won: boolean;
  gained: number;
  newBalance: number;
}

export interface HistoryItem {
  id: string;
  status: CardGameStatus;
  gainsCurrent: number;
  claimedAmount: number | null;
  entryAmount: number;
  expiresAt: Date;
  claimedAt: Date | null;
  createdAt: Date;
}

// ── Helpers internes ─────────────────────────────────────────────────────────

function parseDeck(raw: Prisma.JsonValue): DeckCard[] {
  if (!Array.isArray(raw)) throw new UnprocessableError("Deck corrompu");
  return raw as unknown as DeckCard[];
}

async function loadActiveSession(sessionId: string, userId: string) {
  const session = await prisma.cardGameSession.findUnique({
    where: { id: sessionId },
  });
  if (!session) throw new NotFoundError("Session de jeu");
  if (session.userId !== userId) throw new ForbiddenError();
  if (session.status === CardGameStatus.EXPIRED)
    throw new UnprocessableError("Cette session a expiré");
  if (session.status === CardGameStatus.CLAIMED)
    throw new UnprocessableError("Les gains ont déjà été réclamés");
  // Expiration on-the-fly si pas encore passée par le job
  if (session.expiresAt <= new Date()) {
    await prisma.cardGameSession.update({
      where: { id: sessionId },
      data: { status: CardGameStatus.EXPIRED },
    });
    throw new UnprocessableError("Cette session a expiré");
  }
  return session;
}

// ── start ─────────────────────────────────────────────────────────────────────

export async function start(userId: string): Promise<StartResult> {
  return prisma.$transaction(async (tx) => {
    // Empêcher deux sessions ACTIVE simultanées — renvoie l'existante
    const existing = await tx.cardGameSession.findFirst({
      where: { userId, status: CardGameStatus.ACTIVE },
      orderBy: { createdAt: "desc" },
    });

    if (existing && existing.expiresAt > new Date()) {
      const deck = parseDeck(existing.deck);
      return {
        sessionId: existing.id,
        hint: computeStartHint(deck),
        expiresAt: existing.expiresAt,
      };
    }

    // Débiter le coût d'entrée
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundError("Wallet");

    const newBalance = computeDebitBalance(wallet.coins, ENTRY_COST);

    await tx.wallet.update({
      where: { userId },
      data: { coins: newBalance },
    });

    await tx.coinTransaction.create({
      data: {
        walletId: userId,
        type: CoinTxnType.GAME_ENTRY,
        amount: -ENTRY_COST,
        balance: newBalance,
        meta: { game: "card-game" } as Prisma.InputJsonValue,
      },
    });

    // Générer le deck et créer la session
    const deck = buildDeck();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    const session = await tx.cardGameSession.create({
      data: {
        userId,
        deck: deck as unknown as Prisma.InputJsonValue,
        expiresAt,
      },
    });

    return {
      sessionId: session.id,
      hint: computeStartHint(deck),
      expiresAt,
    };
  });
}

// ── reveal ────────────────────────────────────────────────────────────────────

export async function reveal(
  userId: string,
  sessionId: string,
  cardIndex: number,
): Promise<RevealResult> {
  return prisma.$transaction(async (tx) => {
    const session = await loadActiveSession(sessionId, userId);
    const deck = parseDeck(session.deck);

    if (isCardRevealed(session.revealed, cardIndex)) {
      throw new BadRequestError("Cette carte a déjà été révélée");
    }

    const card = deck[cardIndex];
    if (!card) throw new BadRequestError("Index de carte invalide");

    const newRevealed = markCardRevealed(session.revealed, cardIndex);
    const effect = applyCardEffect(card.suit, session.gainsCurrent, newRevealed, deck);

    await tx.cardGameSession.update({
      where: { id: sessionId },
      data: {
        revealed: newRevealed,
        gainsCurrent: effect.newGains,
      },
    });

    return { cardIndex, effect, gainsCurrent: effect.newGains };
  });
}

// ── claim ─────────────────────────────────────────────────────────────────────

export async function claim(
  userId: string,
  sessionId: string,
): Promise<ClaimResult> {
  return prisma.$transaction(async (tx) => {
    const session = await loadActiveSession(sessionId, userId);

    const gained = session.gainsCurrent;
    let newBalance: number;

    if (gained > 0) {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new NotFoundError("Wallet");

      newBalance = computeCreditBalance(wallet.coins, gained);

      await tx.wallet.update({ where: { userId }, data: { coins: newBalance } });

      await tx.coinTransaction.create({
        data: {
          walletId: userId,
          type: CoinTxnType.GAME_WIN,
          amount: gained,
          balance: newBalance,
          meta: { game: "card-game", sessionId } as Prisma.InputJsonValue,
        },
      });
    } else {
      const wallet = await tx.wallet.findUnique({ where: { userId }, select: { coins: true } });
      newBalance = wallet?.coins ?? 0;
    }

    await tx.cardGameSession.update({
      where: { id: sessionId },
      data: {
        status: CardGameStatus.CLAIMED,
        claimedAmount: gained,
        claimedAt: new Date(),
      },
    });

    return { gained, newBalance };
  });
}

// ── bet ───────────────────────────────────────────────────────────────────────

export async function bet(
  userId: string,
  sessionId: string,
): Promise<BetResult> {
  return prisma.$transaction(async (tx) => {
    const session = await loadActiveSession(sessionId, userId);
    const deck = parseDeck(session.deck);

    const heartsRemaining = countHiddenHearts(deck, session.revealed);
    const won = heartsRemaining === 0;
    const gained = won ? session.gainsCurrent : 0;
    let newBalance: number;

    if (gained > 0) {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new NotFoundError("Wallet");

      newBalance = computeCreditBalance(wallet.coins, gained);

      await tx.wallet.update({ where: { userId }, data: { coins: newBalance } });

      await tx.coinTransaction.create({
        data: {
          walletId: userId,
          type: CoinTxnType.GAME_WIN,
          amount: gained,
          balance: newBalance,
          meta: { game: "card-game", sessionId, bet: true } as Prisma.InputJsonValue,
        },
      });
    } else {
      const wallet = await tx.wallet.findUnique({ where: { userId }, select: { coins: true } });
      newBalance = wallet?.coins ?? 0;
    }

    await tx.cardGameSession.update({
      where: { id: sessionId },
      data: {
        status: CardGameStatus.CLAIMED,
        claimedAmount: gained,
        claimedAt: new Date(),
      },
    });

    return { heartsRemaining, won, gained, newBalance };
  });
}

// ── history ───────────────────────────────────────────────────────────────────

export async function history(userId: string): Promise<HistoryItem[]> {
  const sessions = await prisma.cardGameSession.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      status: true,
      gainsCurrent: true,
      claimedAmount: true,
      entryAmount: true,
      expiresAt: true,
      claimedAt: true,
      createdAt: true,
    },
  });
  return sessions;
}

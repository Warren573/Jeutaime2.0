import { describe, it, expect, beforeEach, vi } from "vitest";
import { BadRequestError, ConflictError } from "../../src/core/errors";

vi.mock("../../src/config/prisma", () => {
  const prismaMock: any = {
    user: { findMany: vi.fn() },
    weeklyProfileVote: {
      count: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      groupBy: vi.fn(),
    },
    wallet: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    coinTransaction: { create: vi.fn() },
  };
  prismaMock.$transaction = vi.fn(async (fn: (tx: unknown) => unknown) => fn(prismaMock));
  return { prisma: prismaMock };
});

import { prisma } from "../../src/config/prisma";
import {
  getWeekKey,
  getWeeklyProfileState,
  voteForDuel,
  getWeeklyProfileWinners,
} from "../../src/modules/weekly-profile/weekly-profile.service";

const birthDate = new Date("1995-06-15T00:00:00.000Z");

function eligibleUser(id: string, gender: "HOMME" | "FEMME" = "HOMME") {
  return {
    id,
    profile: { pseudo: `pseudo-${id}`, city: "Lyon", bio: `bio-${id}`, gender, birthDate },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  (prisma.weeklyProfileVote.findMany as any).mockResolvedValue([]);
  (prisma.weeklyProfileVote.groupBy as any).mockResolvedValue([]);
});

// ============================================================
// getWeekKey — semaine ISO
// ============================================================
describe("getWeekKey", () => {
  it("retourne le format AAAA-Wxx", () => {
    expect(getWeekKey(new Date("2026-07-27T12:00:00Z"))).toMatch(/^\d{4}-W\d{2}$/);
  });

  it("lundi et dimanche de la même semaine ISO partagent la même clé", () => {
    const monday = getWeekKey(new Date("2026-07-27T00:00:00Z"));
    const sunday = getWeekKey(new Date("2026-08-02T23:59:59Z"));
    expect(monday).toBe(sunday);
  });

  it("le lundi suivant change de clé", () => {
    const thisWeek = getWeekKey(new Date("2026-07-27T00:00:00Z"));
    const nextWeek = getWeekKey(new Date("2026-08-03T00:00:00Z"));
    expect(nextWeek).not.toBe(thisWeek);
  });
});

// ============================================================
// getWeeklyProfileState — limite quotidienne + sélection de duel
// ============================================================
describe("getWeeklyProfileState", () => {
  it("limite gratuite (10) atteinte → duel null, aucune requête de sélection", async () => {
    (prisma.weeklyProfileVote.count as any).mockResolvedValue(10);

    const state = await getWeeklyProfileState("voter-1", false);

    expect(state).toEqual({
      remainingToday: 0,
      dailyLimit: 10,
      limitReached: true,
      notEnoughCandidates: false,
      duel: null,
    });
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it("limite Premium (20) : 19 votes déjà faits → il en reste 1", async () => {
    (prisma.weeklyProfileVote.count as any).mockResolvedValue(19);
    (prisma.user.findMany as any).mockResolvedValue([eligibleUser("a"), eligibleUser("b")]);

    const state = await getWeeklyProfileState("voter-1", true);

    expect(state.dailyLimit).toBe(20);
    expect(state.remainingToday).toBe(1);
    expect(state.limitReached).toBe(false);
  });

  it("moins de 2 profils éligibles → notEnoughCandidates=true, duel=null", async () => {
    (prisma.weeklyProfileVote.count as any).mockResolvedValue(0);
    (prisma.user.findMany as any).mockResolvedValue([eligibleUser("a")]);

    const state = await getWeeklyProfileState("voter-1", false);

    expect(state.notEnoughCandidates).toBe(true);
    expect(state.duel).toBeNull();
  });

  it("2 profils éligibles → duel composé des deux, jamais le votant", async () => {
    (prisma.weeklyProfileVote.count as any).mockResolvedValue(0);
    (prisma.user.findMany as any).mockResolvedValue([eligibleUser("a"), eligibleUser("b")]);

    const state = await getWeeklyProfileState("voter-1", false);

    expect(state.duel).not.toBeNull();
    const ids = [state.duel!.candidateA.id, state.duel!.candidateB.id].sort();
    expect(ids).toEqual(["a", "b"]);
    expect(ids).not.toContain("voter-1");
  });
});

// ============================================================
// voteForDuel — validations + attribution des pièces
// ============================================================
describe("voteForDuel", () => {
  beforeEach(() => {
    (prisma.weeklyProfileVote.count as any).mockResolvedValue(0);
    (prisma.user.findMany as any).mockResolvedValue([eligibleUser("a"), eligibleUser("b")]);
    (prisma.wallet.findUnique as any).mockResolvedValue({ userId: "voter-1", coins: 100 });
  });

  it("rejette un duel avec deux fois le même profil", async () => {
    await expect(voteForDuel("voter-1", false, "a", "a", "a")).rejects.toBeInstanceOf(BadRequestError);
  });

  it("rejette un chosenId hors du duel", async () => {
    await expect(voteForDuel("voter-1", false, "a", "b", "c")).rejects.toBeInstanceOf(BadRequestError);
  });

  it("rejette un vote pour soi-même", async () => {
    await expect(voteForDuel("voter-1", false, "voter-1", "b", "voter-1")).rejects.toBeInstanceOf(BadRequestError);
  });

  it("rejette le vote si la limite quotidienne est déjà atteinte", async () => {
    (prisma.weeklyProfileVote.count as any).mockResolvedValue(10);
    await expect(voteForDuel("voter-1", false, "a", "b", "a")).rejects.toBeInstanceOf(ConflictError);
  });

  it("vote valide : crédite +5 pièces et enregistre le duel", async () => {
    const result = await voteForDuel("voter-1", false, "a", "b", "a");

    expect(prisma.weeklyProfileVote.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        voterId: "voter-1",
        candidateAId: "a",
        candidateBId: "b",
        chosenId: "a",
      }),
    });
    expect(prisma.wallet.update).toHaveBeenCalledWith({
      where: { userId: "voter-1" },
      data: { coins: 105 },
    });
    expect(prisma.coinTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amount: 5, balance: 105, type: "WEEKLY_PROFILE_VOTE" }),
      }),
    );
    // Renvoie l'état à jour (nouveau duel chargé immédiatement)
    expect(result.duel).not.toBeNull();
  });
});

// ============================================================
// getWeeklyProfileWinners — élection hebdomadaire par genre
// ============================================================
describe("getWeeklyProfileWinners", () => {
  it("aucun vote la semaine passée → pas de gagnant·e", async () => {
    (prisma.weeklyProfileVote.groupBy as any).mockResolvedValue([]);

    const winners = await getWeeklyProfileWinners();

    expect(winners.male).toBeNull();
    expect(winners.female).toBeNull();
  });

  it("élit le profil le plus voté par genre", async () => {
    (prisma.weeklyProfileVote.groupBy as any).mockResolvedValue([
      { chosenId: "w1", _count: { chosenId: 5 } },
      { chosenId: "w2", _count: { chosenId: 3 } },
      { chosenId: "m1", _count: { chosenId: 7 } },
    ]);
    (prisma.user.findMany as any).mockResolvedValue([
      eligibleUser("w1", "FEMME"),
      eligibleUser("w2", "FEMME"),
      eligibleUser("m1", "HOMME"),
    ]);

    const winners = await getWeeklyProfileWinners();

    expect(winners.female?.id).toBe("w1");
    expect(winners.female?.totalVotes).toBe(5);
    expect(winners.male?.id).toBe("m1");
    expect(winners.male?.totalVotes).toBe(7);
  });
});

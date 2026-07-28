import { describe, it, expect, beforeEach, vi } from "vitest";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../../src/core/errors";

vi.mock("../../src/config/prisma", () => {
  const prismaMock: any = {
    user: { findMany: vi.fn(), findUnique: vi.fn() },
    block: { findMany: vi.fn() },
    weeklyProfileDuel: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
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

// Bio de 60 mots — computeProfileStatus exige >= 50 mots pour isComplete.
const LONG_BIO = Array(60).fill("mot").join(" ");
const birthDate = new Date("1995-06-15T00:00:00.000Z");

function fullProfile(overrides: Record<string, unknown> = {}) {
  return {
    pseudo: "pseudo",
    city: "Lyon",
    bio: LONG_BIO,
    gender: "HOMME",
    birthDate,
    interestedIn: ["FEMME"],
    lookingFor: ["RELATION_SERIEUSE"],
    physicalDesc: "grand brun",
    height: 180,
    vibe: "vibe",
    quote: "quote",
    questions: [{ id: "q1" }, { id: "q2" }, { id: "q3" }],
    ...overrides,
  };
}

function eligibleUser(id: string, overrides: Record<string, unknown> = {}) {
  const { gender, ...profileOverrides } = overrides;
  return {
    id,
    isBanned: false,
    settings: { showInDiscovery: true },
    profile: fullProfile({ ...(gender ? { gender } : {}), ...profileOverrides }),
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  (prisma.$transaction as any) = vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma));
  (prisma.block.findMany as any).mockResolvedValue([]);
  (prisma.weeklyProfileDuel.findMany as any).mockResolvedValue([]);
  (prisma.weeklyProfileDuel.groupBy as any).mockResolvedValue([]);
  (prisma.weeklyProfileDuel.findFirst as any).mockResolvedValue(null);
  (prisma.weeklyProfileDuel.create as any).mockImplementation(async ({ data }: any) => ({
    id: "new-duel",
    ...data,
    usedAt: null,
    chosenId: null,
    weekKey: null,
    dayKey: null,
  }));
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
});

// ============================================================
// Sélection de duel — éligibilité, historique, équilibrage
// ============================================================
describe("getWeeklyProfileState — sélection de duel", () => {
  it("limite gratuite (10) atteinte → duel null, aucune sélection déclenchée", async () => {
    (prisma.weeklyProfileDuel.count as any).mockResolvedValue(10);

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

  it("exclut les profils à bio vide et les profils incomplets", async () => {
    (prisma.weeklyProfileDuel.count as any).mockResolvedValue(0);
    (prisma.user.findMany as any).mockResolvedValue([
      eligibleUser("ok-1"),
      eligibleUser("ok-2"),
      eligibleUser("bio-vide", { bio: "" }),
      eligibleUser("incomplet", { questions: [] }),
    ]);

    const state = await getWeeklyProfileState("voter-1", false);

    expect(state.duel).not.toBeNull();
    const ids = [state.duel!.candidateA.id, state.duel!.candidateB.id];
    expect(ids.sort()).toEqual(["ok-1", "ok-2"]);
  });

  it("priorité aux profils jamais vus par ce votant", async () => {
    (prisma.weeklyProfileDuel.count as any).mockResolvedValue(0);
    (prisma.user.findMany as any).mockResolvedValue([
      eligibleUser("seen-a"),
      eligibleUser("unseen-b"),
      eligibleUser("unseen-c"),
    ]);
    // "seen-a" a déjà été montré au votant (peu importe avec qui)
    (prisma.weeklyProfileDuel.findMany as any).mockResolvedValue([
      { candidateAId: "seen-a", candidateBId: "someone-else" },
    ]);

    const state = await getWeeklyProfileState("voter-1", false);

    const ids = [state.duel!.candidateA.id, state.duel!.candidateB.id].sort();
    expect(ids).toEqual(["unseen-b", "unseen-c"]);
  });

  it("répétition d'une paire déjà vue seulement en dernier recours", async () => {
    (prisma.weeklyProfileDuel.count as any).mockResolvedValue(0);
    (prisma.user.findMany as any).mockResolvedValue([eligibleUser("a"), eligibleUser("b")]);
    (prisma.weeklyProfileDuel.findMany as any).mockResolvedValue([
      { candidateAId: "a", candidateBId: "b" },
    ]);

    const state = await getWeeklyProfileState("voter-1", false);

    // Seuls 2 profils éligibles existent et leur paire a déjà été montrée :
    // on la reprend plutôt que de ne rien proposer.
    expect(state.duel).not.toBeNull();
    expect(state.notEnoughCandidates).toBe(false);
  });

  it("réutilise un duel en attente non expiré plutôt que d'en générer un nouveau", async () => {
    (prisma.weeklyProfileDuel.count as any).mockResolvedValue(0);
    (prisma.weeklyProfileDuel.findFirst as any).mockResolvedValue({
      id: "pending-1",
      candidateAId: "a",
      candidateBId: "b",
    });
    (prisma.user.findUnique as any).mockImplementation(async ({ where }: any) => ({
      profile: { pseudo: `pseudo-${where.id}`, city: "Lyon", bio: LONG_BIO, birthDate },
    }));

    const state = await getWeeklyProfileState("voter-1", false);

    expect(state.duel?.duelId).toBe("pending-1");
    expect(prisma.weeklyProfileDuel.create).not.toHaveBeenCalled();
  });
});

// ============================================================
// voteForDuel — validation du ticket serveur
// ============================================================
describe("voteForDuel", () => {
  const validDuel = {
    id: "duel-1",
    userId: "voter-1",
    candidateAId: "a",
    candidateBId: "b",
    usedAt: null,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  };

  beforeEach(() => {
    (prisma.weeklyProfileDuel.count as any).mockResolvedValue(0);
    (prisma.wallet.findUnique as any).mockResolvedValue({ userId: "voter-1", coins: 100 });
    (prisma.weeklyProfileDuel.updateMany as any).mockResolvedValue({ count: 1 });
  });

  it("duel inexistant → NotFoundError", async () => {
    (prisma.weeklyProfileDuel.findUnique as any).mockResolvedValue(null);
    await expect(voteForDuel("voter-1", false, "ghost", "a")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("duel appartenant à un autre utilisateur → ForbiddenError", async () => {
    (prisma.weeklyProfileDuel.findUnique as any).mockResolvedValue({ ...validDuel, userId: "someone-else" });
    await expect(voteForDuel("voter-1", false, "duel-1", "a")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("duel déjà utilisé → ConflictError", async () => {
    (prisma.weeklyProfileDuel.findUnique as any).mockResolvedValue({ ...validDuel, usedAt: new Date() });
    await expect(voteForDuel("voter-1", false, "duel-1", "a")).rejects.toBeInstanceOf(ConflictError);
  });

  it("duel expiré → ConflictError", async () => {
    (prisma.weeklyProfileDuel.findUnique as any).mockResolvedValue({
      ...validDuel,
      expiresAt: new Date(Date.now() - 60 * 1000),
    });
    await expect(voteForDuel("voter-1", false, "duel-1", "a")).rejects.toBeInstanceOf(ConflictError);
  });

  it("chosenId falsifié (hors des 2 candidats réellement stockés) → BadRequestError", async () => {
    // Le payload ne contient plus candidateAId/candidateBId : impossible de les
    // falsifier. On vérifie ici que le serveur relit bien les vrais candidats
    // depuis la table et rejette un chosenId qui ne fait pas partie du duel.
    (prisma.weeklyProfileDuel.findUnique as any).mockResolvedValue(validDuel);
    await expect(voteForDuel("voter-1", false, "duel-1", "un-autre-user-invente")).rejects.toBeInstanceOf(
      BadRequestError,
    );
    expect(prisma.weeklyProfileDuel.updateMany).not.toHaveBeenCalled();
  });

  it("double requête simultanée sur le même duel → la 2e échoue (garde atomique)", async () => {
    (prisma.weeklyProfileDuel.findUnique as any).mockResolvedValue(validDuel);
    // La lecture voit encore usedAt:null (race), mais l'update atomique
    // n'affecte 0 ligne car l'autre requête a déjà consommé le duel.
    (prisma.weeklyProfileDuel.updateMany as any).mockResolvedValue({ count: 0 });

    await expect(voteForDuel("voter-1", false, "duel-1", "a")).rejects.toBeInstanceOf(ConflictError);
    expect(prisma.wallet.update).not.toHaveBeenCalled();
    expect(prisma.coinTransaction.create).not.toHaveBeenCalled();
  });

  it("limite quotidienne déjà atteinte → ConflictError, duel non consommé", async () => {
    (prisma.weeklyProfileDuel.findUnique as any).mockResolvedValue(validDuel);
    (prisma.weeklyProfileDuel.count as any).mockResolvedValue(10);
    await expect(voteForDuel("voter-1", false, "duel-1", "a")).rejects.toBeInstanceOf(ConflictError);
    expect(prisma.weeklyProfileDuel.updateMany).not.toHaveBeenCalled();
  });

  it("transaction annulée si le crédit de pièces échoue", async () => {
    (prisma.weeklyProfileDuel.findUnique as any).mockResolvedValue(validDuel);
    (prisma.wallet.update as any).mockRejectedValue(new Error("DB down"));

    await expect(voteForDuel("voter-1", false, "duel-1", "a")).rejects.toThrow("DB down");
    // Le crédit de pièces (étape suivante dans la même transaction) n'a
    // jamais eu lieu — la transaction entière est annulée.
    expect(prisma.coinTransaction.create).not.toHaveBeenCalled();
  });

  it("vote valide : marque le duel utilisé et crédite +5 pièces dans la même transaction", async () => {
    (prisma.weeklyProfileDuel.findUnique as any).mockResolvedValue(validDuel);
    (prisma.user.findMany as any).mockResolvedValue([eligibleUser("a"), eligibleUser("b")]);

    const result = await voteForDuel("voter-1", false, "duel-1", "a");

    expect(prisma.weeklyProfileDuel.updateMany).toHaveBeenCalledWith({
      where: { id: "duel-1", usedAt: null },
      data: expect.objectContaining({ chosenId: "a" }),
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
    expect(result.duel).not.toBeNull();
  });
});

// ============================================================
// getWeeklyProfileWinners — élection hebdomadaire + cas limites
// ============================================================
describe("getWeeklyProfileWinners", () => {
  it("aucun vote la semaine passée → pas de gagnant·e", async () => {
    (prisma.weeklyProfileDuel.findMany as any).mockResolvedValue([]);
    const winners = await getWeeklyProfileWinners();
    expect(winners.male).toBeNull();
    expect(winners.female).toBeNull();
  });

  it("aucun candidat éligible dans un genre → aucun gagnant pour ce genre", async () => {
    (prisma.weeklyProfileDuel.findMany as any).mockResolvedValue([
      { chosenId: "w1", candidateAId: "w1", candidateBId: "m1", usedAt: new Date() },
    ]);
    // m1 (HOMME) devenu banni depuis → plus aucun candidat HOMME éligible
    (prisma.user.findMany as any).mockResolvedValue([
      eligibleUser("w1", { gender: "FEMME" }),
      { ...eligibleUser("m1", { gender: "HOMME" }), isBanned: true },
    ]);

    const winners = await getWeeklyProfileWinners();
    expect(winners.male).toBeNull();
    expect(winners.female?.id).toBe("w1");
  });

  it("un seul candidat éligible dans un genre : gagne s'il a au moins un vote", async () => {
    (prisma.weeklyProfileDuel.findMany as any).mockResolvedValue([
      { chosenId: "m1", candidateAId: "m1", candidateBId: "w1", usedAt: new Date() },
    ]);
    (prisma.user.findMany as any).mockResolvedValue([
      eligibleUser("w1", { gender: "FEMME" }),
      eligibleUser("m1", { gender: "HOMME" }),
    ]);

    const winners = await getWeeklyProfileWinners();
    expect(winners.male?.id).toBe("m1");
    expect(winners.male?.totalVotes).toBe(1);
  });

  it("un seul candidat éligible dans un genre mais 0 vote reçu → aucun gagnant", async () => {
    (prisma.weeklyProfileDuel.findMany as any).mockResolvedValue([
      { chosenId: "w1", candidateAId: "w1", candidateBId: "m1", usedAt: new Date() },
    ]);
    (prisma.user.findMany as any).mockResolvedValue([
      eligibleUser("w1", { gender: "FEMME" }),
      eligibleUser("m1", { gender: "HOMME" }), // seul HOMME éligible, jamais choisi
    ]);

    const winners = await getWeeklyProfileWinners();
    expect(winners.male).toBeNull();
  });

  it("zéro vote pour tous les candidats éligibles d'un genre → aucun gagnant pour ce genre", async () => {
    // Tous les votes de la semaine ont désigné des FEMME ; les HOMME
    // participants n'ont jamais été choisis (0 vote chacun).
    (prisma.weeklyProfileDuel.findMany as any).mockResolvedValue([
      { chosenId: "w1", candidateAId: "w1", candidateBId: "m1", usedAt: new Date() },
      { chosenId: "w1", candidateAId: "w1", candidateBId: "m2", usedAt: new Date() },
    ]);
    (prisma.user.findMany as any).mockResolvedValue([
      eligibleUser("w1", { gender: "FEMME" }),
      eligibleUser("m1", { gender: "HOMME" }),
      eligibleUser("m2", { gender: "HOMME" }),
    ]);

    const winners = await getWeeklyProfileWinners();
    expect(winners.male).toBeNull();
    expect(winners.female?.id).toBe("w1");
  });

  it("égalité → départagée par le nombre de duels gagnés face à face", async () => {
    const t = (min: number) => new Date(Date.UTC(2026, 6, 20, 0, min));
    (prisma.weeklyProfileDuel.findMany as any).mockResolvedValue([
      // X bat Y deux fois en face à face
      { chosenId: "x", candidateAId: "x", candidateBId: "y", usedAt: t(1) },
      { chosenId: "x", candidateAId: "x", candidateBId: "y", usedAt: t(2) },
      // Y égalise son total (2) contre un tiers, jamais face à X
      { chosenId: "y", candidateAId: "y", candidateBId: "z", usedAt: t(3) },
      { chosenId: "y", candidateAId: "y", candidateBId: "z", usedAt: t(4) },
    ]);
    (prisma.user.findMany as any).mockResolvedValue([
      eligibleUser("x", { gender: "HOMME" }),
      eligibleUser("y", { gender: "HOMME" }),
      eligibleUser("z", { gender: "HOMME" }),
    ]);

    const winners = await getWeeklyProfileWinners();
    expect(winners.male?.id).toBe("x");
    expect(winners.male?.totalVotes).toBe(2);
  });

  it("égalité totale (y compris face à face) → départagée par celui qui a atteint le score en premier", async () => {
    const t = (min: number) => new Date(Date.UTC(2026, 6, 20, 0, min));
    (prisma.weeklyProfileDuel.findMany as any).mockResolvedValue([
      { chosenId: "p", candidateAId: "p", candidateBId: "z1", usedAt: t(1) },
      { chosenId: "p", candidateAId: "p", candidateBId: "z2", usedAt: t(3) }, // p atteint 2 votes à t=3
      { chosenId: "q", candidateAId: "q", candidateBId: "z3", usedAt: t(2) },
      { chosenId: "q", candidateAId: "q", candidateBId: "z4", usedAt: t(5) }, // q atteint 2 votes à t=5
    ]);
    (prisma.user.findMany as any).mockResolvedValue([
      eligibleUser("p", { gender: "FEMME" }),
      eligibleUser("q", { gender: "FEMME" }),
      eligibleUser("z1", { gender: "HOMME" }),
      eligibleUser("z2", { gender: "HOMME" }),
      eligibleUser("z3", { gender: "HOMME" }),
      eligibleUser("z4", { gender: "HOMME" }),
    ]);

    const winners = await getWeeklyProfileWinners();
    expect(winners.female?.id).toBe("p");
  });

  it("égalité persistante jusqu'au bout → départage déterministe par identifiant", async () => {
    const sameTime = new Date(Date.UTC(2026, 6, 20, 0, 0));
    (prisma.weeklyProfileDuel.findMany as any).mockResolvedValue([
      // Ordre volontairement inversé : "candB" apparaît avant "candA" pour
      // prouver que le départage vient bien de l'id, pas de l'ordre reçu.
      { chosenId: "candB", candidateAId: "candB", candidateBId: "other2", usedAt: sameTime },
      { chosenId: "candA", candidateAId: "candA", candidateBId: "other1", usedAt: sameTime },
    ]);
    (prisma.user.findMany as any).mockResolvedValue([
      eligibleUser("candA", { gender: "HOMME" }),
      eligibleUser("candB", { gender: "HOMME" }),
      eligibleUser("other1", { gender: "HOMME" }),
      eligibleUser("other2", { gender: "HOMME" }),
    ]);

    const winners = await getWeeklyProfileWinners();
    expect(winners.male?.id).toBe("candA");
  });
});

import { describe, it, expect, beforeEach, vi } from "vitest";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../../src/core/errors";

// Mock the Prisma module with factory function to avoid hoisting issues
vi.mock("../../src/config/prisma", () => {
  const prismaMock: any = {
    user: {
      findUnique: vi.fn(),
    },
    refugeSession: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
    },
    refugeDailyChoice: {
      findUnique: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    refugeGuess: {
      findUnique: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    refugeDayResult: {
      create: vi.fn(),
      count: vi.fn(),
    },
    wallet: {
      upsert: vi.fn(),
      update: vi.fn(),
    },
    coinTransaction: {
      create: vi.fn(),
    },
    reaction: {
      findUnique: vi.fn(),
    },
    match: {
      findFirst: vi.fn(),
    },
  };
  // Les transactions interactives reçoivent le client mocké lui-même
  prismaMock.$transaction = vi.fn(async (ops: unknown) => {
    if (Array.isArray(ops)) return Promise.all(ops);
    return (ops as (tx: unknown) => unknown)(prismaMock);
  });
  return { prisma: prismaMock };
});

import { RefugeService } from "../../src/modules/refuge/refuge.service";
import { prisma } from "../../src/config/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;

const adopteId = "user-adopte";
const adoptantId = "user-adoptant";
const sessionId = "refuge-1";

function activeSession(overrides: Record<string, unknown> = {}) {
  const startedAt = new Date(Date.now() - 2 * 60 * 60 * 1000); // started 2h ago → day 1
  return {
    id: sessionId,
    adopteId,
    adoptantId,
    animalType: "CHAT",
    animalCategory: "SIMPLE",
    animalSexe: "MALE",
    animalAgeMonths: 24,
    acceptedSexe: "HOMME_FEMME",
    status: "ACTIVE",
    createdAt: new Date(startedAt.getTime() - DAY_MS),
    startedAt,
    endsAt: new Date(startedAt.getTime() + 7 * DAY_MS),
    preexistingLinkType: null,
    background: "FORET",
    lastAdopteActivityAt: startedAt,
    lastAdoptantActivityAt: startedAt,
    adopteRevealDecision: null,
    adoptantRevealDecision: null,
    revealedAt: null,
    dailyChoices: [],
    guesses: [],
    dayResults: [],
    ...overrides,
  };
}

// Session ACTIVE arrivée au jour 7, tentative du jour 7 jouée → phase finale atteinte
function day7DoneSession(overrides: Record<string, unknown> = {}) {
  const startedAt = new Date(Date.now() - 6 * DAY_MS - 2 * 60 * 60 * 1000); // jour 7
  return activeSession({
    startedAt,
    endsAt: new Date(startedAt.getTime() + 7 * DAY_MS),
    dailyChoices: [{ dayNumber: 7, action1: "NOURRIR", action2: "JOUER" }],
    guesses: [{ dayNumber: 7, guessedAction1: "NOURRIR", guessedAction2: "JOUER" }],
    ...overrides,
  });
}

function waitingSession(overrides: Record<string, unknown> = {}) {
  return activeSession({
    adoptantId: null,
    status: "WAITING_FOR_ADOPTANT",
    startedAt: null,
    endsAt: new Date(Date.now() + 7 * DAY_MS),
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // mockReset retire les mockImplementation posées par certains tests (devSetDay)
  // qui sinon fuiraient dans les tests suivants une fois les Once épuisés.
  (prisma.refugeSession.findUnique as any).mockReset();
  (prisma.refugeSession.update as any).mockReset();
  // Ledger : le wallet mocké répond par défaut (les tests vérifient les appels)
  (prisma.wallet.upsert as any).mockResolvedValue({ userId: "u", coins: 100 });
  (prisma.wallet.update as any).mockResolvedValue({});
  (prisma.coinTransaction.create as any).mockResolvedValue({});
});

// ============================================================
// proposeAsAdopte
// ============================================================

describe("RefugeService.proposeAsAdopte", () => {
  const input = { animalType: "CHAT", acceptedSexe: "HOMME_FEMME" } as any;

  it("rejects when the user does not exist", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce(null);
    await expect(RefugeService.proposeAsAdopte(adopteId, input)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects when the Adopté already has an open refuge", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce({ id: adopteId });
    (prisma.refugeSession.findFirst as any).mockResolvedValueOnce(waitingSession());
    await expect(RefugeService.proposeAsAdopte(adopteId, input)).rejects.toBeInstanceOf(ConflictError);
    expect(prisma.refugeSession.create).not.toHaveBeenCalled();
  });

  it("creates a WAITING_FOR_ADOPTANT session", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce({ id: adopteId });
    (prisma.refugeSession.findFirst as any).mockResolvedValueOnce(null);
    (prisma.refugeSession.create as any).mockResolvedValueOnce(waitingSession());
    (prisma.refugeSession.count as any).mockResolvedValueOnce(0);

    const dto = await RefugeService.proposeAsAdopte(adopteId, input);

    expect(dto.status).toBe("WAITING_FOR_ADOPTANT");
    expect(prisma.refugeSession.create).toHaveBeenCalledOnce();
    const createArgs = (prisma.refugeSession.create as any).mock.calls[0][0];
    expect(createArgs.data.status).toBe("WAITING_FOR_ADOPTANT");
    expect(createArgs.data.endsAt).toBeInstanceOf(Date);
  });

  it("rolls back its own creation when a concurrent request created another open refuge", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce({ id: adopteId });
    (prisma.refugeSession.findFirst as any).mockResolvedValueOnce(null);
    (prisma.refugeSession.create as any).mockResolvedValueOnce(waitingSession({ id: "refuge-dup" }));
    (prisma.refugeSession.count as any).mockResolvedValueOnce(1);
    (prisma.refugeSession.delete as any).mockResolvedValueOnce({});

    await expect(RefugeService.proposeAsAdopte(adopteId, input)).rejects.toBeInstanceOf(ConflictError);
    expect(prisma.refugeSession.delete).toHaveBeenCalledWith({ where: { id: "refuge-dup" } });
  });
});

// ============================================================
// adoptRefuge
// ============================================================

describe("RefugeService.adoptRefuge", () => {
  function mockAdoptant(gender: string | null = "HOMME") {
    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: adoptantId,
      profile: gender ? { gender } : null,
    });
  }

  it("rejects when the refuge does not exist", async () => {
    mockAdoptant();
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(null);
    await expect(RefugeService.adoptRefuge(adoptantId, sessionId)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects self-adoption", async () => {
    mockAdoptant();
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(waitingSession({ adopteId: adoptantId }));
    await expect(RefugeService.adoptRefuge(adoptantId, sessionId)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects a refuge that is no longer waiting", async () => {
    mockAdoptant();
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(activeSession());
    await expect(RefugeService.adoptRefuge(adoptantId, sessionId)).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects an expired refuge", async () => {
    mockAdoptant();
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(
      waitingSession({ endsAt: new Date(Date.now() - 1000) })
    );
    await expect(RefugeService.adoptRefuge(adoptantId, sessionId)).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects when the Adoptant's gender does not match acceptedSexe", async () => {
    mockAdoptant("HOMME");
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(waitingSession({ acceptedSexe: "FEMME" }));
    await expect(RefugeService.adoptRefuge(adoptantId, sessionId)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects when the Adoptant already has an active refuge", async () => {
    mockAdoptant();
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(waitingSession());
    (prisma.refugeSession.findFirst as any).mockResolvedValueOnce(activeSession({ id: "other" }));
    await expect(RefugeService.adoptRefuge(adoptantId, sessionId)).rejects.toBeInstanceOf(ConflictError);
    expect(prisma.refugeSession.updateMany).not.toHaveBeenCalled();
  });

  it("rejects when the Adoptant already has an open refuge as Adopté", async () => {
    mockAdoptant();
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(waitingSession());
    (prisma.refugeSession.findFirst as any)
      .mockResolvedValueOnce(null) // pas de refuge actif en tant qu'Adoptant
      .mockResolvedValueOnce(waitingSession({ id: "own-proposal", adopteId: adoptantId })); // proposition ouverte
    await expect(RefugeService.adoptRefuge(adoptantId, sessionId)).rejects.toBeInstanceOf(ConflictError);
    expect(prisma.refugeSession.updateMany).not.toHaveBeenCalled();
  });

  it("claims the refuge atomically and realigns endsAt on startedAt + 7 days", async () => {
    mockAdoptant();
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(waitingSession());
    (prisma.refugeSession.findFirst as any).mockResolvedValueOnce(null);
    (prisma.refugeSession.updateMany as any).mockResolvedValueOnce({ count: 1 });
    (prisma.refugeSession.count as any).mockResolvedValueOnce(1);
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(activeSession());

    const dto = await RefugeService.adoptRefuge(adoptantId, sessionId);

    expect(dto.status).toBe("ACTIVE");
    const updateArgs = (prisma.refugeSession.updateMany as any).mock.calls[0][0];
    // Attribution conditionnelle : uniquement si toujours en attente et sans adoptant
    expect(updateArgs.where).toMatchObject({
      id: sessionId,
      status: "WAITING_FOR_ADOPTANT",
      adoptantId: null,
    });
    // Le jeu dure 7 jours à partir de l'adoption
    const { startedAt, endsAt } = updateArgs.data;
    expect(endsAt.getTime() - startedAt.getTime()).toBe(7 * DAY_MS);
  });

  it("rejects when another Adoptant won the race (conditional claim touched 0 rows)", async () => {
    mockAdoptant();
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(waitingSession());
    (prisma.refugeSession.findFirst as any).mockResolvedValueOnce(null);
    (prisma.refugeSession.updateMany as any).mockResolvedValueOnce({ count: 0 });

    await expect(RefugeService.adoptRefuge(adoptantId, sessionId)).rejects.toBeInstanceOf(ConflictError);
  });

  it("maps the (adopteId, adoptantId) unique violation to a 409", async () => {
    mockAdoptant();
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(waitingSession());
    (prisma.refugeSession.findFirst as any).mockResolvedValueOnce(null);
    (prisma.refugeSession.updateMany as any).mockRejectedValueOnce(Object.assign(new Error("unique"), { code: "P2002" }));

    await expect(RefugeService.adoptRefuge(adoptantId, sessionId)).rejects.toBeInstanceOf(ConflictError);
  });

  it("releases the claim when two simultaneous adoptions gave the Adoptant 2 active refuges", async () => {
    mockAdoptant();
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(waitingSession());
    (prisma.refugeSession.findFirst as any).mockResolvedValueOnce(null);
    (prisma.refugeSession.updateMany as any).mockResolvedValueOnce({ count: 1 });
    (prisma.refugeSession.count as any).mockResolvedValueOnce(2);
    (prisma.refugeSession.update as any).mockResolvedValueOnce({});

    await expect(RefugeService.adoptRefuge(adoptantId, sessionId)).rejects.toBeInstanceOf(ConflictError);

    // La session est rendue à l'état "en attente"
    const revertArgs = (prisma.refugeSession.update as any).mock.calls[0][0];
    expect(revertArgs.where).toEqual({ id: sessionId });
    expect(revertArgs.data).toMatchObject({
      adoptantId: null,
      status: "WAITING_FOR_ADOPTANT",
      startedAt: null,
    });
  });
});

// ============================================================
// getRefugeSession — producteur unique des actions du jour
// ============================================================

describe("RefugeService.getRefugeSession", () => {
  const todayChoice = {
    id: "dc-1",
    refugeSessionId: sessionId,
    dayNumber: 1,
    action1: "NOURRIR",
    action2: "JOUER",
    submittedAt: new Date(),
  };

  it("rejects a user who is not part of the refuge", async () => {
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(activeSession());
    await expect(RefugeService.getRefugeSession(sessionId, "stranger")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("is a pure read: never generates daily actions, hearts stay white without a choice", async () => {
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(activeSession());

    const result = await RefugeService.getRefugeSession(sessionId, adopteId);

    expect(prisma.refugeDailyChoice.create).not.toHaveBeenCalled();
    expect(result.currentDay).toBe(1);
    expect(result.todayActions).toBeUndefined();
    expect(result.adopteSubmittedToday).toBe(false);
    expect(result.hearts).toEqual(["🤍", "🤍", "🤍", "🤍", "🤍", "🤍", "🤍"]);
    expect(result.canAttemptToday).toBe(true);
    expect(result.todaySubmitted).toBe(false);
  });

  it("does not expose todayActions to the Adoptant but reports adopteSubmittedToday", async () => {
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(
      activeSession({ dailyChoices: [todayChoice] })
    );

    const result = await RefugeService.getRefugeSession(sessionId, adoptantId);

    expect(prisma.refugeDailyChoice.create).not.toHaveBeenCalled();
    expect(result.todayActions).toBeUndefined();
    expect(result.adopteSubmittedToday).toBe(true);
  });

  it("returns the Adopté's submitted actions for the day", async () => {
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(
      activeSession({ dailyChoices: [todayChoice] })
    );

    const result = await RefugeService.getRefugeSession(sessionId, adopteId);

    expect(prisma.refugeDailyChoice.create).not.toHaveBeenCalled();
    expect(result.todayActions).toEqual({ action1: "NOURRIR", action2: "JOUER" });
    expect(result.adopteSubmittedToday).toBe(true);
  });

  it("does not generate actions for a session still waiting for an Adoptant", async () => {
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(waitingSession());

    const result = await RefugeService.getRefugeSession(sessionId, adopteId);

    expect(prisma.refugeDailyChoice.findUnique).not.toHaveBeenCalled();
    expect(prisma.refugeDailyChoice.create).not.toHaveBeenCalled();
    expect(result.currentDay).toBe(0);
    expect(result.todayActions).toBeUndefined();
    expect(result.canAttemptToday).toBe(false);
  });

  it("reports todaySubmitted and blocks further attempts once the guess exists", async () => {
    const guess = {
      dayNumber: 1,
      guessedAction1: "NOURRIR",
      guessedAction2: "JOUER",
    };
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(
      activeSession({ dailyChoices: [todayChoice], guesses: [guess] })
    );

    const result = await RefugeService.getRefugeSession(sessionId, adoptantId);

    expect(result.todaySubmitted).toBe(true);
    expect(result.canAttemptToday).toBe(false);
    expect(result.hearts[0]).toBe("❤️");
  });
});

// ============================================================
// getActiveRefugeSession — résolution de la session courante
// ============================================================

describe("RefugeService.getActiveRefugeSession", () => {
  it("prioritizes the ACTIVE session over any stale open proposal", async () => {
    const shared = activeSession({ id: "shared-active" });
    (prisma.refugeSession.findFirst as any).mockResolvedValueOnce(shared);

    const dto = await RefugeService.getActiveRefugeSession(adoptantId);

    expect(dto?.id).toBe("shared-active");
    // Une seule requête suffit : la session ACTIVE court-circuite la recherche de proposition
    expect(prisma.refugeSession.findFirst).toHaveBeenCalledTimes(1);
    const args = (prisma.refugeSession.findFirst as any).mock.calls[0][0];
    expect(args.where.status).toEqual({ in: ["ACTIVE", "AWAITING_REVEAL_CONSENT"] });
  });

  it("falls back to the most recent open proposal as Adopté when no session is ACTIVE", async () => {
    const proposal = waitingSession({ id: "own-waiting" });
    (prisma.refugeSession.findFirst as any)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(proposal);

    const dto = await RefugeService.getActiveRefugeSession(adopteId);

    expect(dto?.id).toBe("own-waiting");
    const args = (prisma.refugeSession.findFirst as any).mock.calls[1][0];
    expect(args.where.adopteId).toBe(adopteId);
    expect(args.orderBy).toEqual({ createdAt: "desc" });
  });

  it("returns null when the user has no open session at all", async () => {
    (prisma.refugeSession.findFirst as any)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const dto = await RefugeService.getActiveRefugeSession(adopteId);

    expect(dto).toBeNull();
  });

  it("falls back to the most recent REVEALED session so the reveal survives a reload", async () => {
    const revealed = activeSession({ id: "revealed-1", status: "REVEALED", revealedAt: new Date() });
    (prisma.refugeSession.findFirst as any)
      .mockResolvedValueOnce(null) // pas d'ACTIVE / AWAITING
      .mockResolvedValueOnce(null) // pas de proposition ouverte
      .mockResolvedValueOnce(revealed);

    const dto = await RefugeService.getActiveRefugeSession(adopteId);

    expect(dto?.id).toBe("revealed-1");
    const args = (prisma.refugeSession.findFirst as any).mock.calls[2][0];
    expect(args.where.status).toBe("REVEALED");
  });
});

// ============================================================
// submitGuess — tentative de l'Adoptant
// ============================================================

describe("RefugeService.submitGuess", () => {
  const guessInput = { guessedAction1: "NOURRIR", guessedAction2: "JOUER" } as any;
  const existingChoice = {
    id: "dc-1",
    refugeSessionId: sessionId,
    dayNumber: 1,
    action1: "NOURRIR",
    action2: "JOUER",
  };
  const createdGuess = {
    id: "guess-1",
    refugeSessionId: sessionId,
    dayNumber: 1,
    guessedAction1: "NOURRIR",
    guessedAction2: "JOUER",
    submittedAt: new Date(),
  };

  it("rejects a user who is not the Adoptant", async () => {
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(activeSession());
    await expect(
      RefugeService.submitGuess(sessionId, adopteId, 1, guessInput)
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects when the session is not active", async () => {
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(
      activeSession({ status: "COMPLETED" })
    );
    await expect(
      RefugeService.submitGuess(sessionId, adoptantId, 1, guessInput)
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects when the submitted day is not the session's current day", async () => {
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(activeSession()); // currentDay = 1
    await expect(
      RefugeService.submitGuess(sessionId, adoptantId, 3, guessInput)
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it("rejects two identical guessed actions", async () => {
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(activeSession());
    await expect(
      RefugeService.submitGuess(sessionId, adoptantId, 1, {
        guessedAction1: "NOURRIR",
        guessedAction2: "NOURRIR",
      } as any)
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it("rejects when the day's attempt already exists", async () => {
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(activeSession());
    (prisma.refugeGuess.findUnique as any).mockResolvedValueOnce(createdGuess);
    await expect(
      RefugeService.submitGuess(sessionId, adoptantId, 1, guessInput)
    ).rejects.toBeInstanceOf(ConflictError);
    expect(prisma.refugeGuess.create).not.toHaveBeenCalled();
  });

  it("rejects the attempt when the Adopté has not submitted the day's choice (never auto-generates)", async () => {
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(activeSession());
    (prisma.refugeGuess.findUnique as any).mockResolvedValueOnce(null);
    (prisma.refugeDailyChoice.findUnique as any).mockResolvedValueOnce(null);

    await expect(
      RefugeService.submitGuess(sessionId, adoptantId, 1, guessInput)
    ).rejects.toBeInstanceOf(ConflictError);
    expect(prisma.refugeDailyChoice.create).not.toHaveBeenCalled();
    expect(prisma.refugeGuess.create).not.toHaveBeenCalled();
  });

  it("records the attempt atomically with the Adoptant's activity when the Adopté's choice exists", async () => {
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(activeSession());
    (prisma.refugeGuess.findUnique as any).mockResolvedValueOnce(null);
    (prisma.refugeDailyChoice.findUnique as any).mockResolvedValueOnce(existingChoice);
    (prisma.refugeGuess.create as any).mockResolvedValueOnce(createdGuess);
    (prisma.refugeSession.update as any).mockResolvedValueOnce({});

    const result = await RefugeService.submitGuess(sessionId, adoptantId, 1, guessInput);

    expect(result.dayNumber).toBe(1);
    expect(prisma.refugeDailyChoice.findUnique).toHaveBeenCalled();
    expect(prisma.refugeDailyChoice.create).not.toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    const activityUpdate = (prisma.refugeSession.update as any).mock.calls[0][0];
    expect(activityUpdate.data.lastAdoptantActivityAt).toBeInstanceOf(Date);
  });

  it("turns a duplicate-submission race (double click) into a 409", async () => {
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(activeSession());
    (prisma.refugeGuess.findUnique as any).mockResolvedValueOnce(null);
    (prisma.refugeDailyChoice.findUnique as any).mockResolvedValueOnce(existingChoice);
    (prisma.refugeGuess.create as any).mockRejectedValueOnce(
      Object.assign(new Error("unique"), { code: "P2002" })
    );
    (prisma.refugeSession.update as any).mockResolvedValueOnce({});

    await expect(
      RefugeService.submitGuess(sessionId, adoptantId, 1, guessInput)
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("calculates 2/2 match and includes reward in result", async () => {
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(activeSession());
    (prisma.refugeGuess.findUnique as any).mockResolvedValueOnce(null);
    (prisma.refugeDailyChoice.findUnique as any).mockResolvedValueOnce(existingChoice);
    (prisma.refugeGuess.create as any).mockResolvedValueOnce(createdGuess);
    (prisma.refugeSession.update as any).mockResolvedValueOnce({});
    (prisma.wallet.upsert as any).mockResolvedValue({ coins: 100 });

    const result = await RefugeService.submitGuess(sessionId, adoptantId, 1, guessInput);

    expect(result.dayResult).toBeDefined();
    expect(result.dayResult.matches).toBe(2);
    expect(result.dayResult.message).toContain("même longueur d'onde");
    expect(result.dayResult.reward).toBe(10);
    expect(result.dayResult.emoji).toBe("❤️");
    expect(prisma.wallet.upsert).toHaveBeenCalledTimes(2);
  });

  it("calculates 1/2 match: heart, 'pas loin' message, +5 for both players", async () => {
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(activeSession());
    (prisma.refugeGuess.findUnique as any).mockResolvedValueOnce(null);
    (prisma.refugeDailyChoice.findUnique as any).mockResolvedValueOnce({
      ...existingChoice,
      action2: "LAVER",
    });
    (prisma.refugeGuess.create as any).mockResolvedValueOnce(createdGuess);
    (prisma.refugeSession.update as any).mockResolvedValueOnce({});
    (prisma.wallet.upsert as any).mockResolvedValue({ coins: 100 });

    const result = await RefugeService.submitGuess(sessionId, adoptantId, 1, guessInput);

    expect(result.dayResult).toBeDefined();
    expect(result.dayResult.matches).toBe(1);
    expect(result.dayResult.message).toBe("Vous n'étiez pas loin d'être sur la même longueur d'onde.");
    expect(result.dayResult.reward).toBe(5);
    expect(result.dayResult.emoji).toBe("❤️");
    // Écritures traçables via le ledger : une CoinTransaction +5 par joueur
    expect(prisma.wallet.upsert).toHaveBeenCalledTimes(2);
    const txnAmounts = (prisma.coinTransaction.create as any).mock.calls.map(
      (c: any[]) => c[0].data.amount
    );
    expect(txnAmounts).toEqual([5, 5]);
    const txnTypes = (prisma.coinTransaction.create as any).mock.calls.map((c: any[]) => c[0].data.type);
    expect(txnTypes).toEqual(["REFUGE_PARTIAL_REWARD", "REFUGE_PARTIAL_REWARD"]);
    // Résultat FINAL du jour persisté dans la même transaction
    const dayResultArgs = (prisma.refugeDayResult.create as any).mock.calls[0][0];
    expect(dayResultArgs.data.status).toBe("PARTIAL");
    expect(dayResultArgs.data.adopteCoinsDelta).toBe(5);
  });

  it("puts a heart (not a cross) in the hearts row for a 1/2 day", async () => {
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(
      activeSession({
        dailyChoices: [{ dayNumber: 1, action1: "NOURRIR", action2: "LAVER" }],
        guesses: [{ dayNumber: 1, guessedAction1: "NOURRIR", guessedAction2: "JOUER" }],
      })
    );

    const result = await RefugeService.getRefugeSession(sessionId, adoptantId);

    expect(result.hearts[0]).toBe("❤️");
    expect(result.todayResult?.matches).toBe(1);
    expect(result.todayResult?.reward).toBe(5);
  });

  it("calculates 0/2 match and includes no reward", async () => {
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(activeSession());
    (prisma.refugeGuess.findUnique as any).mockResolvedValueOnce(null);
    (prisma.refugeDailyChoice.findUnique as any).mockResolvedValueOnce({
      ...existingChoice,
      action1: "LAVER",
      action2: "CARESSER",
    });
    (prisma.refugeGuess.create as any).mockResolvedValueOnce(createdGuess);
    (prisma.refugeSession.update as any).mockResolvedValueOnce({});

    const result = await RefugeService.submitGuess(sessionId, adoptantId, 1, guessInput);

    expect(result.dayResult).toBeDefined();
    expect(result.dayResult.matches).toBe(0);
    expect(result.dayResult.message).toContain("pas sur la même longueur");
    expect(result.dayResult.reward).toBe(0);
    expect(result.dayResult.emoji).toBe("❌");
    expect(prisma.wallet.upsert).not.toHaveBeenCalled();
  });

  it("handles reversed action order (2/2 match with different order)", async () => {
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(activeSession());
    (prisma.refugeGuess.findUnique as any).mockResolvedValueOnce(null);
    (prisma.refugeDailyChoice.findUnique as any).mockResolvedValueOnce({
      ...existingChoice,
      action1: "NOURRIR",
      action2: "JOUER",
    });
    (prisma.refugeGuess.create as any).mockResolvedValueOnce(createdGuess);
    (prisma.refugeSession.update as any).mockResolvedValueOnce({});
    (prisma.wallet.upsert as any).mockResolvedValue({ coins: 100 });

    // Guess in reversed order: JOUER, NOURRIR (instead of NOURRIR, JOUER)
    const reversedGuess = { guessedAction1: "JOUER", guessedAction2: "NOURRIR" };
    const result = await RefugeService.submitGuess(sessionId, adoptantId, 1, reversedGuess as any);

    expect(result.dayResult.matches).toBe(2);
    expect(result.dayResult.reward).toBe(10);
    expect(prisma.wallet.upsert).toHaveBeenCalledTimes(2);
  });
});

// ============================================================
// devSetDay — time travel DEV
// ============================================================

describe("RefugeService.devSetDay", () => {
  it("rejects out-of-range days", async () => {
    await expect(RefugeService.devSetDay(sessionId, 0)).rejects.toBeInstanceOf(BadRequestError);
    await expect(RefugeService.devSetDay(sessionId, 8)).rejects.toBeInstanceOf(BadRequestError);
  });

  it("rejects non-active sessions", async () => {
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(waitingSession());
    await expect(RefugeService.devSetDay(sessionId, 3)).rejects.toBeInstanceOf(ConflictError);
  });

  it("moves startedAt so the backend really observes the target day", async () => {
    const targetDay = 5;
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(activeSession());
    (prisma.refugeSession.update as any).mockImplementationOnce(async (args: any) => args);

    // getRefugeSession appelé en fin de devSetDay
    let movedStartedAt: Date | null = null;
    (prisma.refugeSession.update as any).mockImplementationOnce(async (args: any) => {
      movedStartedAt = args.data.startedAt;
      return activeSession({ startedAt: args.data.startedAt, endsAt: args.data.endsAt });
    });
    (prisma.refugeSession.update as any).mockReset();
    (prisma.refugeSession.update as any).mockImplementation(async (args: any) => {
      movedStartedAt = args.data.startedAt;
      return activeSession({ startedAt: args.data.startedAt, endsAt: args.data.endsAt });
    });
    (prisma.refugeSession.findUnique as any).mockImplementation(async () =>
      activeSession({
        startedAt: movedStartedAt,
        endsAt: new Date((movedStartedAt as Date).getTime() + 7 * DAY_MS),
      })
    );
    (prisma.refugeDailyChoice.findUnique as any).mockResolvedValue({
      id: "dc-5",
      refugeSessionId: sessionId,
      dayNumber: targetDay,
      action1: "CARESSER",
      action2: "LAVER",
    });

    const result = await RefugeService.devSetDay(sessionId, targetDay);

    expect(result.currentDay).toBe(targetDay);
    // Invariant : endsAt = startedAt + 7 jours
    const updateArgs = (prisma.refugeSession.update as any).mock.calls[0][0];
    expect(updateArgs.data.endsAt.getTime() - updateArgs.data.startedAt.getTime()).toBe(7 * DAY_MS);
  });
});

// ============================================================
// submitRevealConsent — phase finale, consentement mutuel
// ============================================================

describe("RefugeService.submitRevealConsent", () => {
  it("rejects a user who is not a participant", async () => {
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(day7DoneSession());
    await expect(
      RefugeService.submitRevealConsent(sessionId, "stranger", "ACCEPT")
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects consent before day 7 is finished (day 1)", async () => {
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(activeSession());
    await expect(
      RefugeService.submitRevealConsent(sessionId, adopteId, "ACCEPT")
    ).rejects.toBeInstanceOf(ConflictError);
    expect(prisma.refugeSession.updateMany).not.toHaveBeenCalled();
  });

  it("rejects consent on day 7 while the day-7 attempt is not played and time remains", async () => {
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(
      day7DoneSession({ guesses: [] }) // jour 7 atteint mais pas joué, pas expiré
    );
    await expect(
      RefugeService.submitRevealConsent(sessionId, adopteId, "ACCEPT")
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("first ACCEPT stores the decision and moves to AWAITING_REVEAL_CONSENT (no reveal)", async () => {
    (prisma.refugeSession.findUnique as any)
      .mockResolvedValueOnce(day7DoneSession()) // lecture initiale
      .mockResolvedValueOnce(null) // closePastDays (no-op)
      .mockResolvedValueOnce(day7DoneSession({ adopteRevealDecision: "ACCEPT", status: "AWAITING_REVEAL_CONSENT" })); // relecture getRefugeSession
    (prisma.refugeSession.updateMany as any)
      .mockResolvedValueOnce({ count: 1 }) // écrit ma décision
      .mockResolvedValueOnce({ count: 0 }); // promotion : l'autre n'a pas accepté

    const result = await RefugeService.submitRevealConsent(sessionId, adopteId, "ACCEPT");

    expect(result.reveal?.myDecision).toBe("ACCEPT");
    expect(result.reveal?.otherDecided).toBe(false);
    expect(result.status).toBe("AWAITING_REVEAL_CONSENT");
    expect(result.otherProfile).toBeUndefined(); // aucun profil avant accord mutuel
    const writeArgs = (prisma.refugeSession.updateMany as any).mock.calls[0][0];
    expect(writeArgs.data.adopteRevealDecision).toBe("ACCEPT");
    expect(writeArgs.where.adopteRevealDecision).toBeNull(); // garde anti-concurrence
  });

  it("second ACCEPT promotes atomically to REVEALED and emits once", async () => {
    (prisma.refugeSession.findUnique as any)
      .mockResolvedValueOnce(day7DoneSession({ adopteRevealDecision: "ACCEPT", status: "AWAITING_REVEAL_CONSENT" }))
      .mockResolvedValueOnce(null) // closePastDays (no-op)
      .mockResolvedValueOnce({ revealedAt: new Date() }) // select post-promotion (événement)
      .mockResolvedValueOnce(
        day7DoneSession({
          adopteRevealDecision: "ACCEPT",
          adoptantRevealDecision: "ACCEPT",
          status: "REVEALED",
          revealedAt: new Date(),
        })
      );
    (prisma.refugeSession.updateMany as any)
      .mockResolvedValueOnce({ count: 1 }) // ma décision (adoptant)
      .mockResolvedValueOnce({ count: 1 }); // promotion gagnée
    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: adopteId,
      profile: { pseudo: "Alice", bio: "Bio", city: "Paris", birthDate: new Date("1995-05-05"), interests: [] },
      photos: [],
    });

    const result = await RefugeService.submitRevealConsent(sessionId, adoptantId, "ACCEPT");

    expect(result.status).toBe("REVEALED");
    expect(result.otherProfile?.pseudo).toBe("Alice");
    const promoArgs = (prisma.refugeSession.updateMany as any).mock.calls[1][0];
    expect(promoArgs.where.adopteRevealDecision).toBe("ACCEPT");
    expect(promoArgs.where.adoptantRevealDecision).toBe("ACCEPT");
    expect(promoArgs.where.status).toBe("AWAITING_REVEAL_CONSENT");
    expect(promoArgs.where.revealedAt).toBeNull();
    expect(promoArgs.data.status).toBe("REVEALED");
    expect(promoArgs.data.revealedAt).toBeInstanceOf(Date);
  });

  it("REFUSE ends the session cleanly as COMPLETED without revealing anything", async () => {
    (prisma.refugeSession.findUnique as any)
      .mockResolvedValueOnce(day7DoneSession({ adopteRevealDecision: "ACCEPT", status: "AWAITING_REVEAL_CONSENT" }))
      .mockResolvedValueOnce(null) // closePastDays (no-op)
      .mockResolvedValueOnce(
        day7DoneSession({
          adopteRevealDecision: "ACCEPT",
          adoptantRevealDecision: "REFUSE",
          status: "COMPLETED",
        })
      );
    (prisma.refugeSession.updateMany as any).mockResolvedValueOnce({ count: 1 });

    const result = await RefugeService.submitRevealConsent(sessionId, adoptantId, "REFUSE");

    expect(result.status).toBe("COMPLETED");
    expect(result.otherProfile).toBeUndefined();
    expect(result.revealedAt ?? null).toBeNull();
    const writeArgs = (prisma.refugeSession.updateMany as any).mock.calls[0][0];
    expect(writeArgs.data.status).toBe("COMPLETED");
    expect(writeArgs.data.adoptantRevealDecision).toBe("REFUSE");
    // pas de tentative de promotion après un refus
    expect((prisma.refugeSession.updateMany as any).mock.calls.length).toBe(1);
  });

  it("is idempotent: re-submitting the same decision returns state without writing", async () => {
    (prisma.refugeSession.findUnique as any)
      .mockResolvedValueOnce(day7DoneSession({ adopteRevealDecision: "ACCEPT", status: "AWAITING_REVEAL_CONSENT" }))
      .mockResolvedValueOnce(null) // closePastDays (no-op)
      .mockResolvedValueOnce(day7DoneSession({ adopteRevealDecision: "ACCEPT", status: "AWAITING_REVEAL_CONSENT" }));

    const result = await RefugeService.submitRevealConsent(sessionId, adopteId, "ACCEPT");

    expect(result.reveal?.myDecision).toBe("ACCEPT");
    expect(prisma.refugeSession.updateMany).not.toHaveBeenCalled();
  });

  it("rejects changing an already recorded decision", async () => {
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(
      day7DoneSession({ adopteRevealDecision: "ACCEPT", status: "AWAITING_REVEAL_CONSENT" })
    );
    await expect(
      RefugeService.submitRevealConsent(sessionId, adopteId, "REFUSE")
    ).rejects.toBeInstanceOf(ConflictError);
    expect(prisma.refugeSession.updateMany).not.toHaveBeenCalled();
  });

  it("rejects consent on an already terminated session", async () => {
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(
      day7DoneSession({ status: "COMPLETED", adoptantRevealDecision: "REFUSE" })
    );
    await expect(
      RefugeService.submitRevealConsent(sessionId, adopteId, "ACCEPT")
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

// ============================================================
// getRefugeSession — confidentialité de la phase finale
// ============================================================

describe("RefugeService.getRefugeSession (reveal privacy)", () => {
  it("never exposes the other participant's detailed decision, only a boolean", async () => {
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(
      day7DoneSession({ adoptantRevealDecision: "ACCEPT", status: "AWAITING_REVEAL_CONSENT" })
    );

    const result = await RefugeService.getRefugeSession(sessionId, adopteId);

    expect(result.reveal?.available).toBe(true);
    expect(result.reveal?.myDecision).toBeNull();
    expect(result.reveal?.otherDecided).toBe(true);
    expect(JSON.stringify(result)).not.toContain("adoptantRevealDecision");
    expect(result.otherProfile).toBeUndefined();
  });

  it("does not expose any profile before mutual agreement", async () => {
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(
      day7DoneSession({ adopteRevealDecision: "ACCEPT", status: "AWAITING_REVEAL_CONSENT" })
    );

    const result = await RefugeService.getRefugeSession(sessionId, adopteId);

    expect(result.otherProfile).toBeUndefined();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("exposes the other participant's public profile once REVEALED, for both sides", async () => {
    const revealed = day7DoneSession({
      adopteRevealDecision: "ACCEPT",
      adoptantRevealDecision: "ACCEPT",
      status: "REVEALED",
      revealedAt: new Date(),
    });
    (prisma.refugeSession.findUnique as any).mockResolvedValue(revealed);
    (prisma.user.findUnique as any)
      .mockResolvedValueOnce({ id: adoptantId, profile: { pseudo: "Bob", bio: null, city: "Lyon", birthDate: null, interests: [] }, photos: [] })
      .mockResolvedValueOnce({ id: adopteId, profile: { pseudo: "Alice", bio: "Bio", city: "Paris", birthDate: null, interests: [] }, photos: [] });

    const forAdopte = await RefugeService.getRefugeSession(sessionId, adopteId);
    const forAdoptant = await RefugeService.getRefugeSession(sessionId, adoptantId);

    expect(forAdopte.otherProfile?.pseudo).toBe("Bob");
    expect(forAdoptant.otherProfile?.pseudo).toBe("Alice");
    expect(forAdopte.reveal?.revealedAt).toBeInstanceOf(Date);
  });

  it("reveal.available is false before day 7", async () => {
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(activeSession());

    const result = await RefugeService.getRefugeSession(sessionId, adopteId);

    expect(result.reveal?.available).toBe(false);
    expect(result.reveal?.myDecision).toBeNull();
  });
});

// ============================================================
// Progression commune — dayCompleted / canAdvanceDay / finalConsentAvailable
// ============================================================

describe("RefugeService progression partagée", () => {
  it("day 1 partially played (choice only): dayCompleted=false, cannot advance", async () => {
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(
      activeSession({ dailyChoices: [{ dayNumber: 1, action1: "NOURRIR", action2: "JOUER" }] })
    );

    const result = await RefugeService.getRefugeSession(sessionId, adopteId);

    expect(result.adopteSubmittedToday).toBe(true);
    expect(result.adoptantSubmittedToday).toBe(false);
    expect(result.dayCompleted).toBe(false);
    expect(result.canAdvanceDay).toBe(false);
    expect(result.finalConsentAvailable).toBe(false);
  });

  it("day 1 fully played: dayCompleted=true, canAdvanceDay=true, no final consent", async () => {
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(
      activeSession({
        dailyChoices: [{ dayNumber: 1, action1: "NOURRIR", action2: "JOUER" }],
        guesses: [{ dayNumber: 1, guessedAction1: "NOURRIR", guessedAction2: "JOUER" }],
      })
    );

    const result = await RefugeService.getRefugeSession(sessionId, adopteId);

    expect(result.dayCompleted).toBe(true);
    expect(result.canAdvanceDay).toBe(true);
    expect(result.finalConsentAvailable).toBe(false);
  });

  it("forced to day 7 with nothing played: no fake data, no final phase, skipped days stay white", async () => {
    const startedAt = new Date(Date.now() - 6 * DAY_MS - 2 * 60 * 60 * 1000);
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(
      activeSession({ startedAt, endsAt: new Date(startedAt.getTime() + 7 * DAY_MS) })
    );

    const result = await RefugeService.getRefugeSession(sessionId, adopteId);

    expect(result.currentDay).toBe(7);
    expect(result.dayCompleted).toBe(false);
    expect(result.canAdvanceDay).toBe(false);
    expect(result.finalConsentAvailable).toBe(false);
    expect(result.reveal?.available).toBe(false);
    expect(result.hearts).toEqual(["🤍", "🤍", "🤍", "🤍", "🤍", "🤍", "🤍"]);
  });

  it("day 7 completed: finalConsentAvailable=true, canAdvanceDay=false", async () => {
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(day7DoneSession());

    const result = await RefugeService.getRefugeSession(sessionId, adoptantId);

    expect(result.currentDay).toBe(7);
    expect(result.dayCompleted).toBe(true);
    expect(result.canAdvanceDay).toBe(false);
    expect(result.finalConsentAvailable).toBe(true);
    expect(result.reveal?.available).toBe(true);
  });

  it("expired session without day 7 played never reaches the final phase", async () => {
    const startedAt = new Date(Date.now() - 9 * DAY_MS);
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(
      activeSession({ startedAt, endsAt: new Date(startedAt.getTime() + 7 * DAY_MS) })
    );

    const result = await RefugeService.getRefugeSession(sessionId, adopteId);

    expect(result.finalConsentAvailable).toBe(false);
    expect(result.reveal?.available).toBe(false);
  });
});

// ============================================================
// devAdvanceDay — "jour suivant" gardé par la complétion du jour
// ============================================================

describe("RefugeService.devAdvanceDay", () => {
  it("refuses to advance while the current day is not completed", async () => {
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(
      activeSession({ dailyChoices: [{ dayNumber: 1, action1: "NOURRIR", action2: "JOUER" }] })
    );

    await expect(RefugeService.devAdvanceDay(sessionId)).rejects.toBeInstanceOf(ConflictError);
    expect(prisma.refugeSession.update).not.toHaveBeenCalled();
  });

  it("refuses to advance past day 7", async () => {
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(day7DoneSession());

    await expect(RefugeService.devAdvanceDay(sessionId)).rejects.toBeInstanceOf(ConflictError);
    expect(prisma.refugeSession.update).not.toHaveBeenCalled();
  });

  it("advances exactly one day when the current day is completed", async () => {
    const completed = activeSession({
      dailyChoices: [{ dayNumber: 1, action1: "NOURRIR", action2: "JOUER" }],
      guesses: [{ dayNumber: 1, guessedAction1: "NOURRIR", guessedAction2: "JOUER" }],
    });
    (prisma.refugeSession.findUnique as any)
      .mockResolvedValueOnce(completed) // lecture devAdvanceDay
      .mockResolvedValueOnce(completed); // lecture devSetDay
    let movedStartedAt: Date | null = null;
    (prisma.refugeSession.update as any).mockImplementationOnce(async (args: any) => {
      movedStartedAt = args.data.startedAt;
      return completed;
    });
    (prisma.refugeSession.findUnique as any).mockImplementationOnce(async () =>
      activeSession({
        startedAt: movedStartedAt,
        endsAt: new Date((movedStartedAt as unknown as Date).getTime() + 7 * DAY_MS),
        dailyChoices: completed.dailyChoices,
        guesses: completed.guesses,
      })
    );

    const result = await RefugeService.devAdvanceDay(sessionId);

    expect(result.currentDay).toBe(2);
  });
});

// ============================================================
// Clôture des jours — règles des jours incomplets et idempotence
// ============================================================

import { computeDayClosure } from "../../src/modules/refuge/refuge.utils";

describe("computeDayClosure (règles des jours)", () => {
  it("both played: FAILED/PARTIAL/PERFECT with the right deltas", () => {
    expect(computeDayClosure(true, true, 0, true)).toEqual({ status: "FAILED", matchCount: 0, adopteCoinsDelta: 0, adoptantCoinsDelta: 0 });
    expect(computeDayClosure(true, true, 1, true)).toEqual({ status: "PARTIAL", matchCount: 1, adopteCoinsDelta: 5, adoptantCoinsDelta: 5 });
    expect(computeDayClosure(true, true, 2, true)).toEqual({ status: "PERFECT", matchCount: 2, adopteCoinsDelta: 10, adoptantCoinsDelta: 10 });
  });

  it("choice without answer: INCOMPLETE_ADOPTANT_MISSING +5/-5", () => {
    expect(computeDayClosure(true, false, null, true)).toEqual({
      status: "INCOMPLETE_ADOPTANT_MISSING",
      matchCount: null,
      adopteCoinsDelta: 5,
      adoptantCoinsDelta: -5,
    });
  });

  it("no choice but the Adoptant was present: INCOMPLETE_ADOPTE_MISSING -5/+5", () => {
    expect(computeDayClosure(false, false, null, true)).toEqual({
      status: "INCOMPLETE_ADOPTE_MISSING",
      matchCount: null,
      adopteCoinsDelta: -5,
      adoptantCoinsDelta: 5,
    });
  });

  it("nobody came: NOT_PLAYED 0/0 — no cross, no heart, no penalty", () => {
    expect(computeDayClosure(false, false, null, false)).toEqual({
      status: "NOT_PLAYED",
      matchCount: null,
      adopteCoinsDelta: 0,
      adoptantCoinsDelta: 0,
    });
  });
});

describe("RefugeService.closePastDays", () => {
  it("closes a past day with a choice but no answer: persists ⚠️ and moves coins once", async () => {
    const startedAt = new Date(Date.now() - 1 * DAY_MS - 2 * 60 * 60 * 1000); // jour 2 → jour 1 échu
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(
      activeSession({
        startedAt,
        endsAt: new Date(startedAt.getTime() + 7 * DAY_MS),
        dailyChoices: [{ dayNumber: 1, action1: "NOURRIR", action2: "JOUER" }],
      })
    );

    await RefugeService.closePastDays(sessionId);

    const created = (prisma.refugeDayResult.create as any).mock.calls[0][0];
    expect(created.data.dayNumber).toBe(1);
    expect(created.data.status).toBe("INCOMPLETE_ADOPTANT_MISSING");
    expect(created.data.adopteCoinsDelta).toBe(5);
    expect(created.data.adoptantCoinsDelta).toBe(-5);
    // Un crédit +5 (adopté) et un débit -5 (adoptant) via le ledger
    const amounts = (prisma.coinTransaction.create as any).mock.calls.map((c: any[]) => c[0].data.amount);
    expect(amounts).toEqual([5, -5]);
    const types = (prisma.coinTransaction.create as any).mock.calls.map((c: any[]) => c[0].data.type);
    expect(types).toEqual(["REFUGE_PARTICIPATION_REWARD", "REFUGE_INACTIVITY_PENALTY"]);
  });

  it("clamps a penalty to the available balance — never a negative wallet", async () => {
    const startedAt = new Date(Date.now() - 1 * DAY_MS - 2 * 60 * 60 * 1000);
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(
      activeSession({
        startedAt,
        endsAt: new Date(startedAt.getTime() + 7 * DAY_MS),
        dailyChoices: [{ dayNumber: 1, action1: "NOURRIR", action2: "JOUER" }],
      })
    );
    // L'adoptant n'a que 3 pièces
    (prisma.wallet.upsert as any)
      .mockResolvedValueOnce({ userId: adopteId, coins: 100 })
      .mockResolvedValueOnce({ userId: adoptantId, coins: 3 });

    await RefugeService.closePastDays(sessionId);

    const debitTxn = (prisma.coinTransaction.create as any).mock.calls[1][0];
    expect(debitTxn.data.amount).toBe(-3); // plafonné au solde
    expect(debitTxn.data.balance).toBe(0); // jamais négatif
    const walletUpdates = (prisma.wallet.update as any).mock.calls.map((c: any[]) => c[0].data.coins);
    expect(walletUpdates).toEqual([105, 0]);
  });

  it("is idempotent: an already closed day is never re-processed (P2002 or existing result)", async () => {
    const startedAt = new Date(Date.now() - 1 * DAY_MS - 2 * 60 * 60 * 1000);
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(
      activeSession({
        startedAt,
        endsAt: new Date(startedAt.getTime() + 7 * DAY_MS),
        dailyChoices: [{ dayNumber: 1, action1: "NOURRIR", action2: "JOUER" }],
        dayResults: [{ dayNumber: 1, status: "INCOMPLETE_ADOPTANT_MISSING", matchCount: null, adopteCoinsDelta: 5, adoptantCoinsDelta: -5 }],
      })
    );

    await RefugeService.closePastDays(sessionId);

    expect(prisma.refugeDayResult.create).not.toHaveBeenCalled();
    expect(prisma.coinTransaction.create).not.toHaveBeenCalled();
  });

  it("a past fully-played day (legacy) is persisted WITHOUT re-crediting wallets", async () => {
    const startedAt = new Date(Date.now() - 1 * DAY_MS - 2 * 60 * 60 * 1000);
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(
      activeSession({
        startedAt,
        endsAt: new Date(startedAt.getTime() + 7 * DAY_MS),
        dailyChoices: [{ dayNumber: 1, action1: "NOURRIR", action2: "JOUER" }],
        guesses: [{ dayNumber: 1, guessedAction1: "JOUER", guessedAction2: "NOURRIR" }],
      })
    );

    await RefugeService.closePastDays(sessionId);

    const created = (prisma.refugeDayResult.create as any).mock.calls[0][0];
    expect(created.data.status).toBe("PERFECT");
    // Les pièces avaient déjà été versées à la soumission de la réponse
    expect(prisma.coinTransaction.create).not.toHaveBeenCalled();
  });
});

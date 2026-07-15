import { describe, it, expect, beforeEach, vi } from "vitest";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../../src/core/errors";

// Mock the Prisma module with factory function to avoid hoisting issues
vi.mock("../../src/config/prisma", () => {
  return {
    prisma: {
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
      },
      refugeGuess: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      $transaction: vi.fn(async (ops: unknown) => {
        if (Array.isArray(ops)) return Promise.all(ops);
        return (ops as (tx: unknown) => unknown)(undefined);
      }),
    },
  };
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
    dailyChoices: [],
    guesses: [],
    ...overrides,
  };
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

  it("generates the day's actions once and returns them to the Adopté", async () => {
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(activeSession());
    (prisma.refugeDailyChoice.findUnique as any).mockResolvedValueOnce(null);
    (prisma.refugeDailyChoice.create as any).mockResolvedValueOnce(todayChoice);

    const result = await RefugeService.getRefugeSession(sessionId, adopteId);

    expect(prisma.refugeDailyChoice.create).toHaveBeenCalledOnce();
    expect(result.currentDay).toBe(1);
    expect(result.todayActions).toEqual({ action1: "NOURRIR", action2: "JOUER" });
    expect(result.canAttemptToday).toBe(true);
    expect(result.todaySubmitted).toBe(false);
  });

  it("does not expose todayActions to the Adoptant but still fixes the day's actions", async () => {
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(activeSession());
    (prisma.refugeDailyChoice.findUnique as any).mockResolvedValueOnce(null);
    (prisma.refugeDailyChoice.create as any).mockResolvedValueOnce(todayChoice);

    const result = await RefugeService.getRefugeSession(sessionId, adoptantId);

    expect(prisma.refugeDailyChoice.create).toHaveBeenCalledOnce();
    expect(result.todayActions).toBeUndefined();
  });

  it("reuses the existing daily actions instead of regenerating them", async () => {
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(
      activeSession({ dailyChoices: [todayChoice] })
    );
    (prisma.refugeDailyChoice.findUnique as any).mockResolvedValueOnce(todayChoice);

    const result = await RefugeService.getRefugeSession(sessionId, adopteId);

    expect(prisma.refugeDailyChoice.create).not.toHaveBeenCalled();
    expect(result.todayActions).toEqual({ action1: "NOURRIR", action2: "JOUER" });
  });

  it("resolves the unique-constraint race by re-reading the winning record", async () => {
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(activeSession());
    (prisma.refugeDailyChoice.findUnique as any)
      .mockResolvedValueOnce(null) // première lecture : rien
      .mockResolvedValueOnce(todayChoice); // relecture après P2002
    (prisma.refugeDailyChoice.create as any).mockRejectedValueOnce(
      Object.assign(new Error("unique"), { code: "P2002" })
    );

    const result = await RefugeService.getRefugeSession(sessionId, adopteId);

    expect(result.todayActions).toEqual({ action1: "NOURRIR", action2: "JOUER" });
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
    (prisma.refugeDailyChoice.findUnique as any).mockResolvedValueOnce(todayChoice);

    const result = await RefugeService.getRefugeSession(sessionId, adoptantId);

    expect(result.todaySubmitted).toBe(true);
    expect(result.canAttemptToday).toBe(false);
    expect(result.hearts[0]).toBe("❤️");
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

  it("records the attempt atomically with the Adoptant's activity and guarantees the day's actions exist", async () => {
    (prisma.refugeSession.findUnique as any).mockResolvedValueOnce(activeSession());
    (prisma.refugeGuess.findUnique as any).mockResolvedValueOnce(null);
    (prisma.refugeDailyChoice.findUnique as any).mockResolvedValueOnce(existingChoice);
    (prisma.refugeGuess.create as any).mockResolvedValueOnce(createdGuess);
    (prisma.refugeSession.update as any).mockResolvedValueOnce({});

    const result = await RefugeService.submitGuess(sessionId, adoptantId, 1, guessInput);

    expect(result.dayNumber).toBe(1);
    expect(prisma.refugeDailyChoice.findUnique).toHaveBeenCalled();
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

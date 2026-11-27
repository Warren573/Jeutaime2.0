import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NotFoundError } from "../../src/core/errors";

// Mock the Prisma module with factory function to avoid hoisting issues
vi.mock("../../src/config/prisma", () => {
  return {
    prisma: {
      salon: {
        findUnique: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
      salonMessage: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      salonSession: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
      },
      salonSessionParticipant: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        upsert: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
      },
      salonEncounter: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        upsert: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
      },
    },
  };
});

// Now import the service AFTER mocking
import * as salonSessionsService from "../../src/modules/salon-sessions/salonSessions.service";
import { prisma } from "../../src/config/prisma";

describe("SalonSessions Service", () => {
  const mockUserId = "user-1";
  const mockSessionId = "session-1";
  const salonKind = "PISCINE";

  const salonRow = { id: "salon-1", kind: salonKind, name: "Piscine" };

  // Suite du flux de jonction : aucun participant existant, upsert, pseudo, message de bienvenue (pas encore créé).
  function mockNewParticipantFlow() {
    (prisma.salonSessionParticipant.findUnique as any).mockResolvedValueOnce(null);
    (prisma.salonSessionParticipant.upsert as any).mockResolvedValueOnce({
      id: "participant-1",
      sessionId: mockSessionId,
      userId: mockUserId,
      status: "ACTIVE",
    });
    (prisma.user.findUnique as any).mockResolvedValueOnce({ profile: { pseudo: "User1" } });
    (prisma.salonMessage.findFirst as any).mockResolvedValueOnce(null);
    (prisma.salonMessage.create as any).mockResolvedValueOnce({
      id: "welcome-1",
      sessionId: mockSessionId,
      salonId: salonRow.id,
      kind: "system",
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("joinSession", () => {
    it("should create a new session when none available with capacity", async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      (prisma.salon.findUnique as any).mockResolvedValueOnce(salonRow);
      (prisma.salonSessionParticipant.findFirst as any).mockResolvedValueOnce(null);
      (prisma.salonSessionParticipant.findFirst as any).mockResolvedValueOnce(null);
      (prisma.salonSession.findFirst as any).mockResolvedValueOnce(null);
      (prisma.salonSession.create as any).mockResolvedValueOnce({
        id: mockSessionId,
        salonKind,
        status: "ACTIVE",
        expiresAt: futureDate,
        participants: [],
      });
      mockNewParticipantFlow();
      (prisma.salonSession.findUnique as any).mockResolvedValueOnce({
        id: mockSessionId,
        salonKind,
        status: "ACTIVE",
        startedAt: new Date(),
        expiresAt: futureDate,
        participants: [
          {
            userId: mockUserId,
            joinedAt: new Date(),
            user: {
              profile: { pseudo: "User1", gender: "HOMME", avatarConfig: null },
            },
          },
        ],
        salon: { kind: salonKind, name: "Piscine" },
      });

      const result = await salonSessionsService.joinSession(mockUserId, salonKind);

      expect(result.id).toBe(mockSessionId);
      expect(result.participants).toHaveLength(1);
      expect(prisma.salonSession.create).toHaveBeenCalled();
      // Le participant est rattaché à la nouvelle session (création ou réactivation), actif
      const upsertArgs = (prisma.salonSessionParticipant.upsert as any).mock.calls[0][0];
      expect(upsertArgs.where).toEqual({ sessionId_userId: { sessionId: mockSessionId, userId: mockUserId } });
      expect(upsertArgs.create).toEqual({ sessionId: mockSessionId, userId: mockUserId, status: "ACTIVE" });
      expect(upsertArgs.update).toEqual({ status: "ACTIVE", leftAt: null });
      // Une nouvelle arrivée déclenche un unique message système de bienvenue
      expect(prisma.salonMessage.create).toHaveBeenCalledTimes(1);
      const welcome = (prisma.salonMessage.create as any).mock.calls[0][0].data;
      expect(welcome).toMatchObject({ salonId: salonRow.id, sessionId: mockSessionId, userId: mockUserId, kind: "system" });
      expect(welcome.meta).toEqual({ type: "welcome", joinedUserId: mockUserId, sessionId: mockSessionId });
    });

    it("should join existing session with capacity", async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      (prisma.salon.findUnique as any).mockResolvedValueOnce(salonRow);
      (prisma.salonSessionParticipant.findFirst as any).mockResolvedValueOnce(null);
      (prisma.salonSessionParticipant.findFirst as any).mockResolvedValueOnce(null);
      (prisma.salonSession.findFirst as any).mockResolvedValueOnce({
        id: mockSessionId,
        salonKind,
        status: "ACTIVE",
        expiresAt: futureDate,
        participants: [
          { id: "p1" },
          { id: "p2" },
        ],
      });
      mockNewParticipantFlow();
      (prisma.salonSession.findUnique as any).mockResolvedValueOnce({
        id: mockSessionId,
        salonKind,
        status: "ACTIVE",
        startedAt: new Date(),
        expiresAt: futureDate,
        participants: [
          {
            userId: "user-1",
            joinedAt: new Date(),
            user: { profile: { pseudo: "User1", gender: "HOMME" } },
          },
          {
            userId: "user-2",
            joinedAt: new Date(),
            user: { profile: { pseudo: "User2", gender: "FEMME" } },
          },
          {
            userId: mockUserId,
            joinedAt: new Date(),
            user: { profile: { pseudo: "User3", gender: "AUTRE" } },
          },
        ],
        salon: { kind: salonKind, name: "Piscine" },
      });

      const result = await salonSessionsService.joinSession(mockUserId, salonKind);

      expect(result.participantCount).toBe(3);
      expect(prisma.salonSession.create).not.toHaveBeenCalled();
      // L'utilisateur rejoint la session existante (moins de 4 participants actifs), pas une nouvelle
      const upsertArgs = (prisma.salonSessionParticipant.upsert as any).mock.calls[0][0];
      expect(upsertArgs.create).toEqual({ sessionId: mockSessionId, userId: mockUserId, status: "ACTIVE" });
    });

    it("should return existing session if user already in this salon (idempotent)", async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Mock salon exists
      (prisma.salon.findUnique as any).mockResolvedValueOnce(salonRow);
      // First findFirst call: user is already in this salon
      (prisma.salonSessionParticipant.findFirst as any).mockResolvedValueOnce({
        sessionId: mockSessionId,
      });
      // Subsequent findUnique call for getSessionDetail
      (prisma.salonSession.findUnique as any).mockResolvedValueOnce({
        id: mockSessionId,
        salonKind,
        status: "ACTIVE",
        startedAt: new Date(),
        expiresAt: futureDate,
        participants: [
          {
            userId: mockUserId,
            joinedAt: new Date(),
            user: {
              profile: { pseudo: "User1", gender: "HOMME", avatarConfig: null },
            },
          },
        ],
        salon: { kind: salonKind, name: "Piscine" },
      });

      const result = await salonSessionsService.joinSession(mockUserId, salonKind);

      // Should return the session instead of throwing error (idempotent)
      expect(result.id).toBe(mockSessionId);
      expect(result.participantCount).toBe(1);
    });

    it("auto-quits the previous salon when the user joins another one (never two active salons)", async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      (prisma.salon.findUnique as any).mockResolvedValueOnce(salonRow);
      // 1er findFirst : l'utilisateur n'est PAS déjà dans ce salon
      (prisma.salonSessionParticipant.findFirst as any).mockResolvedValueOnce(null);
      // 2e findFirst : il est actif dans un AUTRE salon
      (prisma.salonSessionParticipant.findFirst as any).mockResolvedValueOnce({
        id: "participant-other",
        sessionId: "other-session-id",
        userId: mockUserId,
        status: "ACTIVE",
      });
      (prisma.salonSessionParticipant.update as any).mockResolvedValueOnce({ id: "participant-other", status: "LEFT" });
      (prisma.salonSession.findFirst as any).mockResolvedValueOnce(null);
      (prisma.salonSession.create as any).mockResolvedValueOnce({
        id: mockSessionId,
        salonKind,
        status: "ACTIVE",
        expiresAt: futureDate,
        participants: [],
      });
      mockNewParticipantFlow();
      (prisma.salonSession.findUnique as any).mockResolvedValueOnce({
        id: mockSessionId,
        salonKind,
        status: "ACTIVE",
        startedAt: new Date(),
        expiresAt: futureDate,
        participants: [
          {
            userId: mockUserId,
            joinedAt: new Date(),
            user: { profile: { pseudo: "User1", gender: "HOMME", avatarConfig: null } },
          },
        ],
        salon: { kind: salonKind, name: "Piscine" },
      });

      // Aucune erreur : le serveur garantit lui-même « un seul salon à la fois » (l'écran des salons empêche déjà le cas).
      const result = await salonSessionsService.joinSession(mockUserId, salonKind);
      expect(result.id).toBe(mockSessionId);

      // L'ancienne participation passe à LEFT, et exactement celle-là
      expect(prisma.salonSessionParticipant.update).toHaveBeenCalledTimes(1);
      const leaveArgs = (prisma.salonSessionParticipant.update as any).mock.calls[0][0];
      expect(leaveArgs.where).toEqual({ id: "participant-other" });
      expect(leaveArgs.data.status).toBe("LEFT");
      expect(leaveArgs.data.leftAt).toBeInstanceOf(Date);

      // La recherche de l'autre salon exclut bien le salon demandé
      const differentSalonQuery = (prisma.salonSessionParticipant.findFirst as any).mock.calls[1][0];
      expect(differentSalonQuery.where.session.NOT).toEqual({ salonKind });
      expect(differentSalonQuery.where.status).toBe("ACTIVE");
    });
  });

  describe("leaveSession", () => {
    it("should mark participant as LEFT", async () => {
      (prisma.salonSessionParticipant.findUnique as any).mockResolvedValueOnce({
        sessionId: mockSessionId,
        userId: mockUserId,
        status: "ACTIVE",
      });
      (prisma.salonSessionParticipant.update as any).mockResolvedValueOnce({
        status: "LEFT",
        leftAt: new Date(),
      });

      const result = await salonSessionsService.leaveSession(
        mockSessionId,
        mockUserId,
      );

      expect(result.success).toBe(true);
      expect(prisma.salonSessionParticipant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "LEFT",
          }),
        }),
      );
    });

    it("should throw NotFoundError when participant not found", async () => {
      (prisma.salonSessionParticipant.findUnique as any).mockResolvedValueOnce(null);

      await expect(
        salonSessionsService.leaveSession(mockSessionId, mockUserId),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("expireOldSessions", () => {
    it("should expire sessions with expiresAt <= now", async () => {
      (prisma.salonSession.updateMany as any).mockResolvedValueOnce({
        count: 3,
      });

      const result = await salonSessionsService.expireOldSessions();

      expect(result.expired).toBe(3);
      expect(prisma.salonSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: "EXPIRED" },
        }),
      );
    });
  });

  describe("recordEncounter", () => {
    it("should record an encounter between two users", async () => {
      (prisma.salonEncounter.upsert as any).mockResolvedValueOnce({
        id: "encounter-1",
      });

      await salonSessionsService.recordEncounter(mockSessionId, "user-1", "user-2");

      expect(prisma.salonEncounter.upsert).toHaveBeenCalled();
    });
  });

  describe("getCurrentActiveSession", () => {
    it("should return null when user has no active session", async () => {
      (prisma.salonSessionParticipant.findFirst as any).mockResolvedValueOnce(null);

      const result = await salonSessionsService.getCurrentActiveSession(mockUserId);

      expect(result).toBeNull();
    });

    it("should return current active session when user is in one", async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      (prisma.salonSessionParticipant.findFirst as any).mockResolvedValueOnce({
        sessionId: mockSessionId,
        session: {
          id: mockSessionId,
          salonKind,
          salon: {
            id: "salon-1",
            name: "La Piscine",
          },
        },
      });

      const result = await salonSessionsService.getCurrentActiveSession(mockUserId);

      expect(result).toEqual({
        sessionId: mockSessionId,
        salonKind,
        salonId: "salon-1",
        salonName: "La Piscine",
      });
    });

    it("should return null when session is expired", async () => {
      (prisma.salonSessionParticipant.findFirst as any).mockResolvedValueOnce(null);

      const result = await salonSessionsService.getCurrentActiveSession(mockUserId);

      expect(result).toBeNull();
      expect(prisma.salonSessionParticipant.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId,
            status: "ACTIVE",
            session: expect.objectContaining({
              status: "ACTIVE",
              expiresAt: { gt: expect.any(Date) },
            }),
          }),
        }),
      );
    });
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NotFoundError, ConflictError } from "../../src/core/errors";

// Mock the Prisma module with factory function to avoid hoisting issues
vi.mock("../../src/config/prisma", () => {
  return {
    prisma: {
      salon: {
        findUnique: vi.fn(),
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("joinSession", () => {
    it("should create a new session when none available with capacity", async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      (prisma.salon.findUnique as any).mockResolvedValueOnce({
        kind: salonKind,
        name: "Piscine",
      });
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
      (prisma.salonSessionParticipant.create as any).mockResolvedValueOnce({
        id: "participant-1",
        sessionId: mockSessionId,
        userId: mockUserId,
        status: "ACTIVE",
      });
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
    });

    it("should join existing session with capacity", async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      (prisma.salon.findUnique as any).mockResolvedValueOnce({
        kind: salonKind,
        name: "Piscine",
      });
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
      (prisma.salonSessionParticipant.create as any).mockResolvedValueOnce({
        id: "participant-new",
      });
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
    });

    it("should return existing session if user already in this salon (idempotent)", async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Mock salon exists
      (prisma.salon.findUnique as any).mockResolvedValueOnce({
        kind: salonKind,
        name: "Piscine",
      });
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

    it("should throw ConflictError if user already in a different salon", async () => {
      const otherSalonKind = "CAFE_DE_PARIS";

      // Mock salon exists
      (prisma.salon.findUnique as any).mockResolvedValueOnce({
        kind: salonKind,
        name: "Piscine",
      });
      // First findFirst call: user is NOT in this salon
      (prisma.salonSessionParticipant.findFirst as any).mockResolvedValueOnce(null);
      // Second findFirst call: user IS in a different salon
      (prisma.salonSessionParticipant.findFirst as any).mockResolvedValueOnce({
        id: "participant-other",
        sessionId: "other-session-id",
        userId: mockUserId,
        status: "ACTIVE",
      });

      await expect(
        salonSessionsService.joinSession(mockUserId, salonKind),
      ).rejects.toThrow(ConflictError);
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
});

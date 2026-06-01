import { describe, it, expect, beforeEach, vi } from "vitest";
import * as salonSessionsService from "../../src/modules/salon-sessions/salonSessions.service";
import { prisma } from "../../src/config/prisma";
import { NotFoundError, ConflictError } from "../../src/core/errors";

vi.mock("../../src/config/prisma");

describe("SalonSessions Service", () => {
  const mockUserId = "user-1";
  const mockSessionId = "session-1";
  const salonKind = "PISCINE";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("joinSession", () => {
    it("should create a new session when none available with capacity", async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

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
        expiresAt: futureDate,
        participants: [
          {
            userId: mockUserId,
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
        participants: [
          {
            userId: "user-1",
            user: { profile: { pseudo: "User1" } },
          },
          {
            userId: "user-2",
            user: { profile: { pseudo: "User2" } },
          },
          {
            userId: mockUserId,
            user: { profile: { pseudo: "User3" } },
          },
        ],
      });

      const result = await salonSessionsService.joinSession(mockUserId, salonKind);

      expect(result.participantCount).toBe(3);
      expect(prisma.salonSession.create).not.toHaveBeenCalled();
    });

    it("should throw ConflictError if user already in active session", async () => {
      (prisma.salonSessionParticipant.findFirst as any).mockResolvedValueOnce({
        sessionId: mockSessionId,
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

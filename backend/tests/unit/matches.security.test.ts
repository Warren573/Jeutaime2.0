import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MatchStatus } from '@prisma/client';
import * as svc from '../../src/modules/matches/matches.service';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../src/core/errors';
import { prisma } from '../../src/config/prisma';

// Mock Prisma
vi.mock('../../src/config/prisma');

describe('Match Security Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('breakMatch', () => {
    it('should allow a participant to break an active match', async () => {
      const match = {
        id: 'match1',
        userAId: 'user1',
        userBId: 'user2',
        status: MatchStatus.ACTIVE,
      };

      vi.mocked(prisma.match.findUnique).mockResolvedValueOnce(match as any);
      vi.mocked(prisma.match.update).mockResolvedValueOnce({
        ...match,
        status: MatchStatus.BROKEN,
      } as any);

      const result = await svc.breakMatch('match1', 'user1');

      expect(result.status).toBe(MatchStatus.BROKEN);
      expect(prisma.match.update).toHaveBeenCalledWith({
        where: { id: 'match1' },
        data: { status: MatchStatus.BROKEN },
        select: expect.any(Object),
      });
    });

    it('should prevent breaking a match that is already broken', async () => {
      const match = {
        id: 'match1',
        userAId: 'user1',
        userBId: 'user2',
        status: MatchStatus.BROKEN,
      };

      vi.mocked(prisma.match.findUnique).mockResolvedValueOnce(match as any);

      await expect(svc.breakMatch('match1', 'user1')).rejects.toThrow(BadRequestError);
    });

    it('should prevent breaking a match that is already blocked', async () => {
      const match = {
        id: 'match1',
        userAId: 'user1',
        userBId: 'user2',
        status: MatchStatus.BLOCKED,
      };

      vi.mocked(prisma.match.findUnique).mockResolvedValueOnce(match as any);

      await expect(svc.breakMatch('match1', 'user1')).rejects.toThrow(BadRequestError);
    });

    it('should prevent non-participant from breaking a match', async () => {
      const match = {
        id: 'match1',
        userAId: 'user1',
        userBId: 'user2',
        status: MatchStatus.ACTIVE,
      };

      vi.mocked(prisma.match.findUnique).mockResolvedValueOnce(match as any);

      await expect(svc.breakMatch('match1', 'user3')).rejects.toThrow(ForbiddenError);
    });

    it('should throw error if match does not exist', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValueOnce(null);

      await expect(svc.breakMatch('nonexistent', 'user1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('blockMatch', () => {
    it('should allow a participant to block and mark match as blocked', async () => {
      const match = {
        id: 'match1',
        userAId: 'user1',
        userBId: 'user2',
        status: MatchStatus.ACTIVE,
      };

      vi.mocked(prisma.match.findUnique).mockResolvedValueOnce(match as any);
      vi.mocked(prisma.block.findFirst).mockResolvedValueOnce(null);
      vi.mocked(prisma.$transaction).mockResolvedValueOnce({
        ...match,
        status: MatchStatus.BLOCKED,
      });

      const result = await svc.blockMatch('match1', 'user1');

      expect(result.status).toBe(MatchStatus.BLOCKED);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should prevent blocking if a block already exists', async () => {
      const match = {
        id: 'match1',
        userAId: 'user1',
        userBId: 'user2',
        status: MatchStatus.ACTIVE,
      };

      vi.mocked(prisma.match.findUnique).mockResolvedValueOnce(match as any);
      vi.mocked(prisma.block.findFirst).mockResolvedValueOnce({ id: 'block1' } as any);

      await expect(svc.blockMatch('match1', 'user1')).rejects.toThrow(ConflictError);
    });

    it('should prevent non-participant from blocking a match', async () => {
      const match = {
        id: 'match1',
        userAId: 'user1',
        userBId: 'user2',
        status: MatchStatus.ACTIVE,
      };

      vi.mocked(prisma.match.findUnique).mockResolvedValueOnce(match as any);

      await expect(svc.blockMatch('match1', 'user3')).rejects.toThrow(ForbiddenError);
    });

    it('should throw error if match does not exist', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValueOnce(null);

      await expect(svc.blockMatch('nonexistent', 'user1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('sendLetter after break/block', () => {
    it('should prevent sending a letter if match is broken', async () => {
      const match = {
        id: 'match1',
        userAId: 'user1',
        userBId: 'user2',
        status: MatchStatus.BROKEN,
        questionsValidated: true,
        lastLetterBy: null,
        lastLetterAt: null,
        letterCountA: 0,
        letterCountB: 0,
      };

      vi.mocked(prisma.match.findUnique).mockResolvedValueOnce(match as any);

      await expect(
        svc.sendLetter('match1', 'user1', { content: 'Hello' })
      ).rejects.toThrow();
    });

    it('should prevent sending a letter if match is blocked', async () => {
      const match = {
        id: 'match1',
        userAId: 'user1',
        userBId: 'user2',
        status: MatchStatus.BLOCKED,
        questionsValidated: true,
        lastLetterBy: null,
        lastLetterAt: null,
        letterCountA: 0,
        letterCountB: 0,
      };

      vi.mocked(prisma.match.findUnique).mockResolvedValueOnce(match as any);

      await expect(
        svc.sendLetter('match1', 'user1', { content: 'Hello' })
      ).rejects.toThrow();
    });
  });
});

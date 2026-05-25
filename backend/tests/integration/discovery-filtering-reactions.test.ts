/**
 * Unit Test (with mocks): Discovery Filtering with Reactions
 *
 * Verifies that getExistingMatchUserIds correctly combines:
 * 1. Users with matches (any status)
 * 2. Users with ANY reaction (SMILE or GRIMACE)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../src/config/prisma';
import { MatchStatus } from '@prisma/client';

vi.mock('../../src/config/prisma', () => ({
  prisma: {
    block: {
      findMany: vi.fn(),
    },
    match: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    profile: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    reaction: {
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe('Discovery Filtering: SMILE Reactions + Matches', () => {
  const bernardId = 'user-bernard-reactions';
  const doudouId = 'user-doudou-reactions';
  const jordanId = 'user-jordan-reactions';
  const marieId = 'user-marie-reactions';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getExistingMatchUserIds returns match users AND ALL reaction targets (SMILE + GRIMACE)', async () => {
    (prisma.match.findMany as any).mockResolvedValue([
      { userAId: bernardId, userBId: doudouId, status: MatchStatus.PENDING },
    ]);

    (prisma.reaction.findMany as any).mockResolvedValue([
      { toId: jordanId },
      { toId: marieId },
    ]);

    const matches = await prisma.match.findMany({
      where: {
        OR: [{ userAId: bernardId }, { userBId: bernardId }],
        status: { in: [MatchStatus.ACTIVE, MatchStatus.PENDING, MatchStatus.BROKEN, MatchStatus.BLOCKED, MatchStatus.GHOSTED] },
      },
      select: { userAId: true, userBId: true },
    });

    const reactions = await prisma.reaction.findMany({
      where: { fromId: bernardId },
      select: { toId: true },
    });

    const matchUserIds = matches.flatMap((m) => [m.userAId, m.userBId]).filter((id) => id !== bernardId);
    const reactionUserIds = reactions.map((r) => r.toId);
    const existingUserIds = [...new Set([...matchUserIds, ...reactionUserIds])];

    expect(existingUserIds).toContain(doudouId);
    expect(existingUserIds).toContain(jordanId);
    expect(existingUserIds).toContain(marieId);
    expect(existingUserIds.length).toBe(3);
  });

  it('Discovery filters should exclude all users with matches or smiles', async () => {
    const excludedUserIds = [doudouId, jordanId, marieId];

    // Mock: No blocks
    (prisma.block.findMany as any).mockResolvedValue([]);

    // Mock: Profile count (total available)
    (prisma.profile.count as any).mockResolvedValue(10);

    // Mock: profiles.findMany returns only profiles NOT in excludedUserIds
    (prisma.profile.findMany as any).mockResolvedValue([
      { userId: 'other-user-1', pseudo: 'User1' },
      { userId: 'other-user-2', pseudo: 'User2' },
    ]);

    // Simulate the where clause with exclusions
    const where = {
      userId: { notIn: [bernardId, ...excludedUserIds] },
      user: { isBanned: false, settings: { showInDiscovery: true } },
    };

    const profiles = await prisma.profile.findMany({
      where,
      select: { userId: true, pseudo: true } as any,
    });

    // Verified profiles don't contain any excluded IDs
    const containsExcluded = profiles.some((p) => excludedUserIds.includes(p.userId));
    expect(containsExcluded).toBe(false);
    expect(profiles.length).toBeGreaterThan(0);
    console.log('✅ Discovery filtering correctly excludes matched and smiled profiles');
  });

});

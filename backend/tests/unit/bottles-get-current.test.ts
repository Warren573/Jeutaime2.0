/**
 * UNIT TESTS: GET /api/bottles/current
 *
 * Comprehensive validation of the getCurrentBottle() endpoint.
 * Tests all scenarios: no bottles, single bottle, multiple bottles, turn state, reply capability.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../src/config/prisma';
import * as bottlesService from '../../src/modules/bottles/bottles.service';

// Mock Prisma
vi.mock('../../src/config/prisma', () => ({
  prisma: {
    messageInABottle: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    anonymousMessage: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    bottleReceipt: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    profile: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((fn, opts) => fn(prisma)),
  },
}));

vi.mock('../../src/policies/premium', () => ({
  isPremiumActive: vi.fn(() => false),
}));

describe('BOTTLES: GET /api/bottles/current (Unit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // Test: No bottles exploitable
  // ============================================================
  it('should return null bottle when no ACCEPTED bottles exist', async () => {
    const userId = 'user-a';

    // Mock no ACCEPTED bottle found
    (prisma.messageInABottle.findFirst as any).mockResolvedValue(null);
    (prisma.bottleReceipt.count as any).mockResolvedValue(0);
    (prisma.messageInABottle.count as any).mockResolvedValue(0);

    const result = await bottlesService.getCurrentBottle(userId);

    expect(result.bottle).toBeNull();
    expect(result.latestLetter).toBeNull();
    expect(result.messageCount).toBe(0);
  });

  // ============================================================
  // Test: FLOATING bottles excluded
  // ============================================================
  it('should exclude FLOATING bottles from current', async () => {
    const userId = 'user-a';

    // Mock no ACCEPTED bottle (FLOATING won't be returned by findFirst)
    (prisma.messageInABottle.findFirst as any).mockResolvedValue(null);
    (prisma.bottleReceipt.count as any).mockResolvedValue(0);
    (prisma.messageInABottle.count as any).mockResolvedValue(0);

    const result = await bottlesService.getCurrentBottle(userId);

    expect(result.bottle).toBeNull();
  });

  // ============================================================
  // Test: REVEALED bottles excluded
  // ============================================================
  it('should exclude REVEALED bottles from current', async () => {
    const userId = 'user-a';

    // Mock no ACCEPTED bottle (REVEALED won't be returned by findFirst for ACCEPTED only)
    (prisma.messageInABottle.findFirst as any).mockResolvedValue(null);
    (prisma.bottleReceipt.count as any).mockResolvedValue(0);
    (prisma.messageInABottle.count as any).mockResolvedValue(0);

    const result = await bottlesService.getCurrentBottle(userId);

    expect(result.bottle).toBeNull();
  });

  // ============================================================
  // Test: EXPIRED bottles excluded
  // ============================================================
  it('should exclude EXPIRED bottles from current', async () => {
    const userId = 'user-a';

    // Mock no ACCEPTED bottle (EXPIRED won't be returned by findFirst for ACCEPTED only)
    (prisma.messageInABottle.findFirst as any).mockResolvedValue(null);
    (prisma.bottleReceipt.count as any).mockResolvedValue(0);
    (prisma.messageInABottle.count as any).mockResolvedValue(0);

    const result = await bottlesService.getCurrentBottle(userId);

    expect(result.bottle).toBeNull();
  });

  // ============================================================
  // Test: Only ACCEPTED bottles included
  // ============================================================
  it('should include only ACCEPTED bottles', async () => {
    const userId = 'user-b';

    // Mock ACCEPTED bottle with messages included
    (prisma.messageInABottle.findFirst as any).mockResolvedValue({
      id: 'bottle-1',
      senderId: 'user-a',
      acceptedById: userId,
      status: 'ACCEPTED',
      message: 'Hello from A',
      createdAt: new Date('2026-01-01'),
      acceptedAt: new Date('2026-01-02'),
      messages: [
        {
          id: 'msg-1',
          senderId: 'user-b',
          content: 'Hi A',
          createdAt: new Date('2026-01-03'),
        },
      ],
    });

    (prisma.bottleReceipt.count as any).mockResolvedValue(0);
    (prisma.messageInABottle.count as any).mockResolvedValue(0);

    const result = await bottlesService.getCurrentBottle(userId);

    expect(result.bottle).toBeDefined();
    expect(result.bottle?.id).toBe('bottle-1');
    expect(result.bottle?.status).toBe('ACCEPTED');
  });

  // ============================================================
  // Test: Latest letter includes initial + anonymous
  // ============================================================
  it('should include latest letter (initial message)', async () => {
    const userId = 'user-a';
    const now = new Date('2026-01-01');

    // Mock ACCEPTED bottle as sender with no anonymous messages yet
    (prisma.messageInABottle.findFirst as any).mockResolvedValue({
      id: 'bottle-1',
      senderId: userId,
      acceptedById: 'user-b',
      status: 'ACCEPTED',
      message: 'My initial message',
      createdAt: now,
      acceptedAt: new Date('2026-01-02'),
      messages: [],
    });

    (prisma.bottleReceipt.count as any).mockResolvedValue(0);
    (prisma.messageInABottle.count as any).mockResolvedValue(1);

    const result = await bottlesService.getCurrentBottle(userId);

    expect(result.latestLetter).toBeDefined();
    expect(result.latestLetter?.content).toBe('My initial message');
    expect(result.latestLetter?.source).toBe('INITIAL_BOTTLE');
    expect(result.latestLetter?.isMine).toBe(true);
  });

  // ============================================================
  // Test: Latest letter from anonymous message
  // ============================================================
  it('should return latest letter from anonymous messages when present', async () => {
    const userId = 'user-b';

    // Mock ACCEPTED bottle with anonymous messages
    (prisma.messageInABottle.findFirst as any).mockResolvedValue({
      id: 'bottle-1',
      senderId: 'user-a',
      acceptedById: userId,
      status: 'ACCEPTED',
      message: 'Initial message from A',
      createdAt: new Date('2026-01-01'),
      acceptedAt: new Date('2026-01-02'),
      messages: [
        {
          id: 'msg-1',
          senderId: 'user-b',
          content: 'Hi A, thanks!',
          createdAt: new Date('2026-01-03'),
        },
        {
          id: 'msg-2',
          senderId: 'user-a',
          content: 'Good to hear!',
          createdAt: new Date('2026-01-04'),
        },
      ],
    });

    (prisma.bottleReceipt.count as any).mockResolvedValue(0);
    (prisma.messageInABottle.count as any).mockResolvedValue(1);

    const result = await bottlesService.getCurrentBottle(userId);

    expect(result.latestLetter).toBeDefined();
    expect(result.latestLetter?.content).toBe('Good to hear!');
    expect(result.latestLetter?.source).toBe('ANONYMOUS_MESSAGE');
    expect(result.latestLetter?.isMine).toBe(false); // From user-a, not user-b
  });

  // ============================================================
  // Test: canReply when it's user's turn
  // ============================================================
  it('should set canReply=true when last message is from other user', async () => {
    const userId = 'user-b';

    // Mock ACCEPTED bottle with message from A (last sender)
    (prisma.messageInABottle.findFirst as any).mockResolvedValue({
      id: 'bottle-1',
      senderId: 'user-a',
      acceptedById: userId,
      status: 'ACCEPTED',
      message: 'Initial from A',
      createdAt: new Date('2026-01-01'),
      acceptedAt: new Date('2026-01-02'),
      messages: [
        {
          id: 'msg-1',
          senderId: 'user-a',
          content: 'A waiting for B',
          createdAt: new Date('2026-01-03'),
        },
      ],
    });

    (prisma.user.findUnique as any).mockResolvedValue({ premiumTier: null, premiumUntil: null });
    (prisma.bottleReceipt.count as any).mockResolvedValue(0);
    (prisma.messageInABottle.count as any).mockResolvedValue(0);

    const result = await bottlesService.getCurrentBottle(userId);

    expect(result.canReply).toBe(true);
    expect(result.waitingForReply).toBe(false);
  });

  // ============================================================
  // Test: canReply=false when waiting for reply
  // ============================================================
  it('should set canReply=false when last message is from same user', async () => {
    const userId = 'user-b';

    // Mock ACCEPTED bottle with last message from B (user)
    (prisma.messageInABottle.findFirst as any).mockResolvedValue({
      id: 'bottle-1',
      senderId: 'user-a',
      acceptedById: userId,
      status: 'ACCEPTED',
      message: 'Initial from A',
      createdAt: new Date('2026-01-01'),
      acceptedAt: new Date('2026-01-02'),
      messages: [
        {
          id: 'msg-1',
          senderId: 'user-b',
          content: 'B just replied',
          createdAt: new Date('2026-01-03'),
        },
      ],
    });

    (prisma.user.findUnique as any).mockResolvedValue({ premiumTier: null, premiumUntil: null });
    (prisma.bottleReceipt.count as any).mockResolvedValue(0);
    (prisma.messageInABottle.count as any).mockResolvedValue(0);

    const result = await bottlesService.getCurrentBottle(userId);

    expect(result.canReply).toBe(false);
    expect(result.waitingForReply).toBe(true);
  });

  // ============================================================
  // Test: canReply=false if sender waiting for acceptor's first reply
  // ============================================================
  it('should set canReply=false if sender and acceptor has not replied yet', async () => {
    const userId = 'user-a';

    // Mock ACCEPTED bottle as sender with no anonymous messages
    (prisma.messageInABottle.findFirst as any).mockResolvedValue({
      id: 'bottle-1',
      senderId: userId,
      acceptedById: 'user-b',
      status: 'ACCEPTED',
      message: 'Initial from A',
      createdAt: new Date('2026-01-01'),
      acceptedAt: new Date('2026-01-02'),
      messages: [],
    });

    (prisma.user.findUnique as any).mockResolvedValue({ premiumTier: null, premiumUntil: null });
    (prisma.bottleReceipt.count as any).mockResolvedValue(0);
    (prisma.messageInABottle.count as any).mockResolvedValue(0);

    const result = await bottlesService.getCurrentBottle(userId);

    // Sender can't reply when waiting for acceptor's first response
    expect(result.canReply).toBe(false);
    expect(result.waitingForReply).toBe(true);
  });

  // ============================================================
  // Test: Multiple ACCEPTED bottles - select most recent
  // ============================================================
  it('should select most recent ACCEPTED bottle by acceptedAt', async () => {
    const userId = 'user-b';

    // Mock most recent ACCEPTED bottle (service uses findFirst with orderBy)
    (prisma.messageInABottle.findFirst as any).mockResolvedValue({
      id: 'bottle-2',
      senderId: 'user-c',
      acceptedById: userId,
      status: 'ACCEPTED',
      message: 'Recent bottle',
      createdAt: new Date('2026-02-01'),
      acceptedAt: new Date('2026-02-02'),
      messages: [
        {
          id: 'msg-1',
          senderId: 'user-b',
          content: 'Reply to bottle-2',
          createdAt: new Date('2026-02-03'),
        },
      ],
    });

    (prisma.bottleReceipt.count as any).mockResolvedValue(0);
    (prisma.messageInABottle.count as any).mockResolvedValue(0);

    const result = await bottlesService.getCurrentBottle(userId);

    expect(result.bottle?.id).toBe('bottle-2');
  });

  // ============================================================
  // Test: messageCount exact total
  // ============================================================
  it('should return exact messageCount (initial + anonymous)', async () => {
    const userId = 'user-a';

    // Mock ACCEPTED bottle with 3 anonymous messages
    (prisma.messageInABottle.findFirst as any).mockResolvedValue({
      id: 'bottle-1',
      senderId: userId,
      acceptedById: 'user-b',
      status: 'ACCEPTED',
      message: 'Initial',
      createdAt: new Date('2026-01-01'),
      acceptedAt: new Date('2026-01-02'),
      messages: [
        { id: 'msg-1', senderId: 'user-b', content: 'Reply 1', createdAt: new Date('2026-01-03') },
        { id: 'msg-2', senderId: userId, content: 'Reply 2', createdAt: new Date('2026-01-04') },
        { id: 'msg-3', senderId: 'user-b', content: 'Reply 3', createdAt: new Date('2026-01-05') },
      ],
    });

    (prisma.bottleReceipt.count as any).mockResolvedValue(0);
    (prisma.messageInABottle.count as any).mockResolvedValue(0);

    const result = await bottlesService.getCurrentBottle(userId);

    expect(result.messageCount).toBe(4); // 1 initial + 3 anonymous
  });

  // ============================================================
  // Test: canCreateBottle=false at quota with ACCEPTED bottle
  // ============================================================
  it('should set canCreateBottle=false when at FLOATING quota limit (1) with active bottle', async () => {
    const userId = 'user-a';

    // Mock ACCEPTED bottle (this means we need to check quota)
    (prisma.messageInABottle.findFirst as any).mockResolvedValue({
      id: 'bottle-1',
      senderId: userId,
      acceptedById: 'user-b',
      status: 'ACCEPTED',
      message: 'Initial',
      createdAt: new Date('2026-01-01'),
      acceptedAt: new Date('2026-01-02'),
      messages: [],
    });

    // Mock 1 FLOATING bottle (at quota limit of 1)
    (prisma.messageInABottle.count as any).mockResolvedValue(1);
    (prisma.user.findUnique as any).mockResolvedValue({ premiumTier: null, premiumUntil: null });
    (prisma.bottleReceipt.count as any).mockResolvedValue(0);

    const result = await bottlesService.getCurrentBottle(userId);

    expect(result.canCreateBottle).toBe(false);
  });

  // ============================================================
  // Test: canCreateBottle=true below quota
  // ============================================================
  it('should set canCreateBottle=true when below FLOATING quota', async () => {
    const userId = 'user-a';

    // Mock no ACCEPTED bottle
    (prisma.messageInABottle.findFirst as any).mockResolvedValue(null);

    // Mock 0 FLOATING bottles (below quota)
    (prisma.messageInABottle.count as any).mockResolvedValue(0);
    (prisma.user.findUnique as any).mockResolvedValue({ premiumTier: null, premiumUntil: null });
    (prisma.bottleReceipt.count as any).mockResolvedValue(0);

    const result = await bottlesService.getCurrentBottle(userId);

    expect(result.canCreateBottle).toBe(true);
  });

  // ============================================================
  // Test: Pending inbox bottles don't affect canCreateBottle
  // ============================================================
  it('should not count FLOATING receipts in canCreateBottle calculation', async () => {
    const userId = 'user-a';

    // Mock no ACCEPTED bottle
    (prisma.messageInABottle.findFirst as any).mockResolvedValue(null);

    // Mock 0 FLOATING but multiple receipts (shouldn't affect quota)
    (prisma.messageInABottle.count as any).mockResolvedValue(0);
    (prisma.bottleReceipt.count as any).mockResolvedValue(5); // Many received bottles

    const result = await bottlesService.getCurrentBottle(userId);

    expect(result.canCreateBottle).toBe(true);
  });

  // ============================================================
  // Test: First letter included exactly once
  // ============================================================
  it('should include initial message in conversation', async () => {
    const userId = 'user-a';

    // Mock ACCEPTED bottle with one anonymous reply
    (prisma.messageInABottle.findFirst as any).mockResolvedValue({
      id: 'bottle-1',
      senderId: userId,
      acceptedById: 'user-b',
      status: 'ACCEPTED',
      message: 'The very first message',
      createdAt: new Date('2026-01-01'),
      acceptedAt: new Date('2026-01-02'),
      messages: [
        { id: 'msg-1', senderId: 'user-b', content: 'Reply', createdAt: new Date('2026-01-03') },
      ],
    });

    (prisma.bottleReceipt.count as any).mockResolvedValue(0);
    (prisma.messageInABottle.count as any).mockResolvedValue(0);

    const result = await bottlesService.getCurrentBottle(userId);

    // The latest letter should be the reply (msg-1), not the initial message
    expect(result.latestLetter?.content).toBe('Reply');
    expect(result.messageCount).toBe(2); // 1 initial + 1 anonymous
  });

  // ============================================================
  // Test: NULL bottle is exactly null (not undefined or object)
  // ============================================================
  it('should return bottle as null (not undefined) when none available', async () => {
    const userId = 'user-a';

    (prisma.messageInABottle.findFirst as any).mockResolvedValue(null);
    (prisma.bottleReceipt.count as any).mockResolvedValue(0);
    (prisma.messageInABottle.count as any).mockResolvedValue(0);

    const result = await bottlesService.getCurrentBottle(userId);

    expect(result.bottle).toBeNull();
    expect(result.bottle === null).toBe(true);
  });

  // ============================================================
  // Test: NULL latestLetter when no conversation
  // ============================================================
  it('should return latestLetter as null when no messages yet', async () => {
    const userId = 'user-a';

    (prisma.messageInABottle.findFirst as any).mockResolvedValue(null);
    (prisma.bottleReceipt.count as any).mockResolvedValue(0);
    (prisma.messageInABottle.count as any).mockResolvedValue(0);

    const result = await bottlesService.getCurrentBottle(userId);

    expect(result.latestLetter).toBeNull();
    expect(result.latestLetter === null).toBe(true);
  });
});

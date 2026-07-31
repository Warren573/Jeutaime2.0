/**
 * UNIT TESTS: Turn-by-Turn Correspondence with Mocks
 *
 * Tests the core turn-by-turn logic without requiring a database.
 * Validates: message ordering, turn verification, error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../src/config/prisma';
import * as bottlesService from '../../src/modules/bottles/bottles.service';

// Mock Prisma
vi.mock('../../src/config/prisma', () => ({
  prisma: {
    messageInABottle: {
      findUnique: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
    anonymousMessage: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
    },
    profile: {
      findUnique: vi.fn(),
    },
    bottleReceipt: {
      createMany: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((fn, opts) => fn(prisma)),
  },
}));

vi.mock('../../src/policies/premium', () => ({
  isPremiumActive: vi.fn(() => false),
}));

describe('BOTTLES: Turn-by-Turn Logic (Unit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // Test: Cannot post if last message is from same user
  // ============================================================
  it('should reject message if last message is from same user', async () => {
    const bottleId = 'bottle-1';
    const senderId = 'user-a';

    // Mock bottle exists and is ACCEPTED
    (prisma.messageInABottle.findUnique as any).mockResolvedValue({
      id: bottleId,
      senderId: 'user-a', // A is the sender
      acceptedById: 'user-b',
      status: 'ACCEPTED',
      message: 'Initial message from A',
      createdAt: new Date(),
    });

    // Mock last message is from the same user (A)
    (prisma.anonymousMessage.findFirst as any).mockResolvedValue({
      id: 'msg-1',
      senderId: 'user-a', // Last message is from A
      content: 'Previous message from A',
      createdAt: new Date(),
    });

    let errorThrown = false;
    let errorCode = '';

    try {
      await bottlesService.postMessage(bottleId, senderId, 'A tries to respond again');
    } catch (error: any) {
      errorThrown = true;
      errorCode = error.code;
    }

    expect(errorThrown).toBe(true);
    expect(errorCode).toBe('LETTER_TURN_VIOLATION');
  });

  // ============================================================
  // Test: Can post if last message is from other user
  // ============================================================
  it('should allow message if last message is from other user', async () => {
    const bottleId = 'bottle-1';
    const senderId = 'user-b';

    // Mock bottle exists and is ACCEPTED
    (prisma.messageInABottle.findUnique as any).mockResolvedValue({
      id: bottleId,
      senderId: 'user-a',
      acceptedById: 'user-b',
      status: 'ACCEPTED',
      message: 'Initial message from A',
      createdAt: new Date(),
    });

    // Mock last message is from the other user (A)
    (prisma.anonymousMessage.findFirst as any).mockResolvedValue({
      id: 'msg-1',
      senderId: 'user-a', // Last message is from A
      content: 'Message from A',
      createdAt: new Date(),
    });

    // Mock create to return the new message
    (prisma.anonymousMessage.create as any).mockResolvedValue({
      id: 'msg-2',
      bottleId,
      senderId: 'user-b',
      content: 'B\'s response',
      idempotencyKey: null,
      createdAt: new Date(),
    });

    const message = await bottlesService.postMessage(
      bottleId,
      senderId,
      'B\'s response',
      undefined,
    );

    expect(message).toBeDefined();
    expect(message.senderId).toBe('user-b');
    expect((prisma.anonymousMessage.create as any)).toHaveBeenCalled();
  });

  // ============================================================
  // Test: Can post if no anonymous messages yet
  // ============================================================
  it('should allow first reply if no anonymous messages exist', async () => {
    const bottleId = 'bottle-1';
    const senderId = 'user-b';

    // Mock bottle exists and is ACCEPTED
    (prisma.messageInABottle.findUnique as any).mockResolvedValue({
      id: bottleId,
      senderId: 'user-a',
      acceptedById: 'user-b',
      status: 'ACCEPTED',
      message: 'Initial message from A',
      createdAt: new Date(),
    });

    // Mock no anonymous messages (first reply)
    (prisma.anonymousMessage.findFirst as any).mockResolvedValue(null);

    // Mock create to return the new message
    (prisma.anonymousMessage.create as any).mockResolvedValue({
      id: 'msg-1',
      bottleId,
      senderId: 'user-b',
      content: 'B\'s first reply',
      idempotencyKey: null,
      createdAt: new Date(),
    });

    const message = await bottlesService.postMessage(
      bottleId,
      senderId,
      'B\'s first reply',
      undefined,
    );

    expect(message).toBeDefined();
    expect(message.senderId).toBe('user-b');
  });

  // ============================================================
  // Test: Cannot post to non-active bottle
  // ============================================================
  it('should reject message to non-active bottle', async () => {
    const bottleId = 'bottle-1';
    const senderId = 'user-a';

    // Mock bottle exists but is EXPIRED
    (prisma.messageInABottle.findUnique as any).mockResolvedValue({
      id: bottleId,
      senderId: 'user-a',
      acceptedById: 'user-b',
      status: 'EXPIRED', // Not ACCEPTED
      message: 'Expired bottle',
      createdAt: new Date(),
    });

    let errorThrown = false;
    let errorCode = '';

    try {
      await bottlesService.postMessage(bottleId, senderId, 'Should fail');
    } catch (error: any) {
      errorThrown = true;
      errorCode = error.code;
    }

    expect(errorThrown).toBe(true);
    expect(errorCode).toBe('BOTTLE_NOT_ACTIVE');
  });

  // ============================================================
  // Test: Cannot post if not a participant
  // ============================================================
  it('should reject message from non-participant', async () => {
    const bottleId = 'bottle-1';
    const senderId = 'user-c'; // Third party

    // Mock bottle exists
    (prisma.messageInABottle.findUnique as any).mockResolvedValue({
      id: bottleId,
      senderId: 'user-a',
      acceptedById: 'user-b',
      status: 'ACCEPTED',
      message: 'Valid bottle',
      createdAt: new Date(),
    });

    let errorThrown = false;
    let errorCode = '';

    try {
      await bottlesService.postMessage(bottleId, senderId, 'Trying to join');
    } catch (error: any) {
      errorThrown = true;
      errorCode = error.code;
    }

    expect(errorThrown).toBe(true);
    expect(errorCode).toBe('NOT_BOTTLE_PARTICIPANT');
  });

  // ============================================================
  // Test: Idempotency - same key not twice
  // ============================================================
  it('should reject duplicate idempotency key', async () => {
    const bottleId = 'bottle-1';
    const senderId = 'user-b';
    const idempotencyKey = 'key-1';

    // Mock bottle exists and is ACCEPTED
    (prisma.messageInABottle.findUnique as any).mockResolvedValue({
      id: bottleId,
      senderId: 'user-a',
      acceptedById: 'user-b',
      status: 'ACCEPTED',
      message: 'Initial message',
      createdAt: new Date(),
    });

    // Mock no recent anonymous messages (can reply)
    (prisma.anonymousMessage.findFirst as any).mockImplementation((args: any) => {
      // When checking for last sender
      if (args.orderBy?.createdAt === 'desc') {
        return Promise.resolve(null);
      }
      // When checking for duplicate idempotency key
      if (args.where?.idempotencyKey) {
        return Promise.resolve({
          id: 'msg-1',
          senderId,
          idempotencyKey,
          content: 'Existing message',
          createdAt: new Date(),
        });
      }
      return Promise.resolve(null);
    });

    let errorThrown = false;
    let errorCode = '';

    try {
      await bottlesService.postMessage(bottleId, senderId, 'Retry message', idempotencyKey);
    } catch (error: any) {
      errorThrown = true;
      errorCode = error.code;
    }

    expect(errorThrown).toBe(true);
    expect(errorCode).toBe('DUPLICATE_LETTER_REQUEST');
  });

  // ============================================================
  // Test: Bottle not found
  // ============================================================
  it('should return BOTTLE_NOT_FOUND when bottle doesn\'t exist', async () => {
    const bottleId = 'nonexistent';
    const senderId = 'user-a';

    // Mock bottle doesn't exist
    (prisma.messageInABottle.findUnique as any).mockResolvedValue(null);

    let errorThrown = false;
    let errorCode = '';

    try {
      await bottlesService.postMessage(bottleId, senderId, 'Message');
    } catch (error: any) {
      errorThrown = true;
      errorCode = error.code;
    }

    expect(errorThrown).toBe(true);
    expect(errorCode).toBe('BOTTLE_NOT_FOUND');
  });

  // ============================================================
  // Test: getMessages includes both initial and anonymous
  // ============================================================
  it('should include both initial message and anonymous messages', async () => {
    const bottleId = 'bottle-1';
    const userId = 'user-a';

    // Mock bottle exists and user is participant
    (prisma.messageInABottle.findUnique as any).mockResolvedValue({
      id: bottleId,
      senderId: userId,
      acceptedById: 'user-b',
      status: 'ACCEPTED',
      message: 'Initial message from A',
      createdAt: new Date('2024-01-01'),
    });

    // Mock anonymous messages
    (prisma.anonymousMessage.findMany as any).mockResolvedValue([
      {
        id: 'msg-1',
        bottleId,
        senderId: 'user-b',
        content: 'B\'s reply',
        createdAt: new Date('2024-01-02'),
      },
      {
        id: 'msg-2',
        bottleId,
        senderId: userId,
        content: 'A\'s reply',
        createdAt: new Date('2024-01-03'),
      },
    ]);

    const result = await bottlesService.getMessages(bottleId, userId);

    expect(result.messages).toHaveLength(3);
    expect(result.messages[0].source).toBe('INITIAL_BOTTLE');
    expect(result.messages[0].id).toBe(bottleId);
    expect(result.messages[0].isMine).toBe(true);

    expect(result.messages[1].source).toBe('ANONYMOUS_MESSAGE');
    expect(result.messages[1].isMine).toBe(false);

    expect(result.messages[2].source).toBe('ANONYMOUS_MESSAGE');
    expect(result.messages[2].isMine).toBe(true);
  });

  // ============================================================
  // Test: getMessages rejects non-participant
  // ============================================================
  it('should reject non-participant reading messages', async () => {
    const bottleId = 'bottle-1';
    const userId = 'user-c'; // Not a participant

    // Mock bottle exists but user is not a participant
    (prisma.messageInABottle.findUnique as any).mockResolvedValue({
      id: bottleId,
      senderId: 'user-a',
      acceptedById: 'user-b',
      status: 'ACCEPTED',
      message: 'Message',
      createdAt: new Date(),
    });

    let errorThrown = false;
    let errorCode = '';

    try {
      await bottlesService.getMessages(bottleId, userId);
    } catch (error: any) {
      errorThrown = true;
      errorCode = error.code;
    }

    expect(errorThrown).toBe(true);
    expect(errorCode).toBe('NOT_BOTTLE_PARTICIPANT');
  });
});

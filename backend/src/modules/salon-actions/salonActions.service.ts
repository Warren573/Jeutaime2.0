import { prisma } from '../../config/prisma';
import { SalonMessage } from '@prisma/client';

interface ActionResult {
  success: boolean;
  message?: string;
  level?: number;
  participant?: {
    userId: string;
    pseudo: string;
    drinkLevel: number;
    eatLevel: number;
  };
}

const DRINK_EMOJIS = ['', '🍷', '🍺', '🍹', '🤢', '🎉'];
const EAT_EMOJIS = ['', '🥐', '🍽️', '😋', '🤰', '🎪'];

const DRINK_MESSAGES = [
  '',
  '{pseudo} prend un petit verre',
  '{pseudo} se verse un bon verre',
  '{pseudo} a les joues un peu rouges',
  '{pseudo} tangue légèrement',
  '{pseudo} danse en rond!',
];

const EAT_MESSAGES = [
  '',
  '{pseudo} grigote un petit snack',
  '{pseudo} se commande un repas',
  '{pseudo} est bien nourri',
  '{pseudo} a un peu trop mangé',
  '{pseudo} danse en rond!',
];

// Cooldown: une action par utilisateur toutes les 10 secondes
const ACTION_COOLDOWN_MS = 10000;

export async function performDrinkAction(
  sessionId: string,
  userId: string,
  userPseudo: string,
): Promise<ActionResult> {
  const participant = await prisma.salonSessionParticipant.findUnique({
    where: {
      sessionId_userId: { sessionId, userId },
    },
  });

  if (!participant) {
    return { success: false, message: 'Participant not found' };
  }

  // Check cooldown
  const lastAction = participant.drinkLastActionAt;
  if (lastAction && Date.now() - lastAction.getTime() < ACTION_COOLDOWN_MS) {
    return { success: false, message: 'Action cooldown in progress' };
  }

  // Increment level (cap at 5)
  const newLevel = Math.min(participant.drinkLevel + 1, 5);

  // Auto-reset after 60 seconds at level 5
  let resetAt: Date | null = null;
  if (newLevel === 5) {
    resetAt = new Date(Date.now() + 60000);
  }

  // Update participant
  const updated = await prisma.salonSessionParticipant.update({
    where: { id: participant.id },
    data: {
      drinkLevel: newLevel,
      drinkLastActionAt: new Date(),
      // Note: auto-reset logic handled via polling on frontend
    },
  });

  // Create system message
  const emoji = DRINK_EMOJIS[newLevel] || '🍷';
  const msgTemplate = DRINK_MESSAGES[newLevel] || DRINK_MESSAGES[1];
  const content = `${emoji} ${msgTemplate.replace('{pseudo}', userPseudo)}`;

  // Get salon from session
  const session = await prisma.salonSession.findUnique({
    where: { id: sessionId },
    select: { salonKind: true },
  });

  const salon = await prisma.salon.findUnique({
    where: { kind: session?.salonKind },
    select: { id: true },
  });

  await prisma.salonMessage.create({
    data: {
      salonId: salon?.id || '',
      sessionId,
      userId: 'system',
      pseudo: 'JeuTaime',
      gender: 'M',
      kind: 'system',
      content,
      createdAt: new Date(),
      meta: {
        actionType: 'drink',
        level: newLevel,
      } as any,
    },
  });

  return {
    success: true,
    level: newLevel,
    participant: {
      userId: updated.userId,
      pseudo: userPseudo,
      drinkLevel: updated.drinkLevel,
      eatLevel: updated.eatLevel,
    },
  };
}

export async function performEatAction(
  sessionId: string,
  userId: string,
  userPseudo: string,
): Promise<ActionResult> {
  const participant = await prisma.salonSessionParticipant.findUnique({
    where: {
      sessionId_userId: { sessionId, userId },
    },
  });

  if (!participant) {
    return { success: false, message: 'Participant not found' };
  }

  // Check cooldown
  const lastAction = participant.eatLastActionAt;
  if (lastAction && Date.now() - lastAction.getTime() < ACTION_COOLDOWN_MS) {
    return { success: false, message: 'Action cooldown in progress' };
  }

  // Increment level (cap at 5)
  const newLevel = Math.min(participant.eatLevel + 1, 5);

  // Update participant
  const updated = await prisma.salonSessionParticipant.update({
    where: { id: participant.id },
    data: {
      eatLevel: newLevel,
      eatLastActionAt: new Date(),
    },
  });

  // Create system message
  const emoji = EAT_EMOJIS[newLevel] || '🥐';
  const msgTemplate = EAT_MESSAGES[newLevel] || EAT_MESSAGES[1];
  const content = `${emoji} ${msgTemplate.replace('{pseudo}', userPseudo)}`;

  // Get salon from session
  const session = await prisma.salonSession.findUnique({
    where: { id: sessionId },
    select: { salonKind: true },
  });

  const salon = await prisma.salon.findUnique({
    where: { kind: session?.salonKind },
    select: { id: true },
  });

  await prisma.salonMessage.create({
    data: {
      salonId: salon?.id || '',
      sessionId,
      userId: 'system',
      pseudo: 'JeuTaime',
      gender: 'M',
      kind: 'system',
      content,
      createdAt: new Date(),
      meta: {
        actionType: 'eat',
        level: newLevel,
      } as any,
    },
  });

  return {
    success: true,
    level: newLevel,
    participant: {
      userId: updated.userId,
      pseudo: userPseudo,
      drinkLevel: updated.drinkLevel,
      eatLevel: updated.eatLevel,
    },
  };
}

export async function resetDrinkLevelIfExpired(
  sessionId: string,
  userId: string,
): Promise<void> {
  const participant = await prisma.salonSessionParticipant.findUnique({
    where: {
      sessionId_userId: { sessionId, userId },
    },
  });

  if (!participant || participant.drinkLevel === 0) return;

  // Reset if level 5 and 60 seconds passed, or if 120 seconds passed
  const lastAction = participant.drinkLastActionAt?.getTime() || 0;
  const elapsed = Date.now() - lastAction;

  if ((participant.drinkLevel === 5 && elapsed > 60000) || elapsed > 120000) {
    await prisma.salonSessionParticipant.update({
      where: { id: participant.id },
      data: { drinkLevel: 0 },
    });
  }
}

export async function resetEatLevelIfExpired(
  sessionId: string,
  userId: string,
): Promise<void> {
  const participant = await prisma.salonSessionParticipant.findUnique({
    where: {
      sessionId_userId: { sessionId, userId },
    },
  });

  if (!participant || participant.eatLevel === 0) return;

  // Reset if level 5 and 60 seconds passed, or if 120 seconds passed
  const lastAction = participant.eatLastActionAt?.getTime() || 0;
  const elapsed = Date.now() - lastAction;

  if ((participant.eatLevel === 5 && elapsed > 60000) || elapsed > 120000) {
    await prisma.salonSessionParticipant.update({
      where: { id: participant.id },
      data: { eatLevel: 0 },
    });
  }
}

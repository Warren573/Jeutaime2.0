import { prisma } from "../../config/prisma";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../core/errors";

export async function listMine(userId: string) {
  const invites = await prisma.privateSalonInvitation.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const sessionIds = [...new Set(invites.map((i) => i.sessionId))];
  const sessions = await prisma.salonSession.findMany({
    where: { id: { in: sessionIds }, isPrivate: true },
    select: {
      id: true,
      salonKind: true,
      privateName: true,
      startedAt: true,
      expiresAt: true,
      status: true,
      salon: { select: { id: true, name: true, kind: true } },
    },
  });
  const sessionMap = new Map(sessions.map((s) => [s.id, s]));

  return invites
    .map((invite) => {
      const session = sessionMap.get(invite.sessionId);
      if (!session) return null;
      return {
        id: invite.id,
        sessionId: invite.sessionId,
        accepted: invite.accepted,
        acceptedAt: invite.acceptedAt,
        createdAt: invite.createdAt,
        session: {
          id: session.id,
          name: session.privateName ?? "Salon privé",
          salonKind: session.salonKind,
          salonId: session.salon.id,
          salonName: session.salon.name,
          startedAt: session.startedAt,
          expiresAt: session.expiresAt,
          status: session.status,
        },
      };
    })
    .filter(Boolean);
}

export async function acceptInvitation(userId: string, inviteId: string) {
  const invite = await prisma.privateSalonInvitation.findUnique({
    where: { id: inviteId },
  });
  if (!invite) throw new NotFoundError("Invitation");
  if (invite.userId !== userId) throw new ForbiddenError("Cette invitation ne t'appartient pas");

  const session = await prisma.salonSession.findUnique({
    where: { id: invite.sessionId },
    include: { salon: { select: { id: true, name: true, kind: true } } },
  });
  if (!session || !session.isPrivate) throw new NotFoundError("Salon privé");
  if (session.status !== "ACTIVE" || session.expiresAt <= new Date()) {
    throw new BadRequestError("Cette invitation a expiré");
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.privateSalonInvitation.update({
      where: { id: inviteId },
      data: { accepted: true, acceptedAt: invite.acceptedAt ?? now },
    }),
    prisma.salonSessionParticipant.upsert({
      where: { sessionId_userId: { sessionId: session.id, userId } },
      update: { status: "ACTIVE", leftAt: null },
      create: { sessionId: session.id, userId, status: "ACTIVE" },
    }),
  ]);

  return {
    sessionId: session.id,
    privateName: session.privateName ?? "Salon privé",
    salonKind: session.salonKind,
    salonId: session.salon.id,
    salonName: session.salon.name,
    expiresAt: session.expiresAt,
  };
}

export async function getPrivateSession(userId: string, sessionId: string) {
  const invite = await prisma.privateSalonInvitation.findUnique({
    where: { sessionId_userId: { sessionId, userId } },
  });
  if (!invite || !invite.accepted) throw new ForbiddenError("Tu n'as pas accès à ce salon privé");

  const session = await prisma.salonSession.findUnique({
    where: { id: sessionId },
    include: {
      salon: { select: { id: true, name: true, kind: true } },
      participants: {
        where: { status: "ACTIVE" },
        select: {
          userId: true,
          joinedAt: true,
          user: {
            select: {
              email: true,
              profile: { select: { pseudo: true, gender: true, avatarConfig: true } },
            },
          },
        },
      },
    },
  });
  if (!session || !session.isPrivate) throw new NotFoundError("Salon privé");

  return {
    id: session.id,
    privateName: session.privateName ?? "Salon privé",
    salonId: session.salon.id,
    salonName: session.salon.name,
    salonKind: session.salonKind,
    startedAt: session.startedAt,
    expiresAt: session.expiresAt,
    status: session.status,
    participants: session.participants.map((p) => ({
      userId: p.userId,
      pseudo: p.user.profile?.pseudo ?? "Utilisateur",
      gender: p.user.profile?.gender ?? null,
      avatarConfig: p.user.profile?.avatarConfig ?? null,
      joinedAt: p.joinedAt,
    })),
  };
}

import { NotificationType, Prisma, SalonKind } from "@prisma/client";
import { prisma } from "../../../config/prisma";
import { NotFoundError } from "../../../core/errors";
import { createNotification } from "../../notifications/notifications.service";
import { sendPushToUser } from "../../notifications/push.service";
import { writeAudit } from "../admin.audit";

export async function sendAdminMessage(
  adminId: string,
  userId: string,
  subject: string | undefined,
  message: string,
) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true } });
  if (!user) throw new NotFoundError("Utilisateur");

  const created = await prisma.adminMessage.create({
    data: {
      adminId,
      userId,
      subject: subject ?? null,
      message,
    },
  });

  await createNotification({
    userId,
    type: NotificationType.ADMIN_MESSAGE,
    meta: { adminMessageId: created.id },
  });

  void sendPushToUser({
    userId,
    title: "JeuTaime · Administration",
    body: subject ? `${subject} — nouveau message` : "Tu as reçu un message de l’administration",
    data: { route: "/admin-messages", adminMessageId: created.id },
  });

  await writeAudit({
    actorId: adminId,
    action: "admin.user.message.send",
    target: userId,
    meta: {
      adminMessageId: created.id,
      subject: subject ?? null,
    } as Prisma.InputJsonValue,
  });

  return created;
}

export async function listMessagesForUser(userId: string) {
  return prisma.adminMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function createPrivateSalon(
  adminId: string,
  input: { name: string; salonKind: string; durationDays: number },
) {
  const salon = await prisma.salon.findUnique({
    where: { kind: input.salonKind as SalonKind },
    select: { id: true, kind: true, name: true },
  });
  if (!salon) throw new NotFoundError("Salon modèle");

  const expiresAt = new Date(Date.now() + input.durationDays * 24 * 60 * 60 * 1000);
  const session = await prisma.salonSession.create({
    data: {
      salonKind: salon.kind,
      expiresAt,
      status: "ACTIVE",
      isPrivate: true,
      ownerId: adminId,
      privateName: input.name,
    },
    select: {
      id: true,
      salonKind: true,
      privateName: true,
      startedAt: true,
      expiresAt: true,
      status: true,
      isPrivate: true,
    },
  });

  await writeAudit({
    actorId: adminId,
    action: "admin.private_salon.create",
    target: session.id,
    meta: {
      name: input.name,
      salonKind: input.salonKind,
      durationDays: input.durationDays,
    } as Prisma.InputJsonValue,
  });

  return session;
}

export async function listPrivateSalons() {
  return prisma.salonSession.findMany({
    where: { isPrivate: true },
    orderBy: { startedAt: "desc" },
    take: 100,
    select: {
      id: true,
      salonKind: true,
      privateName: true,
      startedAt: true,
      expiresAt: true,
      status: true,
      ownerId: true,
      invitations: false as never,
    } as any,
  }).then(async (sessions: any[]) => {
    return Promise.all(sessions.map(async (s) => {
      const [invites, participants] = await Promise.all([
        prisma.privateSalonInvitation.findMany({
          where: { sessionId: s.id },
          orderBy: { createdAt: "asc" },
        }),
        prisma.salonSessionParticipant.findMany({
          where: { sessionId: s.id, status: "ACTIVE" },
          select: {
            userId: true,
            joinedAt: true,
            user: { select: { email: true, profile: { select: { pseudo: true } } } },
          },
        }),
      ]);
      return {
        ...s,
        invitedCount: invites.length,
        acceptedCount: invites.filter((i) => i.accepted).length,
        participants: participants.map((p) => ({
          userId: p.userId,
          pseudo: p.user.profile?.pseudo ?? null,
          email: p.user.email,
          joinedAt: p.joinedAt,
        })),
      };
    }));
  });
}

export async function inviteToPrivateSalon(adminId: string, sessionId: string, userId: string) {
  const [session, user] = await Promise.all([
    prisma.salonSession.findUnique({ where: { id: sessionId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
  ]);
  if (!session || !session.isPrivate) throw new NotFoundError("Salon privé");
  if (!user) throw new NotFoundError("Utilisateur");

  const invite = await prisma.privateSalonInvitation.upsert({
    where: { sessionId_userId: { sessionId, userId } },
    update: { invitedBy: adminId },
    create: { sessionId, userId, invitedBy: adminId },
  });

  await createNotification({
    userId,
    type: NotificationType.PRIVATE_SALON_INVITE,
    meta: { privateSalonSessionId: sessionId },
  });

  void sendPushToUser({
    userId,
    title: "JeuTaime · Invitation",
    body: `Tu es invité(e) dans ${session.privateName ?? "un salon privé"}`,
    data: { route: "/private-salons", privateSalonSessionId: sessionId },
  });

  await writeAudit({
    actorId: adminId,
    action: "admin.private_salon.invite",
    target: userId,
    meta: { sessionId, inviteId: invite.id } as Prisma.InputJsonValue,
  });

  return invite;
}

export async function removeFromPrivateSalon(adminId: string, sessionId: string, userId: string) {
  const session = await prisma.salonSession.findUnique({ where: { id: sessionId } });
  if (!session || !session.isPrivate) throw new NotFoundError("Salon privé");

  await prisma.$transaction([
    prisma.privateSalonInvitation.deleteMany({ where: { sessionId, userId } }),
    prisma.salonSessionParticipant.updateMany({
      where: { sessionId, userId, status: "ACTIVE" },
      data: { status: "LEFT", leftAt: new Date() },
    }),
  ]);

  await writeAudit({
    actorId: adminId,
    action: "admin.private_salon.remove",
    target: userId,
    meta: { sessionId } as Prisma.InputJsonValue,
  });

  return { success: true };
}

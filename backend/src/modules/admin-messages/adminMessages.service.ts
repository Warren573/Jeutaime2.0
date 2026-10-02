import { prisma } from "../../config/prisma";
import { ForbiddenError, NotFoundError } from "../../core/errors";

export async function listMine(userId: string) {
  return prisma.adminMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function markRead(userId: string, id: string) {
  const message = await prisma.adminMessage.findUnique({ where: { id } });
  if (!message) throw new NotFoundError("Message administration");
  if (message.userId !== userId) throw new ForbiddenError("Ce message ne t'appartient pas");

  if (message.isRead) return message;

  return prisma.adminMessage.update({
    where: { id },
    data: { isRead: true, readAt: new Date() },
  });
}

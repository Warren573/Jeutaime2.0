import {
  Notification,
  NotificationType,
  Prisma,
} from "@prisma/client";
import { prisma } from "../../config/prisma";
import { NotFoundError } from "../../core/errors";
import {
  assertNotificationOwnership,
  buildNotificationMessage,
  sanitizeNotificationMeta,
  type NotificationMeta,
} from "../../policies/notifications";
import type { ListNotificationsQueryDto } from "./notifications.schemas";

// ============================================================
// DTO renvoyé au client
// ============================================================
export interface NotificationDto {
  id: string;
  type: NotificationType;
  message: string;
  meta: NotificationMeta | null;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}

function toDto(n: Notification): NotificationDto {
  return {
    id: n.id,
    type: n.type,
    message: n.message,
    meta: (n.meta as NotificationMeta | null) ?? null,
    isRead: n.isRead,
    readAt: n.readAt,
    createdAt: n.createdAt,
  };
}

// ============================================================
// createNotification
// Appelée par les event handlers. Le message est toujours généré via
// la policy pure (jamais passé par l'appelant), et le meta est
// sanitizé contre toute fuite accidentelle d'info sensible.
// ============================================================
export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  meta?: Record<string, unknown> | null;
}): Promise<NotificationDto> {
  const cleanMeta = sanitizeNotificationMeta(params.meta);
  const created = await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      message: buildNotificationMessage(params.type),
      meta: cleanMeta as Prisma.InputJsonValue | undefined,
    },
  });
  return toDto(created);
}

// ============================================================
// listMine — paginé
// ============================================================
export async function listMine(
  userId: string,
  query: ListNotificationsQueryDto,
): Promise<{
  items: NotificationDto[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const where: Prisma.NotificationWhereInput = { userId };
  if (query.unreadOnly) where.isRead = false;
  if (query.type) where.type = query.type;

  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    items: items.map(toDto),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

// ============================================================
// unreadCount
// ============================================================
export async function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

// ============================================================
// markAsRead — idempotent
// Si déjà lue, on renvoie l'objet tel quel sans toucher la DB.
// Si 404, NotFoundError.
// Si appartient à un autre user, ForbiddenError via la policy.
// ============================================================
export async function markAsRead(
  userId: string,
  notificationId: string,
): Promise<NotificationDto> {
  const existing = await prisma.notification.findUnique({
    where: { id: notificationId },
  });
  if (!existing) throw new NotFoundError("Notification");

  assertNotificationOwnership(existing.userId, userId);

  if (existing.isRead) {
    // Idempotent : pas de write, on renvoie tel quel.
    return toDto(existing);
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true, readAt: new Date() },
  });
  return toDto(updated);
}

// ============================================================
// markAllAsRead — atomique
// updateMany filtré sur {userId, isRead: false} — garantit qu'on ne
// touche QUE les notifs non lues de CE user.
// Retourne le nombre de lignes mises à jour.
// ============================================================
export async function markAllAsRead(
  userId: string,
): Promise<{ updated: number }> {
  const now = new Date();
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: now },
  });
  return { updated: result.count };
}

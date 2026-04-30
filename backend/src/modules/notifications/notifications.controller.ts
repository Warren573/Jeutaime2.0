import { Response } from "express";
import { AuthedRequest } from "../../core/types";
import * as svc from "./notifications.service";
import { registerDeviceToken } from "./push.service";
import type {
  ListNotificationsQueryDto,
  NotificationIdParamsDto,
  RegisterDeviceDto,
} from "./notifications.schemas";

// GET /api/notifications
export async function handleListMine(req: AuthedRequest, res: Response) {
  const query = req.query as unknown as ListNotificationsQueryDto;
  const result = await svc.listMine(req.user.userId, query);
  res.json({
    data: result.items,
    meta: {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      totalPages: Math.max(1, Math.ceil(result.total / result.pageSize)),
    },
  });
}

// GET /api/notifications/unread-count
export async function handleUnreadCount(req: AuthedRequest, res: Response) {
  const count = await svc.unreadCount(req.user.userId);
  res.json({ data: { count } });
}

// PATCH /api/notifications/:id/read
export async function handleMarkAsRead(req: AuthedRequest, res: Response) {
  const { id } = req.params as unknown as NotificationIdParamsDto;
  const updated = await svc.markAsRead(req.user.userId, id);
  res.json({ data: updated });
}

// POST /api/notifications/read-all
export async function handleMarkAllAsRead(req: AuthedRequest, res: Response) {
  const result = await svc.markAllAsRead(req.user.userId);
  res.json({ data: result });
}

// POST /api/notifications/register-device
export async function handleRegisterDevice(req: AuthedRequest, res: Response) {
  const { token, platform } = req.body as RegisterDeviceDto;
  await registerDeviceToken({ userId: req.user.userId, token, platform });
  res.status(201).json({ data: { registered: true } });
}

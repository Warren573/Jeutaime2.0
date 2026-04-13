import { z } from "zod";
import { NotificationType } from "@prisma/client";

// ============================================================
// GET /api/notifications — query string
// Pagination standard + filtre optionnel `unreadOnly` + filtre
// optionnel par type.
// ============================================================
export const ListNotificationsQuerySchema = z
  .object({
    unreadOnly: z
      .union([z.boolean(), z.enum(["true", "false"])])
      .optional()
      .transform((v) => (typeof v === "string" ? v === "true" : v)),
    type: z.nativeEnum(NotificationType).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type ListNotificationsQueryDto = z.infer<
  typeof ListNotificationsQuerySchema
>;

// ============================================================
// PATCH /api/notifications/:id/read — params
// ============================================================
export const NotificationIdParamsSchema = z
  .object({
    id: z.string().min(1).max(64),
  })
  .strict();

export type NotificationIdParamsDto = z.infer<
  typeof NotificationIdParamsSchema
>;

import { z } from "zod";

// ============================================================
// GET /api/admin/audit-log — query
// ============================================================
export const ListAuditQuerySchema = z
  .object({
    actorId: z.string().min(1).max(64).optional(),
    action: z.string().min(1).max(100).optional(),
    target: z.string().min(1).max(64).optional(),
    since: z.coerce.date().optional(),
    until: z.coerce.date().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict()
  .refine(
    (q) => !q.since || !q.until || q.since <= q.until,
    { message: "`since` doit être <= `until`" },
  );

export type ListAuditQueryDto = z.infer<typeof ListAuditQuerySchema>;

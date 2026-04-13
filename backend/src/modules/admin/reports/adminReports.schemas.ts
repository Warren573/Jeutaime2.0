import { z } from "zod";
import { ReportStatus } from "@prisma/client";

// ============================================================
// GET /api/admin/reports — query
// ============================================================
export const ListReportsQuerySchema = z
  .object({
    status: z.nativeEnum(ReportStatus).optional(),
    targetId: z.string().min(1).max(64).optional(),
    reporterId: z.string().min(1).max(64).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type ListReportsQueryDto = z.infer<typeof ListReportsQuerySchema>;

// ============================================================
// PATCH /api/admin/reports/:id
// ============================================================
export const UpdateReportSchema = z
  .object({
    status: z.nativeEnum(ReportStatus),
    resolution: z.string().max(2000).optional(),
  })
  .strict();

export type UpdateReportDto = z.infer<typeof UpdateReportSchema>;

// ============================================================
// Params
// ============================================================
export const ReportIdParamsSchema = z
  .object({
    id: z.string().min(1),
  })
  .strict();

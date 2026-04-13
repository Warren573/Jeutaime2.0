import { z } from "zod";
import { ReportReason, ReportStatus } from "@prisma/client";

// ============================================================
// POST /api/reports
// ============================================================
export const CreateReportSchema = z
  .object({
    targetId: z.string().min(1).max(64),
    reason: z.nativeEnum(ReportReason),
    details: z.string().max(2000).optional(),
  })
  .strict();

export type CreateReportDto = z.infer<typeof CreateReportSchema>;

// ============================================================
// GET /api/reports/mine — query string
// ============================================================
export const ListMyReportsQuerySchema = z
  .object({
    status: z.nativeEnum(ReportStatus).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type ListMyReportsQueryDto = z.infer<typeof ListMyReportsQuerySchema>;

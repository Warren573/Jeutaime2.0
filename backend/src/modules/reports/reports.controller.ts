import { Response } from "express";
import { AuthedRequest } from "../../core/types";
import * as svc from "./reports.service";
import type { CreateReportDto, ListMyReportsQueryDto } from "./reports.schemas";

// POST /api/reports
export async function handleCreate(req: AuthedRequest, res: Response) {
  const dto = req.body as CreateReportDto;
  const created = await svc.createReport(req.user.userId, dto);
  res.status(201).json({ data: created });
}

// GET /api/reports/mine
export async function handleListMine(req: AuthedRequest, res: Response) {
  const query = req.query as unknown as ListMyReportsQueryDto;
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

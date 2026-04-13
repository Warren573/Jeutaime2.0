import { Response } from "express";
import { AuthedRequest } from "../../../core/types";
import * as svc from "./adminReports.service";
import type {
  ListReportsQueryDto,
  UpdateReportDto,
} from "./adminReports.schemas";

// GET /api/admin/reports
export async function handleList(req: AuthedRequest, res: Response) {
  const query = req.query as unknown as ListReportsQueryDto;
  const result = await svc.listReports(query);
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

// GET /api/admin/reports/:id
export async function handleGetById(req: AuthedRequest, res: Response) {
  const id = req.params["id"] as string;
  const data = await svc.getById(id);
  res.json({ data });
}

// PATCH /api/admin/reports/:id
export async function handleUpdate(req: AuthedRequest, res: Response) {
  const id = req.params["id"] as string;
  const dto = req.body as UpdateReportDto;
  const updated = await svc.updateReport(req.user.userId, id, dto);
  res.json({ data: updated });
}

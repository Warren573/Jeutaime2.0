import { Response } from "express";
import { AuthedRequest } from "../../../core/types";
import * as svc from "./adminAudit.service";
import type { ListAuditQueryDto } from "./adminAudit.schemas";

// GET /api/admin/audit-log
export async function handleList(req: AuthedRequest, res: Response) {
  const query = req.query as unknown as ListAuditQueryDto;
  const result = await svc.listAudit(query);
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

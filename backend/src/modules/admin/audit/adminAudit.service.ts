import { Prisma, AuditLog } from "@prisma/client";
import { prisma } from "../../../config/prisma";
import type { ListAuditQueryDto } from "./adminAudit.schemas";

// ============================================================
// DTO admin
// ============================================================
export interface AuditLogDto {
  id: string;
  actorId: string | null;
  action: string;
  target: string | null;
  meta: Prisma.JsonValue | null;
  createdAt: Date;
}

function toDto(a: AuditLog): AuditLogDto {
  return {
    id: a.id,
    actorId: a.actorId,
    action: a.action,
    target: a.target,
    meta: a.meta,
    createdAt: a.createdAt,
  };
}

// ============================================================
// listAudit — pagination + filtres simples
// ============================================================
export async function listAudit(query: ListAuditQueryDto): Promise<{
  items: AuditLogDto[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const where: Prisma.AuditLogWhereInput = {};
  if (query.actorId) where.actorId = query.actorId;
  if (query.action) where.action = query.action;
  if (query.target) where.target = query.target;
  if (query.since || query.until) {
    where.createdAt = {};
    if (query.since) where.createdAt.gte = query.since;
    if (query.until) where.createdAt.lte = query.until;
  }

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items: rows.map(toDto),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

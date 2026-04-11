import { Prisma, Report, ReportStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { NotFoundError } from "../../core/errors";
import {
  assertNotSelfReport,
  assertCanCreateNewReport,
} from "../../policies/reports";
import type { CreateReportDto, ListMyReportsQueryDto } from "./reports.schemas";

// ============================================================
// DTO retourné au reporter (pas d'info sur la cible côté user)
// ============================================================
export interface ReportMineDto {
  id: string;
  targetId: string;
  reason: Report["reason"];
  details: string | null;
  status: ReportStatus;
  createdAt: Date;
  resolvedAt: Date | null;
}

function toMineDto(r: Report): ReportMineDto {
  return {
    id: r.id,
    targetId: r.targetId,
    reason: r.reason,
    details: r.details,
    status: r.status,
    createdAt: r.createdAt,
    resolvedAt: r.resolvedAt,
  };
}

// ============================================================
// createReport
// ============================================================
export async function createReport(
  reporterId: string,
  dto: CreateReportDto,
): Promise<ReportMineDto> {
  // 1. Anti self-report (sans accès DB)
  assertNotSelfReport(reporterId, dto.targetId);

  // 2. La cible doit exister (sinon NotFoundError 404)
  const target = await prisma.user.findUnique({
    where: { id: dto.targetId },
    select: { id: true },
  });
  if (!target) throw new NotFoundError("Utilisateur cible");

  // 3. Anti-doublon : un seul report OPEN/REVIEWING par couple
  const existingOpenCount = await prisma.report.count({
    where: {
      reporterId,
      targetId: dto.targetId,
      status: { in: [ReportStatus.OPEN, ReportStatus.REVIEWING] },
    },
  });
  assertCanCreateNewReport(existingOpenCount);

  // 4. Création
  const created = await prisma.report.create({
    data: {
      reporterId,
      targetId: dto.targetId,
      reason: dto.reason,
      details: dto.details ?? null,
      status: ReportStatus.OPEN,
    },
  });

  return toMineDto(created);
}

// ============================================================
// listMine — paginated
// ============================================================
export async function listMine(
  reporterId: string,
  query: ListMyReportsQueryDto,
): Promise<{ items: ReportMineDto[]; total: number; page: number; pageSize: number }> {
  const where: Prisma.ReportWhereInput = { reporterId };
  if (query.status) where.status = query.status;

  const [items, total] = await Promise.all([
    prisma.report.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.report.count({ where }),
  ]);

  return {
    items: items.map(toMineDto),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

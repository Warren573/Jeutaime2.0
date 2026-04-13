import { Prisma, Report, ReportStatus, User } from "@prisma/client";
import { prisma } from "../../../config/prisma";
import { NotFoundError } from "../../../core/errors";
import { assertReportTransition } from "../../../policies/moderation";
import { writeAudit } from "../admin.audit";
import type {
  ListReportsQueryDto,
  UpdateReportDto,
} from "./adminReports.schemas";

// ============================================================
// DTO admin — inclut un résumé reporter+target
// ============================================================
type UserMini = Pick<User, "id" | "email" | "role" | "isBanned">;

export interface ReportAdminDto {
  id: string;
  reporter: UserMini;
  target: UserMini;
  reason: Report["reason"];
  details: string | null;
  status: ReportStatus;
  resolution: string | null;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
}

type ReportWithUsers = Report & {
  reporter: UserMini;
  target: UserMini;
};

const userMiniSelect = {
  id: true,
  email: true,
  role: true,
  isBanned: true,
} as const;

function toAdminDto(r: ReportWithUsers): ReportAdminDto {
  return {
    id: r.id,
    reporter: r.reporter,
    target: r.target,
    reason: r.reason,
    details: r.details,
    status: r.status,
    resolution: r.resolution,
    resolvedBy: r.resolvedBy,
    resolvedAt: r.resolvedAt,
    createdAt: r.createdAt,
  };
}

// ============================================================
// listReports — paginated, filtres status/targetId/reporterId
// ============================================================
export async function listReports(query: ListReportsQueryDto): Promise<{
  items: ReportAdminDto[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const where: Prisma.ReportWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.targetId) where.targetId = query.targetId;
  if (query.reporterId) where.reporterId = query.reporterId;

  const [rows, total] = await Promise.all([
    prisma.report.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        reporter: { select: userMiniSelect },
        target: { select: userMiniSelect },
      },
    }),
    prisma.report.count({ where }),
  ]);

  return {
    items: rows.map(toAdminDto),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

// ============================================================
// getById
// ============================================================
export async function getById(id: string): Promise<ReportAdminDto> {
  const r = await prisma.report.findUnique({
    where: { id },
    include: {
      reporter: { select: userMiniSelect },
      target: { select: userMiniSelect },
    },
  });
  if (!r) throw new NotFoundError("Report");
  return toAdminDto(r);
}

// ============================================================
// updateReport — change le status (avec garde-fou) + audit
// ============================================================
export async function updateReport(
  actorId: string,
  id: string,
  dto: UpdateReportDto,
): Promise<ReportAdminDto> {
  const current = await prisma.report.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!current) throw new NotFoundError("Report");

  // Garde-fou : machine d'états
  assertReportTransition(current.status, dto.status);

  // Si la nouvelle status est terminale, on stocke resolvedBy/resolvedAt
  const isTerminal =
    dto.status === ReportStatus.ACTIONED ||
    dto.status === ReportStatus.DISMISSED;

  const data: Prisma.ReportUpdateInput = {
    status: dto.status,
    resolution: dto.resolution ?? null,
  };
  if (isTerminal) {
    data.resolvedBy = actorId;
    data.resolvedAt = new Date();
  }

  const updated = await prisma.report.update({
    where: { id },
    data,
    include: {
      reporter: { select: userMiniSelect },
      target: { select: userMiniSelect },
    },
  });

  await writeAudit({
    actorId,
    action: "admin.report.update",
    target: id,
    meta: {
      from: current.status,
      to: dto.status,
      hasResolution: dto.resolution !== undefined,
    } as Prisma.InputJsonValue,
  });

  return toAdminDto(updated);
}

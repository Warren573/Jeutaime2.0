import { Prisma, Report, ReportStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { NotFoundError } from "../../core/errors";
import {
  assertNotSelfReport,
  assertCanCreateNewReport,
} from "../../policies/reports";
import { emitReportCreated } from "../../events";
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

async function resolveReportedContent(
  targetId: string,
  contentType?: string,
  contentId?: string,
): Promise<Prisma.InputJsonValue | undefined> {
  if (!contentType || !contentId) return undefined;

  if (contentType === "PHOTO") {
    const photo = await prisma.photo.findUnique({
      where: { id: contentId },
      select: {
        id: true,
        userId: true,
        moderationStatus: true,
        createdAt: true,
      },
    });
    if (!photo || photo.userId !== targetId) throw new NotFoundError("Photo signalée");
    return {
      type: "PHOTO",
      id: photo.id,
      moderationStatus: photo.moderationStatus,
      createdAt: photo.createdAt.toISOString(),
    };
  }

  if (contentType === "PROFILE_BIO" || contentType === "PROFILE_PSEUDO") {
    const profile = await prisma.profile.findUnique({
      where: { userId: targetId },
      select: { userId: true, pseudo: true, bio: true, updatedAt: true },
    });
    if (!profile || contentId !== targetId) throw new NotFoundError("Profil signalé");
    return {
      type: contentType,
      id: targetId,
      text: contentType === "PROFILE_BIO" ? profile.bio : profile.pseudo,
      updatedAt: profile.updatedAt.toISOString(),
    };
  }

  if (contentType === "SALON_MESSAGE") {
    const message = await prisma.salonMessage.findUnique({
      where: { id: contentId },
      select: {
        id: true,
        userId: true,
        content: true,
        salonId: true,
        createdAt: true,
        isHidden: true,
      },
    });
    if (!message || message.userId !== targetId) throw new NotFoundError("Message signalé");
    return {
      type: "SALON_MESSAGE",
      id: message.id,
      text: message.content,
      salonId: message.salonId,
      createdAt: message.createdAt.toISOString(),
      isHidden: message.isHidden,
    };
  }

  return undefined;
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

  // 4. Si le signalement vise un contenu précis, on vérifie qu'il appartient
  // réellement à la cible et on capture un instantané pour la modération.
  const contentSnapshot = await resolveReportedContent(
    dto.targetId,
    dto.contentType,
    dto.contentId,
  );

  // 5. Création
  const created = await prisma.report.create({
    data: {
      reporterId,
      targetId: dto.targetId,
      reason: dto.reason,
      details: dto.details ?? null,
      status: ReportStatus.OPEN,
      contentType: dto.contentType ?? null,
      contentId: dto.contentId ?? null,
      ...(contentSnapshot !== undefined ? { contentSnapshot } : {}),
    },
  });

  // Event émis après succès — non bloquant
  emitReportCreated({
    reportId: created.id,
    reporterId,
    targetId: dto.targetId,
    reason: created.reason,
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

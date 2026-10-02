import { Prisma } from "@prisma/client";
import { prisma } from "../../../config/prisma";
import { NotFoundError } from "../../../core/errors";
import { writeAudit } from "../admin.audit";
import { listSupportTickets } from "../support/adminSupport.service";

export async function getOperationsOverview() {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const [
    failedToday,
    failedLastHour,
    successfulToday,
    unresolvedIncidents,
    incidentsToday,
    openSupportTickets,
    openBugTickets,
  ] = await Promise.all([
    prisma.loginEvent.count({ where: { success: false, createdAt: { gte: startOfDay } } }),
    prisma.loginEvent.count({ where: { success: false, createdAt: { gte: oneHourAgo } } }),
    prisma.loginEvent.count({ where: { success: true, createdAt: { gte: startOfDay } } }),
    prisma.systemIncident.count({ where: { resolved: false } }),
    prisma.systemIncident.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "SupportTicket"
      WHERE "status" <> 'CLOSED'
    `,
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "SupportTicket"
      WHERE "kind" = 'BUG' AND "status" <> 'CLOSED'
    `,
  ]);

  return {
    logins: {
      failedToday,
      failedLastHour,
      successfulToday,
    },
    incidents: {
      unresolved: unresolvedIncidents,
      today: incidentsToday,
    },
    support: {
      open: Number(openSupportTickets[0]?.count ?? 0),
      bugsOpen: Number(openBugTickets[0]?.count ?? 0),
    },
  };
}

export async function listLoginEvents(query: {
  success?: string;
  email?: string;
  page: number;
  pageSize: number;
}) {
  const where: Prisma.LoginEventWhereInput = {};
  if (query.success !== undefined) where.success = query.success === "true";
  if (query.email?.trim()) {
    where.email = { contains: query.email.trim().toLowerCase(), mode: "insensitive" };
  }

  const [items, total] = await Promise.all([
    prisma.loginEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.loginEvent.count({ where }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function listIncidents(query: {
  resolved?: string;
  page: number;
  pageSize: number;
}) {
  const where: Prisma.SystemIncidentWhereInput = {};
  if (query.resolved !== undefined) where.resolved = query.resolved === "true";

  const [items, total] = await Promise.all([
    prisma.systemIncident.findMany({
      where,
      orderBy: [{ resolved: "asc" }, { createdAt: "desc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.systemIncident.count({ where }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function updateIncident(
  actorId: string,
  id: string,
  resolved: boolean,
  resolution?: string,
) {
  const current = await prisma.systemIncident.findUnique({ where: { id } });
  if (!current) throw new NotFoundError("Incident");

  const updated = await prisma.systemIncident.update({
    where: { id },
    data: {
      resolved,
      resolution: resolved ? (resolution ?? "Incident marqué comme résolu") : null,
      resolvedAt: resolved ? new Date() : null,
      resolvedBy: resolved ? actorId : null,
    },
  });

  await writeAudit({
    actorId,
    action: resolved ? "admin.incident.resolve" : "admin.incident.reopen",
    target: id,
    meta: {
      code: current.code,
      path: current.path,
      resolution: updated.resolution,
    } as Prisma.InputJsonValue,
  });

  return updated;
}

export async function getSupportTickets() {
  return listSupportTickets();
}

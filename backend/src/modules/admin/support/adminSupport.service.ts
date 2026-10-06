import { Prisma } from "@prisma/client";
import { prisma } from "../../../config/prisma";
import { writeAudit } from "../admin.audit";
import { sendAdminMessage } from "../engagement/adminEngagement.service";

export interface AdminSupportTicketDto {
  id: string;
  userId: string;
  email: string;
  pseudo: string | null;
  kind: "BUG" | "SUPPORT";
  subject: string;
  message: string;
  status: "OPEN" | "REVIEWING" | "CLOSED";
  adminReply: string | null;
  repliedAt: Date | null;
  repliedBy: string | null;
  createdAt: Date;
}

export async function listSupportTickets(): Promise<AdminSupportTicketDto[]> {
  return prisma.$queryRaw<AdminSupportTicketDto[]>`
    SELECT
      t."id",
      t."userId",
      u."email",
      p."pseudo",
      t."kind",
      t."subject",
      t."message",
      t."status",
      t."adminReply",
      t."repliedAt",
      t."repliedBy",
      t."createdAt"
    FROM "SupportTicket" t
    INNER JOIN "User" u ON u."id" = t."userId"
    LEFT JOIN "Profile" p ON p."userId" = t."userId"
    ORDER BY
      CASE t."status"
        WHEN 'OPEN' THEN 0
        WHEN 'REVIEWING' THEN 1
        ELSE 2
      END,
      t."createdAt" DESC
    LIMIT 200
  `;
}

export async function updateSupportTicket(
  actorId: string,
  id: string,
  status: "OPEN" | "REVIEWING" | "CLOSED",
  reply?: string,
): Promise<AdminSupportTicketDto | null> {
  const current = await prisma.$queryRaw<AdminSupportTicketDto[]>`
    SELECT
      t."id",
      t."userId",
      u."email",
      p."pseudo",
      t."kind",
      t."subject",
      t."message",
      t."status",
      t."adminReply",
      t."repliedAt",
      t."repliedBy",
      t."createdAt"
    FROM "SupportTicket" t
    INNER JOIN "User" u ON u."id" = t."userId"
    LEFT JOIN "Profile" p ON p."userId" = t."userId"
    WHERE t."id" = ${id}
    LIMIT 1
  `;
  const before = current[0];
  if (!before) return null;

  const replyValue = reply?.trim() || null;
  const rows = await prisma.$queryRaw<AdminSupportTicketDto[]>`
    UPDATE "SupportTicket"
    SET
      "status" = ${status},
      "adminReply" = COALESCE(${replyValue}, "adminReply"),
      "repliedAt" = CASE WHEN ${replyValue} IS NOT NULL THEN NOW() ELSE "repliedAt" END,
      "repliedBy" = CASE WHEN ${replyValue} IS NOT NULL THEN ${actorId} ELSE "repliedBy" END
    WHERE "id" = ${id}
    RETURNING
      "id",
      "userId",
      ''::TEXT AS "email",
      NULL::TEXT AS "pseudo",
      "kind",
      "subject",
      "message",
      "status",
      "adminReply",
      "repliedAt",
      "repliedBy",
      "createdAt"
  `;

  const updated = rows[0] ?? null;
  if (!updated) return null;

  if (replyValue) {
    await sendAdminMessage(
      actorId,
      before.userId,
      `Réponse du support · ${before.subject}`,
      replyValue,
    );
  }

  await writeAudit({
    actorId,
    action: replyValue ? "admin.support.reply" : "admin.support.status.update",
    target: before.userId,
    meta: {
      ticketId: id,
      from: before.status,
      to: status,
      replied: !!replyValue,
    } as Prisma.InputJsonValue,
  });

  return { ...updated, email: before.email, pseudo: before.pseudo };
}

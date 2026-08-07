import { prisma } from "../../../config/prisma";

export interface AdminSupportTicketDto {
  id: string;
  userId: string;
  email: string;
  pseudo: string | null;
  kind: "BUG" | "SUPPORT";
  subject: string;
  message: string;
  status: "OPEN" | "REVIEWING" | "CLOSED";
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

export async function updateSupportTicketStatus(
  id: string,
  status: "OPEN" | "REVIEWING" | "CLOSED",
): Promise<AdminSupportTicketDto | null> {
  const rows = await prisma.$queryRaw<AdminSupportTicketDto[]>`
    UPDATE "SupportTicket"
    SET "status" = ${status}
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
      "createdAt"
  `;
  return rows[0] ?? null;
}

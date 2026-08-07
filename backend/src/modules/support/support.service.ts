import crypto from "crypto";
import { prisma } from "../../config/prisma";
import type { CreateSupportTicketDto } from "./support.schemas";

export interface SupportTicketDto {
  id: string;
  kind: "BUG" | "SUPPORT";
  subject: string;
  message: string;
  status: "OPEN" | "REVIEWING" | "CLOSED";
  createdAt: Date;
}

export async function createSupportTicket(
  userId: string,
  dto: CreateSupportTicketDto,
): Promise<SupportTicketDto> {
  const id = crypto.randomUUID();
  const rows = await prisma.$queryRaw<SupportTicketDto[]>`
    INSERT INTO "SupportTicket" ("id", "userId", "kind", "subject", "message")
    VALUES (${id}, ${userId}, ${dto.kind}, ${dto.subject}, ${dto.message})
    RETURNING "id", "kind", "subject", "message", "status", "createdAt"
  `;
  return rows[0] as SupportTicketDto;
}

export async function listMySupportTickets(userId: string): Promise<SupportTicketDto[]> {
  return prisma.$queryRaw<SupportTicketDto[]>`
    SELECT "id", "kind", "subject", "message", "status", "createdAt"
    FROM "SupportTicket"
    WHERE "userId" = ${userId}
    ORDER BY "createdAt" DESC
    LIMIT 50
  `;
}

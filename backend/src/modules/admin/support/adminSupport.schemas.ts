import { z } from "zod";

export const SupportTicketIdParamsSchema = z.object({
  id: z.string().uuid("Identifiant de ticket invalide"),
});

export const UpdateSupportTicketSchema = z.object({
  status: z.enum(["OPEN", "REVIEWING", "CLOSED"]),
});

import { z } from "zod";

export const CreateSupportTicketSchema = z.object({
  kind: z.enum(["BUG", "SUPPORT"]),
  subject: z.string().trim().min(3, "Sujet trop court").max(120, "Sujet trop long"),
  message: z.string().trim().min(10, "Message trop court").max(4000, "Message trop long"),
});

export type CreateSupportTicketDto = z.infer<typeof CreateSupportTicketSchema>;

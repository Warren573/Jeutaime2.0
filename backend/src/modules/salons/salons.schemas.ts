import { z } from "zod";

// ============================================================
// POST /api/salons/:id/messages
// ============================================================
export const SendSalonMessageSchema = z
  .object({
    content: z.string().min(1).max(2000).trim(),
  })
  .strict();

export type SendSalonMessageDto = z.infer<typeof SendSalonMessageSchema>;

// ============================================================
// GET /api/salons/:id/messages
// ============================================================
export const ListSalonMessagesQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
  })
  .strict();

export type ListSalonMessagesQuery = z.infer<
  typeof ListSalonMessagesQuerySchema
>;

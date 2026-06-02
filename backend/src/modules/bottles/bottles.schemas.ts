import { z } from "zod";

// ============================================================
// POST /api/bottles/create
// ============================================================
export const CreateBottleBodySchema = z.object({
  message: z.string().min(1).max(1000),
  targetGender: z.enum(["HOMME", "FEMME", "AUTRE"]),
  ageMin: z.number().int().min(18).max(99),
  ageMax: z.number().int().min(18).max(99),
});

export type CreateBottleBody = z.infer<typeof CreateBottleBodySchema>;

export const CreateBottleResponseSchema = z.object({
  id: z.string(),
  senderId: z.string(),
  message: z.string(),
  targetGender: z.string(),
  ageMin: z.number(),
  ageMax: z.number(),
  status: z.enum(["FLOATING", "ACCEPTED", "EXPIRED"]),
  acceptedById: z.string().nullable(),
  acceptedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

export type CreateBottleResponse = z.infer<typeof CreateBottleResponseSchema>;

// ============================================================
// GET /api/bottles/inbox
// ============================================================
export const InboxBottleSchema = z.object({
  id: z.string(),
  message: z.string(),
  targetGender: z.string(),
  status: z.enum(["FLOATING", "ACCEPTED", "EXPIRED"]),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

export const GetInboxResponseSchema = z.object({
  bottles: z.array(InboxBottleSchema),
});

export type GetInboxResponse = z.infer<typeof GetInboxResponseSchema>;

// ============================================================
// POST /api/bottles/:id/accept
// ============================================================
export const AcceptBottleBodySchema = z.object({}).strict();

export type AcceptBottleBody = z.infer<typeof AcceptBottleBodySchema>;

export const AcceptBottleResponseSchema = z.object({
  id: z.string(),
  status: z.enum(["FLOATING", "ACCEPTED", "EXPIRED"]),
  acceptedById: z.string(),
  acceptedAt: z.string().datetime(),
});

export type AcceptBottleResponse = z.infer<typeof AcceptBottleResponseSchema>;

// ============================================================
// POST /api/bottles/:id/refuse
// ============================================================
export const RefuseBottleBodySchema = z.object({}).strict();

export type RefuseBottleBody = z.infer<typeof RefuseBottleBodySchema>;

export const RefuseBottleResponseSchema = z.object({
  success: z.boolean(),
});

export type RefuseBottleResponse = z.infer<typeof RefuseBottleResponseSchema>;

// ============================================================
// GET /api/bottles/:id/messages
// ============================================================
export const BottleMessageSchema = z.object({
  id: z.string(),
  senderId: z.string(),
  content: z.string(),
  createdAt: z.string().datetime(),
});

export const GetBottleMessagesResponseSchema = z.object({
  messages: z.array(BottleMessageSchema),
});

export type GetBottleMessagesResponse = z.infer<
  typeof GetBottleMessagesResponseSchema
>;

// ============================================================
// POST /api/bottles/:id/messages
// ============================================================
export const PostBottleMessageBodySchema = z.object({
  content: z.string().min(1).max(500),
});

export type PostBottleMessageBody = z.infer<
  typeof PostBottleMessageBodySchema
>;

export const PostBottleMessageResponseSchema = BottleMessageSchema;

export type PostBottleMessageResponse = z.infer<
  typeof PostBottleMessageResponseSchema
>;

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
  senderCity: z.string(),
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
  senderCity: z.string(),
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

// ============================================================
// GET /api/bottles/unread-count
// ============================================================
export const GetUnreadCountResponseSchema = z.object({
  count: z.number().int().nonnegative(),
});

export type GetUnreadCountResponse = z.infer<
  typeof GetUnreadCountResponseSchema
>;

// ============================================================
// POST /api/bottles/:id/read
// ============================================================
export const MarkBottleAsReadBodySchema = z.object({}).strict();

export type MarkBottleAsReadBody = z.infer<
  typeof MarkBottleAsReadBodySchema
>;

export const MarkBottleAsReadResponseSchema = z.object({
  id: z.string(),
  status: z.enum(["FLOATING", "ACCEPTED", "EXPIRED", "REVEALED", "BROKEN"]),
});

export type MarkBottleAsReadResponse = z.infer<
  typeof MarkBottleAsReadResponseSchema
>;

// ============================================================
// POST /api/bottles/:id/reveal/request
// ============================================================
export const RequestRevealBodySchema = z.object({}).strict();

export type RequestRevealBody = z.infer<typeof RequestRevealBodySchema>;

export const RequestRevealResponseSchema = z.object({
  id: z.string(),
  bottleId: z.string(),
  requestedById: z.string(),
  respondentId: z.string(),
  status: z.enum(["PENDING", "ACCEPTED", "REFUSED"]),
  createdAt: z.string().datetime(),
  respondedAt: z.string().datetime().nullable(),
});

export type RequestRevealResponse = z.infer<
  typeof RequestRevealResponseSchema
>;

// ============================================================
// POST /api/bottles/:id/reveal/accept
// ============================================================
export const AcceptRevealBodySchema = z.object({}).strict();

export type AcceptRevealBody = z.infer<typeof AcceptRevealBodySchema>;

export const AcceptRevealResponseSchema = z.object({
  id: z.string(),
  status: z.enum(["FLOATING", "ACCEPTED", "EXPIRED", "REVEALED", "BROKEN"]),
  revealedAt: z.string().datetime().nullable(),
  matchId: z.string().nullable().optional(),
});

export type AcceptRevealResponse = z.infer<
  typeof AcceptRevealResponseSchema
>;

// ============================================================
// POST /api/bottles/:id/reveal/refuse
// ============================================================
export const RefuseRevealBodySchema = z.object({}).strict();

export type RefuseRevealBody = z.infer<typeof RefuseRevealBodySchema>;

export const RefuseRevealResponseSchema = z.object({
  id: z.string(),
  bottleId: z.string(),
  status: z.enum(["PENDING", "ACCEPTED", "REFUSED"]),
  respondedAt: z.string().datetime(),
});

export type RefuseRevealResponse = z.infer<
  typeof RefuseRevealResponseSchema
>;

// ============================================================
// POST /api/bottles/:id/break
// ============================================================
export const BreakBottleBodySchema = z.object({}).strict();

export type BreakBottleBody = z.infer<typeof BreakBottleBodySchema>;

export const BreakBottleResponseSchema = z.object({
  id: z.string(),
  status: z.enum(["FLOATING", "ACCEPTED", "EXPIRED", "REVEALED", "BROKEN"]),
});

export type BreakBottleResponse = z.infer<
  typeof BreakBottleResponseSchema
>;

// ============================================================
// POST /api/bottles/:id/restart
// ============================================================
export const RestartBottleBodySchema = z.object({}).strict();

export type RestartBottleBody = z.infer<typeof RestartBottleBodySchema>;

export const RestartBottleResponseSchema = z.object({
  id: z.string(),
  status: z.enum(["FLOATING", "ACCEPTED", "EXPIRED", "REVEALED", "BROKEN"]),
});

export type RestartBottleResponse = z.infer<
  typeof RestartBottleResponseSchema
>;

// ============================================================
// GET /api/bottles/:id/reveal/status
// ============================================================
export const GetRevealStatusResponseSchema = z.object({
  hasPendingRequest: z.boolean(),
  isRequester: z.boolean(), // true if current user is the one who requested
  requestedById: z.string().optional(),
});

export type GetRevealStatusResponse = z.infer<
  typeof GetRevealStatusResponseSchema
>;

import { z } from "zod";
import { ReportReason } from "@prisma/client";

// ============================================================
// POST /api/bottles/create
// ============================================================
export const CreateBottleBodySchema = z.object({
  message: z.string().min(1).max(1000),
  // LES_DEUX = cherche hommes ET femmes.
  targetGender: z.enum(["HOMME", "FEMME", "AUTRE", "LES_DEUX"]),
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
  senderCity: z.string().nullable(),
  targetGender: z.string(),
  status: z.enum(["FLOATING", "ACCEPTED", "EXPIRED", "REVEALED", "BROKEN"]),
  senderId: z.string(),
  acceptedById: z.string().nullable(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

export const GetInboxResponseSchema = z.object({
  bottles: z.array(InboxBottleSchema),
});

export type GetInboxResponse = z.infer<typeof GetInboxResponseSchema>;

// ============================================================
// GET /api/bottles/sent — historique des bouteilles envoyées
// ============================================================
export const SentBottleSchema = z.object({
  id: z.string(),
  message: z.string(),
  targetGender: z.string(),
  ageMin: z.number(),
  ageMax: z.number(),
  status: z.enum(["FLOATING", "ACCEPTED", "EXPIRED", "REVEALED", "BROKEN"]),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  recipientCount: z.number().int().nonnegative(),
});

export const GetSentBottlesResponseSchema = z.object({
  bottles: z.array(SentBottleSchema),
});

export type GetSentBottlesResponse = z.infer<
  typeof GetSentBottlesResponseSchema
>;

// ============================================================
// GET /api/bottles/:id — détail d'une bouteille (expéditeur ou accepteur)
// ============================================================
export const GetBottleResponseSchema = z.object({
  id: z.string(),
  message: z.string(),
  senderCity: z.string().nullable(),
  targetGender: z.string(),
  status: z.enum(["FLOATING", "ACCEPTED", "EXPIRED", "REVEALED", "BROKEN"]),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

export type GetBottleResponse = z.infer<typeof GetBottleResponseSchema>;

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

export const BottleMessageWithMetadataSchema = z.object({
  id: z.string(),
  content: z.string(),
  createdAt: z.string().datetime(),
  isMine: z.boolean(),
  source: z.enum(["INITIAL_BOTTLE", "ANONYMOUS_MESSAGE"]),
});

export type BottleMessageWithMetadata = z.infer<
  typeof BottleMessageWithMetadataSchema
>;

export const GetBottleMessagesResponseSchema = z.object({
  messages: z.array(BottleMessageWithMetadataSchema),
});
export type GetBottleMessagesResponse = z.infer<
  typeof GetBottleMessagesResponseSchema
>;

// ============================================================
// POST /api/bottles/:id/messages
// ============================================================
export const PostBottleMessageBodySchema = z.object({
  content: z.string().min(1).max(500),
  idempotencyKey: z.string().uuid("Invalid UUID format for idempotencyKey"),
});
export type PostBottleMessageBody = z.infer<typeof PostBottleMessageBodySchema>;

export const PostBottleMessageResponseSchema = z.object({
  message: BottleMessageSchema,
  idempotentReplay: z.boolean().describe("true if this is a replay of a previous request"),
});
export type PostBottleMessageResponse = z.infer<typeof PostBottleMessageResponseSchema>;

// ============================================================
// GET /api/bottles/unread-count
// ============================================================
export const GetUnreadCountResponseSchema = z.object({
  count: z.number().int().nonnegative(),
});
export type GetUnreadCountResponse = z.infer<typeof GetUnreadCountResponseSchema>;

// ============================================================
// POST /api/bottles/:id/read
// ============================================================
export const MarkBottleAsReadBodySchema = z.object({}).strict();
export type MarkBottleAsReadBody = z.infer<typeof MarkBottleAsReadBodySchema>;

export const MarkBottleAsReadResponseSchema = z.object({
  id: z.string(),
  status: z.enum(["FLOATING", "ACCEPTED", "EXPIRED", "REVEALED", "BROKEN"]),
});
export type MarkBottleAsReadResponse = z.infer<typeof MarkBottleAsReadResponseSchema>;

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
export type RequestRevealResponse = z.infer<typeof RequestRevealResponseSchema>;

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
export type AcceptRevealResponse = z.infer<typeof AcceptRevealResponseSchema>;

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
export type RefuseRevealResponse = z.infer<typeof RefuseRevealResponseSchema>;

// ============================================================
// POST /api/bottles/:id/break
// ============================================================
export const BreakBottleBodySchema = z.object({}).strict();
export type BreakBottleBody = z.infer<typeof BreakBottleBodySchema>;

export const BreakBottleResponseSchema = z.object({
  id: z.string(),
  status: z.enum(["FLOATING", "ACCEPTED", "EXPIRED", "REVEALED", "BROKEN"]),
});
export type BreakBottleResponse = z.infer<typeof BreakBottleResponseSchema>;

// ============================================================
// POST /api/bottles/:id/restart
// ============================================================
export const RestartBottleBodySchema = z.object({}).strict();
export type RestartBottleBody = z.infer<typeof RestartBottleBodySchema>;

export const RestartBottleResponseSchema = z.object({
  id: z.string(),
  status: z.enum(["FLOATING", "ACCEPTED", "EXPIRED", "REVEALED", "BROKEN"]),
});
export type RestartBottleResponse = z.infer<typeof RestartBottleResponseSchema>;

// ============================================================
// GET /api/bottles/:id/reveal/status
// ============================================================
export const GetRevealStatusResponseSchema = z.object({
  hasPendingRequest: z.boolean(),
  isRequester: z.boolean(),
  requestedById: z.string().optional(),
});
export type GetRevealStatusResponse = z.infer<typeof GetRevealStatusResponseSchema>;

// ============================================================
// GET /api/bottles/current
// ============================================================
export const LatestLetterSchema = z.object({
  id: z.string(),
  content: z.string(),
  createdAt: z.string().datetime(),
  isMine: z.boolean(),
  source: z.enum(["INITIAL_BOTTLE", "ANONYMOUS_MESSAGE"]),
});
export type LatestLetter = z.infer<typeof LatestLetterSchema>;

export const GetCurrentBottleResponseSchema = z.object({
  bottle: z.object({
    id: z.string(),
    status: z.enum(["FLOATING", "ACCEPTED", "REVEALED", "BROKEN", "EXPIRED"]),
  }).nullable(),
  latestLetter: LatestLetterSchema.nullable(),
  canReply: z.boolean(),
  waitingForReply: z.boolean(),
  canCreateBottle: z.boolean(),
  canBreak: z.boolean(),
  messageCount: z.number(),
});
export type GetCurrentBottleResponse = z.infer<typeof GetCurrentBottleResponseSchema>;

// ============================================================
// POST /api/bottles/:id/report
// ============================================================
export const ReportBottleBodySchema = z.object({
  reason: z.nativeEnum(ReportReason),
  details: z.string().max(2000).optional(),
});

export const ReportBottleResponseSchema = z.object({
  id: z.string(),
  status: z.string(),
});

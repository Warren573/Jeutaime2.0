import { z } from "zod";

// ============================================================
// Participant DTO
// ============================================================
export const ParticipantDtoSchema = z.object({
  userId: z.string(),
  pseudo: z.string(),
  gender: z.enum(["HOMME", "FEMME", "AUTRE"]).optional(),
  avatarConfig: z.any().optional(),
  joinedAt: z.string().datetime().optional(),
});

export type ParticipantDto = z.infer<typeof ParticipantDtoSchema>;

// ============================================================
// GET /api/salon-sessions/active/:salonKind
// ============================================================
export const GetActiveSessionsResponseSchema = z.object({
  sessions: z.array(
    z.object({
      id: z.string(),
      participantCount: z.number(),
      participants: z.array(ParticipantDtoSchema),
      isFull: z.boolean(),
      startedAt: z.string().datetime(),
      expiresAt: z.string().datetime(),
    }),
  ),
});

export type GetActiveSessionsResponse = z.infer<
  typeof GetActiveSessionsResponseSchema
>;

// ============================================================
// GET /api/salon-sessions/:id
// ============================================================
export const GetSessionDetailResponseSchema = z.object({
  id: z.string(),
  salonKind: z.string(),
  salonName: z.string(),
  status: z.enum(["ACTIVE", "EXPIRED"]),
  participantCount: z.number(),
  participants: z.array(ParticipantDtoSchema),
  startedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

export type GetSessionDetailResponse = z.infer<
  typeof GetSessionDetailResponseSchema
>;

// ============================================================
// POST /api/salon-sessions/join/:salonKind
// ============================================================
export const JoinSessionBodySchema = z.object({}).strict();

export type JoinSessionBody = z.infer<typeof JoinSessionBodySchema>;

export const JoinSessionResponseSchema = GetSessionDetailResponseSchema;

export type JoinSessionResponse = z.infer<typeof JoinSessionResponseSchema>;

// ============================================================
// POST /api/salon-sessions/:id/leave
// ============================================================
export const LeaveSessionBodySchema = z.object({}).strict();

export type LeaveSessionBody = z.infer<typeof LeaveSessionBodySchema>;

export const LeaveSessionResponseSchema = z.object({
  success: z.boolean(),
});

export type LeaveSessionResponse = z.infer<typeof LeaveSessionResponseSchema>;

// ============================================================
// GET /api/salon-sessions/encounters/:salonKind
// ============================================================
export const EncounterDtoSchema = z.object({
  userId: z.string(),
  pseudo: z.string(),
  gender: z.enum(["HOMME", "FEMME", "AUTRE"]).optional(),
  avatarConfig: z.any().optional(),
  metAt: z.string().datetime(),
});

export type EncounterDto = z.infer<typeof EncounterDtoSchema>;

export const GetPreviousEncountersResponseSchema = z.object({
  encounters: z.array(EncounterDtoSchema),
});

export type GetPreviousEncountersResponse = z.infer<
  typeof GetPreviousEncountersResponseSchema
>;

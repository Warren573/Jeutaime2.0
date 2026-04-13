import { z } from "zod";

// ============================================================
// POST /api/magies/cast
// ============================================================
export const CastMagieSchema = z
  .object({
    magieId: z.string().min(1).max(64),
    toUserId: z.string().min(1).max(64),
    salonId: z.string().min(1).max(64).optional(),
  })
  .strict();

export type CastMagieDto = z.infer<typeof CastMagieSchema>;

// ============================================================
// POST /api/magies/:id/break
// ============================================================
export const BreakMagieSchema = z
  .object({
    antiSpellId: z.string().min(1).max(64),
  })
  .strict();

export type BreakMagieDto = z.infer<typeof BreakMagieSchema>;

// ============================================================
// Params
// ============================================================
export const MagieIdParamsSchema = z
  .object({
    id: z.string().min(1),
  })
  .strict();

export const UserIdParamsSchema = z
  .object({
    userId: z.string().min(1),
  })
  .strict();

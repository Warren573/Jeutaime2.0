import { z } from "zod";

// ============================================================
// POST /api/admin/users/:id/ban
// ============================================================
export const BanUserSchema = z
  .object({
    reason: z.string().min(3).max(500),
  })
  .strict();

export type BanUserDto = z.infer<typeof BanUserSchema>;

// ============================================================
// POST /api/admin/users/:id/unban
// (corps vide accepté, mais on reste strict pour rejeter
//  les champs envoyés par erreur)
// ============================================================
export const UnbanUserSchema = z.object({}).strict();

// ============================================================
// POST /api/admin/users/:id/warn
// ============================================================
export const WarnUserSchema = z
  .object({
    message: z.string().min(3).max(500),
  })
  .strict();

export type WarnUserDto = z.infer<typeof WarnUserSchema>;

// ============================================================
// Params
// ============================================================
export const UserIdParamsSchema = z
  .object({
    id: z.string().min(1),
  })
  .strict();

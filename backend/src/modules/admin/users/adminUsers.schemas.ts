import { z } from "zod";

// ============================================================
// POST /api/admin/users/:id/ban
// ============================================================
export const BanUserSchema = z
  .object({
    reason: z.string().min(3).max(500),
    durationDays: z.number().int().min(1).max(3650).optional(),
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


// ============================================================
// PATCH /api/admin/users/:id/role
// ============================================================
export const UpdateRoleSchema = z
  .object({
    role: z.enum(["USER", "MODERATOR", "ADMIN"]),
  })
  .strict();

export type UpdateRoleDto = z.infer<typeof UpdateRoleSchema>;

// ============================================================
// POST /api/admin/users/:id/coins
// ============================================================
export const AdjustCoinsSchema = z
  .object({
    amount: z.number().int().min(-100000).max(100000).refine((v) => v !== 0, "Montant non nul requis"),
    reason: z.string().min(3).max(500),
  })
  .strict();

export type AdjustCoinsDto = z.infer<typeof AdjustCoinsSchema>;


// ============================================================
// POST /api/admin/users/:id/premium
// ============================================================
export const GrantPremiumSchema = z
  .object({
    days: z.number().int().min(1).max(365),
    reason: z.string().min(3).max(500),
  })
  .strict();

export type GrantPremiumDto = z.infer<typeof GrantPremiumSchema>;

// ============================================================
// POST /api/admin/users/:id/reset-salons
// ============================================================
export const ResetSalonsSchema = z
  .object({
    reason: z.string().min(3).max(500),
  })
  .strict();

export type ResetSalonsDto = z.infer<typeof ResetSalonsSchema>;

// ============================================================
// POST /api/admin/users/:id/reset-refuge
// ============================================================
export const ResetRefugeSchema = z
  .object({
    reason: z.string().min(3).max(500),
  })
  .strict();

export type ResetRefugeDto = z.infer<typeof ResetRefugeSchema>;

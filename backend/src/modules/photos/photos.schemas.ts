import { z } from "zod";

// ============================================================
// PATCH /api/photos/:id
// ============================================================
export const UpdatePhotoSchema = z
  .object({
    position: z.number().int().min(0).max(20).optional(),
    isPrimary: z.boolean().optional(),
  })
  .refine((d) => d.position !== undefined || d.isPrimary !== undefined, {
    message: "Au moins un champ (position ou isPrimary) doit être fourni",
  });

export type UpdatePhotoDto = z.infer<typeof UpdatePhotoSchema>;

// ============================================================
// GET /api/photos/file/:id/:variant
// ============================================================
export const PhotoFileParamsSchema = z.object({
  id: z.string().min(1),
  variant: z.enum(["original", "blurred"]),
});

export type PhotoFileParams = z.infer<typeof PhotoFileParamsSchema>;

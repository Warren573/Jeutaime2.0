import { z } from "zod";
import { SalonKind } from "@prisma/client";

// ============================================================
// Types partagés
// ============================================================

// Hex color (#RGB, #RRGGBB ou #RRGGBBAA) — validé mais optionnel
const hexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/u, {
    message: "Couleur hex invalide (attendu : #RGB, #RRGGBB ou #RRGGBBAA)",
  });

const backgroundType = z.enum(["image", "gradient", "color"]);

/**
 * backgroundConfig est un objet libre côté DB (Json?) mais on valide
 * sa cohérence côté Zod selon le backgroundType fourni, si les deux
 * sont présents dans la même requête.
 */
const backgroundConfigSchema = z
  .object({
    // gradient
    start: hexColor.optional(),
    end: hexColor.optional(),
    angle: z.number().min(0).max(360).optional(),
    // color
    color: hexColor.optional(),
    // image
    url: z.string().min(1).optional(),
    position: z.enum(["cover", "contain", "center", "top", "bottom"]).optional(),
    opacity: z.number().min(0).max(1).optional(),
  })
  .strict();

// ============================================================
// POST /api/admin/salons — créer un salon pour un kind non existant
// ============================================================
export const CreateSalonSchema = z
  .object({
    kind: z.nativeEnum(SalonKind),
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    magicAction: z.string().max(60).optional(),

    backgroundImage: z.string().max(500).optional(),
    backgroundType: backgroundType.default("gradient"),
    backgroundConfig: backgroundConfigSchema.optional(),

    primaryColor: hexColor.optional(),
    secondaryColor: hexColor.optional(),
    textColor: hexColor.optional(),

    isActive: z.boolean().default(true),
    order: z.number().int().min(0).max(1000).default(0),
  })
  .strict();

export type CreateSalonDto = z.infer<typeof CreateSalonSchema>;

// ============================================================
// PATCH /api/admin/salons/:id — update partiel
// ============================================================
export const UpdateSalonSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).nullable().optional(),
    magicAction: z.string().max(60).nullable().optional(),

    backgroundImage: z.string().max(500).nullable().optional(),
    backgroundType: backgroundType.optional(),
    backgroundConfig: backgroundConfigSchema.nullable().optional(),

    primaryColor: hexColor.nullable().optional(),
    secondaryColor: hexColor.nullable().optional(),
    textColor: hexColor.nullable().optional(),

    order: z.number().int().min(0).max(1000).optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, {
    message: "Au moins un champ doit être fourni",
  });

export type UpdateSalonDto = z.infer<typeof UpdateSalonSchema>;

// ============================================================
// PATCH /api/admin/salons/:id/activate
// ============================================================
export const ActivateSalonSchema = z
  .object({
    isActive: z.boolean(),
  })
  .strict();

export type ActivateSalonDto = z.infer<typeof ActivateSalonSchema>;

// ============================================================
// Params
// ============================================================
export const SalonIdParamsSchema = z.object({
  id: z.string().min(1),
});

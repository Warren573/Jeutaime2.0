import { z } from "zod";

// ============================================================
// POST /api/offerings/send
// ============================================================
export const SendOfferingSchema = z
  .object({
    offeringId: z.string().min(1).max(64),
    toUserId: z.string().min(1).max(64),
    salonId: z.string().min(1).max(64).optional(),
  })
  .strict();

export type SendOfferingDto = z.infer<typeof SendOfferingSchema>;

// ============================================================
// GET /api/offerings/received
// ============================================================
export const ListReceivedQuerySchema = z
  .object({
    onlyActive: z
      .enum(["true", "false"])
      .optional()
      .default("true")
      .transform((v) => v === "true"),
    page: z.coerce.number().int().min(1).optional().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  })
  .strict();

export type ListReceivedQueryDto = z.infer<typeof ListReceivedQuerySchema>;

// ============================================================
// GET /api/offerings/salon/:salonId
// ============================================================
export const SalonOfferingsParamsSchema = z
  .object({
    salonId: z.string().min(1).max(64),
  })
  .strict();

export type SalonOfferingsParamsDto = z.infer<typeof SalonOfferingsParamsSchema>;

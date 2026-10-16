import { z } from "zod";

// ============================================================
// POST /api/premium/subscribe
// ============================================================
export const SubscribePremiumSchema = z.object({
  planId: z.string().min(1, "planId requis"),
  paymentMethod: z.enum(["apple", "google"]),
});

export type SubscribePremiumDto = z.infer<typeof SubscribePremiumSchema>;

import { z } from "zod";

// ============================================================
// GET /api/wallet/me/transactions?page=&pageSize=
// ============================================================
export const ListTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type ListTransactionsQuery = z.infer<typeof ListTransactionsQuerySchema>;

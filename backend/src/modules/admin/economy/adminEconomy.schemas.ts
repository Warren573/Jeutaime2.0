import { z } from "zod";

export const EconomyCatalogParamsSchema = z.object({
  id: z.string().min(1),
});

export const UpdateCatalogItemSchema = z.object({
  enabled: z.boolean().optional(),
  cost: z.number().int().min(0).max(100000).optional(),
}).strict().refine((d) => d.enabled !== undefined || d.cost !== undefined, {
  message: "Au moins une modification est requise",
});

export const ListTransactionsQuerySchema = z.object({
  type: z.string().optional(),
  userId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
}).strict();

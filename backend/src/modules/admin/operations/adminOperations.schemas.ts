import { z } from "zod";

export const IncidentIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const UpdateIncidentSchema = z.object({
  resolved: z.boolean(),
  resolution: z.string().min(3).max(2000).optional(),
}).strict();

export const ListLoginEventsQuerySchema = z.object({
  success: z.enum(["true", "false"]).optional(),
  email: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
}).strict();

export const ListIncidentsQuerySchema = z.object({
  resolved: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
}).strict();

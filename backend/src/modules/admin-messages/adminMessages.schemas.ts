import { z } from "zod";

export const AdminMessageIdParamsSchema = z.object({
  id: z.string().min(1),
});

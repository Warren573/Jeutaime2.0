import { z } from "zod";

export const PrivateInvitationParamsSchema = z.object({
  id: z.string().min(1),
});

export const PrivateSessionParamsSchema = z.object({
  sessionId: z.string().min(1),
});

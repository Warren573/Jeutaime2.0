import { z } from "zod";

export const UserParamsSchema = z.object({ id: z.string().min(1) });

export const SendAdminMessageSchema = z.object({
  subject: z.string().trim().min(3).max(120).optional(),
  message: z.string().trim().min(2).max(4000),
}).strict();

export const CreatePrivateSalonSchema = z.object({
  name: z.string().trim().min(3).max(80).default("Sanctuaire privé"),
  salonKind: z.enum(["PISCINE","CAFE_DE_PARIS","ILE_PIRATES","THEATRE","BAR_COCKTAILS","METAL","PSY"]).default("CAFE_DE_PARIS"),
  durationDays: z.number().int().min(1).max(30).default(7),
}).strict();

export const PrivateSalonParamsSchema = z.object({ sessionId: z.string().min(1) });

export const PrivateSalonInviteParamsSchema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().min(1),
});

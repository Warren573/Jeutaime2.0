import { z } from "zod";

export const PhotoModerationParamsSchema = z.object({
  id: z.string().min(1),
});

export const ModeratePhotoSchema = z.object({
  status: z.enum(["ACTIVE", "HIDDEN", "REMOVED"]),
  reason: z.string().min(3).max(500),
}).strict();

export type ModeratePhotoDto = z.infer<typeof ModeratePhotoSchema>;

export const ProfileModerationParamsSchema = z.object({
  id: z.string().min(1),
});

export const ModerateProfileSchema = z.object({
  action: z.enum(["HIDE_FROM_DISCOVERY", "RESTORE_DISCOVERY", "CLEAR_BIO"]),
  reason: z.string().min(3).max(500),
}).strict();

export type ModerateProfileDto = z.infer<typeof ModerateProfileSchema>;

export const SalonMessageParamsSchema = z.object({
  id: z.string().min(1),
});

export const ModerateSalonMessageSchema = z.object({
  hidden: z.boolean(),
  reason: z.string().min(3).max(500),
}).strict();

export type ModerateSalonMessageDto = z.infer<typeof ModerateSalonMessageSchema>;

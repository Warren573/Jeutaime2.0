import { z } from 'zod';

export const DrinkActionSchema = z
  .object({
    // POST body is empty for now
  })
  .strict();

export type DrinkActionDto = z.infer<typeof DrinkActionSchema>;

export const EatActionSchema = z
  .object({
    // POST body is empty for now
  })
  .strict();

export type EatActionDto = z.infer<typeof EatActionSchema>;

export const DrinkActionResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  level: z.number().optional(),
  participant: z.object({
    userId: z.string(),
    pseudo: z.string(),
    drinkLevel: z.number(),
    eatLevel: z.number(),
  }).optional(),
});

export type DrinkActionResponse = z.infer<typeof DrinkActionResponseSchema>;

export const EatActionResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  level: z.number().optional(),
  participant: z.object({
    userId: z.string(),
    pseudo: z.string(),
    drinkLevel: z.number(),
    eatLevel: z.number(),
  }).optional(),
});

export type EatActionResponse = z.infer<typeof EatActionResponseSchema>;

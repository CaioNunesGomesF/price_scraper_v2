import { z } from "zod";

export const importSourceSchema = z.object({ url: z.string().url().max(2_000) });
export const createPriceAlertSchema = z.object({
  analysisId: z.string().uuid().optional(),
  analysisItemId: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(500),
  url: z.string().url().max(2_000).optional(),
  targetPriceBrl: z.number().finite().positive().max(200_000_000),
});
export const updatePriceAlertSchema = z.object({ active: z.boolean() });
export type CreatePriceAlertDTO = z.infer<typeof createPriceAlertSchema>;

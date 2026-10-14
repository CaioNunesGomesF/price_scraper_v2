import { z } from "zod";

export const searchRequestSchema = z.object({
  prompt: z.string().trim().min(3).max(1_000),
});

export const offerSchema = z.object({
  id: z.string(),
  source: z.string(),
  title: z.string(),
  price: z.number().nonnegative(),
  originalPrice: z.number().nonnegative().nullable(),
  currency: z.literal("BRL"),
  freeShipping: z.boolean(),
  seller: z.string().nullable(),
  location: z.string().nullable(),
  permalink: z.string().url(),
  thumbnail: z.string().url().nullable(),
  updatedAt: z.string().datetime(),
  rating: z.number().min(0).max(5).nullable().optional(),
  reviewCount: z.number().int().nonnegative().nullable().optional(),
  reviewHighlights: z.array(z.string().max(280)).max(3).optional(),
  priority: z.number().int().nonnegative().optional(),
});

export const sessionIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type SearchRequestDTO = z.infer<typeof searchRequestSchema>;
export type Offer = z.infer<typeof offerSchema>;

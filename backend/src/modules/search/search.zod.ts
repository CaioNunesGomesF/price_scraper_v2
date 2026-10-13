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
});

export type SearchRequestDTO = z.infer<typeof searchRequestSchema>;
export type Offer = z.infer<typeof offerSchema>;

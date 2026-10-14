import { z } from "zod";

export const interpretSearchRequestSchema = z.object({
  prompt: z.string().trim().min(3).max(1_000),
});

export const compareOfferSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(500),
  source: z.string().min(1).max(120),
  price: z.number().nonnegative(),
  originalPrice: z.number().nonnegative().nullable().optional().default(null),
  freeShipping: z.boolean().default(false),
  seller: z.string().max(200).nullable().optional().default(null),
});

export const compareOffersRequestSchema = z.object({
  offers: z.array(compareOfferSchema).min(2).max(8),
});

export const searchInterpretationSchema = z.object({
  category: z.string().nullable().optional().default(null),
  keywords: z.array(z.string()).catch([]),
  maxPrice: z.coerce.number().positive().nullable().optional().default(null),
  minStorageGb: z.coerce.number().int().nonnegative().nullable().optional().default(null),
  priorities: z.array(z.string()).catch([]),
  summary: z.string().catch("Busca realizada."),
  tip: z.string().nullable().optional().default(null),
  greeting: z.string().nullable().optional().default(null),
});

export const comparisonAnalysisSchema = z.object({
  summary: z.string().min(10).max(1_000),
  recommendation: z.string().min(10).max(1_000),
  priceInsight: z.string().min(10).max(1_000),
  bestOfferId: z.string().nullable(),
  highlights: z.array(z.object({
    offerId: z.string(),
    label: z.string().min(1).max(80),
    text: z.string().min(1).max(300),
  })).max(8),
});

export type InterpretSearchRequestDTO = z.infer<typeof interpretSearchRequestSchema>;
export type SearchInterpretation = z.infer<typeof searchInterpretationSchema>;
export type CompareOffersRequestDTO = z.infer<typeof compareOffersRequestSchema>;
export type ComparisonAnalysis = z.infer<typeof comparisonAnalysisSchema>;


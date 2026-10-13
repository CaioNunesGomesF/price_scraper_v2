import { z } from "zod";

export const interpretSearchRequestSchema = z.object({
  prompt: z.string().trim().min(3).max(1_000),
});

export const searchInterpretationSchema = z.object({
  category: z.string().nullable().optional().default(null),
  keywords: z.array(z.string()).catch([]),
  maxPrice: z.coerce.number().positive().nullable().optional().default(null),
  minStorageGb: z.coerce.number().int().nonnegative().nullable().optional().default(null),
  priorities: z.array(z.string()).catch([]),
  summary: z.string().catch("Busca realizada."),
});

export type InterpretSearchRequestDTO = z.infer<typeof interpretSearchRequestSchema>;
export type SearchInterpretation = z.infer<typeof searchInterpretationSchema>;

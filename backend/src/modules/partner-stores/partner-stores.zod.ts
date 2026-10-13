import { z } from "zod";

const httpUrl = z.string().trim().url().max(2_000).refine((value) => /^https?:\/\//i.test(value), "Informe um endereço HTTP ou HTTPS.");

const partnerProductSchema = z.object({
  title: z.string().trim().min(2).max(255),
  productUrl: httpUrl,
  imageUrl: httpUrl.nullable().optional(),
  price: z.number().finite().positive().max(20_000_000),
  inStock: z.boolean().default(true),
});

export const createPartnerStoreSchema = z.object({
  name: z.string().trim().min(2).max(160),
  websiteUrl: httpUrl,
  contactEmail: z.string().trim().email().max(320),
  description: z.string().trim().max(1_000).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().toUpperCase().length(2).optional(),
  products: z.array(partnerProductSchema).min(1).max(20),
});

export type CreatePartnerStoreDTO = z.infer<typeof createPartnerStoreSchema>;

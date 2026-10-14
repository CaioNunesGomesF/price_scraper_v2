import { z } from "zod";

export const equipmentCategorySlugSchema = z.enum([
  "monitor",
  "tv",
  "projector",
  "computer",
  "notebook",
  "server",
  "smartphone",
  "tablet",
  "console",
  "peripheral",
  "network",
  "component",
]);

export const dataOriginSchema = z.enum(["informed", "known", "estimated", "not_informed"]);
export const confidenceSchema = z.enum(["alta", "media", "baixa"]);
export const compatibilityStatusSchema = z.enum(["compativel", "incompativel", "parcial", "indeterminado"]);
export const sourceTypeSchema = z.enum(["official", "retailer", "marketplace", "aggregator", "knowledge_base", "manual"]);
export const trustLevelSchema = z.enum(["high", "medium", "low"]);

const jsonRecordSchema = z.record(z.string(), z.unknown());

export const analysisContextSchema = z.object({
  objective: z.string().trim().min(2).max(240).optional(),
  budgetBrl: z.number().finite().nonnegative().max(200_000_000).nullable().optional(),
  existingEquipment: z.string().trim().max(2_000).nullable().optional(),
  technicalLevel: z.enum(["iniciante", "intermediario", "avancado"]).optional(),
  region: z.literal("BR").default("BR"),
});

export const analysisItemInputSchema = z.object({
  nome: z.string().trim().min(2).max(500),
  origem: z.enum(["manual", "busca"]),
  offerId: z.string().max(180).optional(),
  confirmado: z.boolean().default(false),
});

export const createAnalysisInputSchema = z.object({
  input: z.string().trim().min(3).max(10_000),
  equipamentos: z.array(analysisItemInputSchema).min(1).max(8).optional(),
  categoria: equipmentCategorySlugSchema.optional(),
  contexto: analysisContextSchema.default({ region: "BR" }),
});

export const clarificationQuestionSchema = z.object({
  id: z.string().trim().min(1).max(80),
  question: z.string().trim().min(5).max(400),
  reason: z.string().trim().min(5).max(500),
  required: z.boolean(),
});

export const clarificationAnswerSchema = z.object({
  questionId: z.string().trim().min(1).max(80),
  answer: z.string().trim().max(1_000),
});

export const analysisAnswersSchema = z.object({
  answers: z.array(clarificationAnswerSchema).max(3),
});

export const estimateSchema = z.object({
  item: z.string().trim().min(1).max(160),
  valor: z.string().trim().min(1).max(500),
  base: z.string().trim().min(1).max(800),
  confianca: confidenceSchema,
});

const scoreSchema = z.object({
  score: z.number().int().min(0).max(10).nullable(),
  justificativa: z.string().trim().min(1).max(500),
});

export const scoresByUseSchema = z.object({
  jogos: scoreSchema,
  trabalho: scoreSchema,
  edicao: scoreSchema,
  uso_casual: scoreSchema,
  custo_beneficio: scoreSchema,
});

export const analysisEquipmentSchema = z.object({
  nome: z.string().trim().min(1).max(500),
  specs_informadas: jsonRecordSchema,
  specs_conhecidas: jsonRecordSchema,
  estimativas: z.array(estimateSchema),
  pontos_positivos: z.array(z.string().trim().min(1).max(500)),
  pontos_negativos: z.array(z.string().trim().min(1).max(500)),
  scores_por_uso: scoresByUseSchema,
});

export const compatibilityEvidenceSchema = z.object({
  item: z.string().trim().min(1).max(160),
  valor: z.string().trim().min(1).max(500),
  origem: dataOriginSchema,
  sourceId: z.string().uuid().nullable().optional(),
});

export const compatibilityCheckSchema = z.object({
  item_a: z.string().trim().min(1).max(300),
  item_b: z.string().trim().min(1).max(300),
  regra_usada: z.string().trim().min(5).max(1_000),
  dados_apoio: z.array(compatibilityEvidenceSchema),
  dados_faltantes: z.array(z.string().trim().min(1).max(160)),
  resultado: compatibilityStatusSchema,
});

export const analysisOutputSchema = z.object({
  categoria: equipmentCategorySlugSchema.nullable(),
  equipamentos: z.array(analysisEquipmentSchema).min(1).max(8),
  compatibilidade: z.array(compatibilityCheckSchema),
  suposicoes: z.array(z.string().trim().min(1).max(500)),
  dados_que_precisam_de_consulta_atualizada: z.array(z.enum(["preco", "disponibilidade", "drivers", "firmware", "lancamento", "suporte_software"])),
  dados_faltantes: z.array(z.string().trim().min(1).max(200)),
  recomendacao: z.object({
    escolha: z.string().trim().min(1).max(500),
    motivo: z.string().trim().min(1).max(1_000),
    alternativa: z.string().trim().min(1).max(500),
  }),
});

export const sourceContractSchema = z.object({
  type: sourceTypeSchema,
  name: z.string().trim().min(1).max(160),
  url: z.string().url().max(2_000),
  excerpt: z.string().max(2_000).optional(),
  retrievedAt: z.string().datetime({ offset: true }),
  trustLevel: trustLevelSchema,
});

export const priceObservationSchema = z.object({
  offerId: z.string().max(180).optional(),
  title: z.string().trim().min(1).max(500),
  price: z.number().finite().nonnegative(),
  currency: z.literal("BRL").default("BRL"),
  shippingPrice: z.number().finite().nonnegative().nullable().optional(),
  availability: z.enum(["available", "unavailable", "unknown"]),
  seller: z.string().max(240).nullable().optional(),
  url: z.string().url().max(2_000),
  observedAt: z.string().datetime({ offset: true }),
  expiresAt: z.string().datetime({ offset: true }),
  source: sourceContractSchema,
});

export const compatibilityResultSchema = z.object({
  itemA: z.string().min(1).max(300),
  itemB: z.string().min(1).max(300),
  ruleUsed: z.string().min(5).max(1_000),
  supportingData: z.array(compatibilityEvidenceSchema),
  missingData: z.array(z.string().min(1).max(160)),
  result: compatibilityStatusSchema,
});

export const anonymousUsageSchema = z.object({
  subjectHash: z.string().trim().min(32).max(128),
  usageDate: z.string().date(),
  analysisCount: z.number().int().nonnegative(),
  dailyLimit: z.number().int().positive(),
});

export type CreateAnalysisInputDTO = z.infer<typeof createAnalysisInputSchema>;
export type AnalysisContextDTO = z.infer<typeof analysisContextSchema>;
export type AnalysisOutputDTO = z.infer<typeof analysisOutputSchema>;
export type CompatibilityCheckDTO = z.infer<typeof compatibilityCheckSchema>;
export type PriceObservationDTO = z.infer<typeof priceObservationSchema>;
export type SourceContractDTO = z.infer<typeof sourceContractSchema>;

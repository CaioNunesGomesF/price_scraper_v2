export type AnalyzerQuestion = { id: string; question: string; reason: string; required: boolean };
export type AnalyzerScore = { score: number | null; justificativa: string };
export type AnalyzerEquipment = {
  nome: string;
  specs_informadas: Record<string, unknown>;
  specs_conhecidas: Record<string, unknown>;
  estimativas: Array<{ item: string; valor: string; base: string; confianca: "alta" | "media" | "baixa" }>;
  pontos_positivos: string[];
  pontos_negativos: string[];
  scores_por_uso: Record<string, AnalyzerScore>;
};
export type CompatibilityCheck = {
  item_a: string;
  item_b: string;
  regra_usada: string;
  dados_apoio: Array<{ item: string; valor: string; origem: string }>;
  dados_faltantes: string[];
  resultado: "compativel" | "incompativel" | "parcial" | "indeterminado";
};
export type AnalyzerResult = {
  categoria: string | null;
  equipamentos: AnalyzerEquipment[];
  compatibilidade: CompatibilityCheck[];
  suposicoes: string[];
  dados_que_precisam_de_consulta_atualizada: string[];
  dados_faltantes: string[];
  recomendacao: { escolha: string; motivo: string; alternativa: string };
};
export type AnalyzerSession = {
  id: string;
  input: string;
  contexto: { objective?: string; budgetBrl?: number | null; existingEquipment?: string | null; region: "BR" };
  perguntas: AnalyzerQuestion[];
  status: "needs_questions" | "processing" | "completed" | "partial" | "failed";
  resumo: string | null;
  resultado: AnalyzerResult | null;
  modelo: string | null;
  modeloFallback: string | null;
  criadoEm: string;
  atualizadoEm: string;
  equipamentos: Array<{ id: string; nome: string; nomeNormalizado: string | null; confirmado: boolean; specs: Record<string, unknown>; estimativas: unknown[] }>;
  compatibilidade: unknown[];
};
export type AnalyzerPrice = { id: string; itemId: string | null; title: string; price: number; currency: string; seller: string | null; url: string; observedAt: string; expiresAt: string; availability: string };

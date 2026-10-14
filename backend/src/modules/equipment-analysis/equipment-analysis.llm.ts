import { env } from "../../config/env.js";
import { analysisOutputSchema, type AnalysisOutputDTO } from "./equipment-analysis.zod.js";

type ModelResult = { output: AnalysisOutputDTO; modelName: string; fallbackModelName: string | null };
type ChatResponse = { message?: { content?: string }; choices?: Array<{ message?: { content?: string } }> };

const systemPrompt = `Voce e um analista tecnico universal de equipamentos eletronicos no Brasil.
Responda exclusivamente JSON valido seguindo o contrato recebido.
Regras inegociaveis: nunca invente especificacoes ausentes; use specs_informadas para o que veio na entrada, specs_conhecidas somente para conhecimento tecnico estavel e seguro, e estimativas somente com base e confianca. Precos, disponibilidade, firmware, drivers, lancamentos e suporte nunca podem vir da memoria. Compatibilidade nunca e booleana: use somente compativel, incompativel, parcial ou indeterminado, sempre preenchendo regra_usada, dados_apoio e dados_faltantes. Se faltar base, use indeterminado. Scores devem ser null quando nao houver base e a justificativa deve explicar o motivo. Escreva em portugues do Brasil, sem markdown dentro do JSON.`;

function cleanJson(value: string) {
  return value.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
}

function deterministicFallback(items: Array<{ nome: string; confirmado: boolean }>, category: string | null): AnalysisOutputDTO {
  const blankScores = () => ({
    jogos: { score: null, justificativa: "Sem especificacoes suficientes para pontuar com seguranca." },
    trabalho: { score: null, justificativa: "Sem especificacoes suficientes para pontuar com seguranca." },
    edicao: { score: null, justificativa: "Sem especificacoes suficientes para pontuar com seguranca." },
    uso_casual: { score: null, justificativa: "Sem especificacoes suficientes para pontuar com seguranca." },
    custo_beneficio: { score: null, justificativa: "Preco e dados tecnicos precisam de consulta atualizada." },
  });
  const equipments = items.map((item) => ({
    nome: item.nome,
    specs_informadas: { nome: item.nome, confirmado: item.confirmado },
    specs_conhecidas: {},
    estimativas: [],
    pontos_positivos: [item.confirmado ? "Produto confirmado na fonte de origem." : "Item aceito para triagem, ainda nao confirmado."],
    pontos_negativos: ["Especificacoes tecnicas suficientes ainda nao foram encontradas."],
    scores_por_uso: blankScores(),
  }));
  const compatibility = [];
  for (let index = 1; index < items.length; index += 1) {
    compatibility.push({
      item_a: items[0]!.nome,
      item_b: items[index]!.nome,
      regra_usada: "A compatibilidade so pode ser verificada com interfaces, padroes, dimensoes e requisitos dos dois itens.",
      dados_apoio: [],
      dados_faltantes: ["especificacoes relevantes do item A", "especificacoes relevantes do item B", "objetivo da combinacao"],
      resultado: "indeterminado" as const,
    });
  }
  return {
    categoria: category as AnalysisOutputDTO["categoria"],
    equipamentos: equipments,
    compatibilidade: compatibility,
    suposicoes: ["A analise foi limitada aos nomes fornecidos; nenhum dado ausente foi inventado."],
    dados_que_precisam_de_consulta_atualizada: ["preco", "disponibilidade", "drivers", "firmware", "lancamento", "suporte_software"],
    dados_faltantes: ["objetivo de uso", "especificacoes tecnicas confirmadas", "orcamento"],
    recomendacao: {
      escolha: "Indeterminado ate confirmar os dados tecnicos.",
      motivo: "Nao ha base suficiente para recomendar um equipamento sem inventar informacoes.",
      alternativa: "Envie links, fichas tecnicas ou responda as perguntas de contexto.",
    },
  };
}

async function callOllama(input: unknown): Promise<string> {
  const response = await fetch(`${env.OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({ model: env.OLLAMA_MODEL, stream: false, format: "json", options: { temperature: 0.1, num_predict: 2_800 }, messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: JSON.stringify(input) },
    ] }),
  });
  if (!response.ok) throw new Error(`primary_llm_${response.status}`);
  const payload = await response.json() as ChatResponse;
  const content = payload.message?.content;
  if (!content) throw new Error("primary_llm_empty");
  return cleanJson(content);
}

async function callExternalFallback(input: unknown): Promise<{ content: string; model: string } | null> {
  const baseUrl = process.env.LLM_FALLBACK_BASE_URL;
  const model = env.LLM_FALLBACK_MODEL;
  if (!baseUrl || !model) return null;
  const response = await fetch(`${env.LLM_FALLBACK_BASE_URL!.replace(/\/$/, "")}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(env.LLM_FALLBACK_API_KEY ? { Authorization: `Bearer ${env.LLM_FALLBACK_API_KEY}` } : {}) },
    signal: AbortSignal.timeout(12_000),
    body: JSON.stringify({ model, temperature: 0.1, max_tokens: env.LLM_FALLBACK_MAX_TOKENS, response_format: { type: "json_object" }, messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: JSON.stringify(input) },
    ] }),
  });
  if (!response.ok) return null;
  const payload = await response.json() as ChatResponse;
  const content = payload.choices?.[0]?.message?.content;
  return content ? { content: cleanJson(content), model } : null;
}

export async function analyzeEquipment(input: {
  category: string | null;
  rawInput: string;
  context: unknown;
  items: Array<{ nome: string; confirmado: boolean }>;
}): Promise<ModelResult> {
  const request = { categoria: input.category, entrada: input.rawInput, contexto: input.context, equipamentos: input.items };
  try {
    const output = analysisOutputSchema.parse(JSON.parse(await callOllama(request)));
    return { output, modelName: env.OLLAMA_MODEL, fallbackModelName: null };
  } catch (error) {
    console.error("Universal analysis primary model failed:", error);
    try {
      const fallback = await callExternalFallback(request);
      if (fallback) {
        const output = analysisOutputSchema.parse(JSON.parse(fallback.content));
        return { output, modelName: env.OLLAMA_MODEL, fallbackModelName: fallback.model };
      }
    } catch (fallbackError) {
      console.error("Universal analysis fallback model failed:", fallbackError);
    }
    return { output: deterministicFallback(input.items, input.category), modelName: "deterministic-fallback", fallbackModelName: null };
  }
}

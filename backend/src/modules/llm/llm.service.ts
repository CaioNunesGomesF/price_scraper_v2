import { env } from "../../config/env.js";
import { ServiceUnavailableError } from "../../errors/app-error.js";
import {
  InterpretSearchRequestDTO,
  SearchInterpretation,
  searchInterpretationSchema,
} from "./llm.zod.js";

const systemPrompt = `Voce interpreta pedidos de compra em portugues do Brasil.
Retorne APENAS um objeto JSON valido, sem markdown, seguindo exatamente esta estrutura:
{
  "category": null,
  "keywords": [],
  "maxPrice": null,
  "minStorageGb": null,
  "priorities": [],
  "summary": ""
}
Use strings em category, keywords, priorities e summary; numeros em maxPrice e
minStorageGb; null quando um valor nao foi informado. Extraia somente
informacoes presentes ou diretamente inferiveis no pedido. Nao invente marca,
preco ou especificacao.`;

type OllamaChatResponse = {
  message?: { content?: string };
};

export async function interpretSearch(
  data: InterpretSearchRequestDTO,
): Promise<SearchInterpretation> {
  let response: Response;

  try {
    response = await fetch(`${env.OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(90_000),
      body: JSON.stringify({
        model: env.OLLAMA_MODEL,
        stream: false,
        format: "json",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: data.prompt },
        ],
      }),
    });
  } catch {
    throw new ServiceUnavailableError(
      "Nao foi possivel conectar ao servico de IA. Verifique o container Ollama.",
    );
  }

  if (!response.ok) {
    throw new ServiceUnavailableError("O servico de IA nao esta pronto para atender a busca.", {
      status: response.status,
    });
  }

  const payload = (await response.json()) as OllamaChatResponse;
  const content = payload.message?.content;

  if (!content) {
    throw new ServiceUnavailableError("O servico de IA retornou uma resposta vazia.");
  }

  try {
    const cleaned = content.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(cleaned);
    return searchInterpretationSchema.parse(parsed);
  } catch (err) {
    console.error("LLM parse fallback, raw content:", content, err);
    return {
      category: null,
      keywords: data.prompt.split(/\s+/).filter((w) => w.length > 2),
      maxPrice: null,
      minStorageGb: null,
      priorities: [],
      summary: data.prompt,
    };
  }
}

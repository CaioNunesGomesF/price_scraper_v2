import { env } from "../../config/env.js";
import {
  ComparisonAnalysis,
  CompareOffersRequestDTO,
  InterpretSearchRequestDTO,
  SearchInterpretation,
  comparisonAnalysisSchema,
  searchInterpretationSchema,
} from "./llm.zod.js";

const systemPrompt = `Você é o "Achado", um assistente especialista em compras inteligentes, ágil, simpático, descontraído e que realmente entende de produtos, tecnologia e custo-benefício (português do Brasil).

Seu papel é analisar o pedido do usuário e responder de forma empolgante, amigável e com dicas práticas de especialista para quem quer fazer um bom negócio.

Retorne SEMPRE e EXCLUSIVAMENTE um objeto JSON válido, sem texto fora do JSON e sem blocos markdown extras, seguindo exatamente este modelo:
{
  "category": "Eletrônicos, Informática, Games, Casa, etc. (ou null se incerto)",
  "keywords": ["palavras-chave limpas e eficazes para buscar em lojas online"],
  "maxPrice": 0 (número limite se o usuário falou de orçamento/preço máximo, ex: até 2000 => 2000, ou null),
  "minStorageGb": 0 (se mencionou capacidade/armazenamento, ou null),
  "priorities": ["2 a 3 pontos fortes pedidos, ex: Foco em Bateria, Alto Desempenho, Custo-Benefício, Frete Grátis"],
  "summary": "Uma mensagem conversacional bem bacana, vibrante e prestativa comentando o que o usuário quer comprar e o que você garimpou para ele (2 a 3 frases calorosas, naturais e sem enrolação robótica).",
  "tip": "Uma dica de ouro prática de quem entende do produto para ajudar o usuário a não se arrepender na hora da compra."
}

Exemplos de tom para "summary":
- "Show de bola! Já garimpei as melhores ofertas de notebook com boa autonomia e desempenho para seus estudos. Dá uma conferida nas opções que separei para você:"
- "Boa escolha! Separei celulares potentes nessa faixa de preço para você rodar seus jogos com ótima fluidez e sem gastar além da conta. Veja as alternativas:"
- "Excelente ideia! Encontrei fones sem fio com cancelamento de ruído e ótimo custo-benefício nas principais lojas. Compare os preços abaixo:"

Exemplos de "tip":
- "Dica do especialista: nessa categoria, fique de olho em modelos com pelo menos 8GB de RAM e armazenamento SSD para garantir agilidade no dia a dia!"
- "Dica de ouro: repare se o vendedor oferece garantia oficial e se o frete para a sua região compensa o desconto do anúncio."

Regras obrigatórias:
1. "summary" DEVE ser uma mensagem amigável, entusiasmada e descontraída em português do Brasil. NUNCA apenas repita o texto do usuário.
2. "tip" DEVE ser uma dica útil e prática sobre o produto procurado.
3. Não invente especificações técnicas absurdas; seja preciso e útil.
4. Responda apenas o JSON puro.`;

type OllamaChatResponse = {
  message?: { content?: string };
};

function generateFriendlyFallback(prompt: string): SearchInterpretation {
  const lower = prompt.toLowerCase();
  const words = prompt.split(/\s+/).filter((w) => w.length > 2);

  let tip = "Dica de ouro: confira sempre a reputação da loja e o prazo de entrega antes de fechar a compra!";
  let priorities = ["Custo-Benefício", "Melhor Preço"];
  let summary = `Garimpei as melhores ofertas para "${prompt}". Dá uma olhada nas opções que encontrei para você comparar:`;

  if (lower.includes("celular") || lower.includes("smartphone") || lower.includes("iphone") || lower.includes("samsung") || lower.includes("xiaomi") || lower.includes("motorola")) {
    tip = "Dica do especialista: repare na quantidade de memória RAM (mínimo 6GB para não travar) e se o aparelho tem taxa de atualização de 90Hz ou 120Hz para mais fluidez.";
    priorities = ["Desempenho", "Câmera & Tela", "Custo-Benefício"];
    summary = `Bela busca! Garimpei as melhores opções de smartphones para você comparar desempenho, câmeras e preços nas lojas:`;
  } else if (lower.includes("notebook") || lower.includes("laptop") || lower.includes("computador") || lower.includes("pc")) {
    tip = "Dica do especialista: priorize modelos com SSD NVMe e pelo menos 8GB ou 16GB de RAM para ter inicialização rápida e vida útil prolongada.";
    priorities = ["Produtividade", "Bateria", "Velocidade"];
    summary = `Excelente escolha! Vasculhei as principais lojas atrás de notebooks confiáveis e com ótimo custo-benefício para a sua rotina:`;
  } else if (lower.includes("fone") || lower.includes("headset") || lower.includes("airpods") || lower.includes("headphone")) {
    tip = "Dica do especialista: verifique a autonomia da bateria do estojo e se o modelo possui cancelamento ativo de ruído (ANC) para mais conforto acústico.";
    priorities = ["Qualidade de Som", "Conforto", "Autonomia"];
    summary = `Música nos ouvidos! Selecionei fones bem avaliados com excelente equilíbrio de áudio, bateria e conforto para você comparar:`;
  } else if (lower.includes("tv") || lower.includes("monitor") || lower.includes("televisão")) {
    tip = "Dica do especialista: dê atenção à taxa de atualização (mínimo 60Hz para filmes ou 120Hz para games) e ao tipo de painel (IPS ou OLED para melhores cores).";
    priorities = ["Qualidade de Imagem", "Conexões HDMI", "Design"];
    summary = `Buscando uma tela top? Encontrei ofertas imperdíveis para você aproveitar imagens nítidas sem pagar mais caro:`;
  } else if (lower.includes("gamer") || lower.includes("jogo") || lower.includes("jogos") || lower.includes("placa de video") || lower.includes("rtx")) {
    tip = "Dica gamer: certifique-se da compatibilidade de peças e do sistema de resfriamento para garantir que seu setup mantenha o rendimento máximo sem superaquecer.";
    priorities = ["Alto FPS", "Refrigeração", "Baixa Latência"];
    summary = `Setup pronto pro play! Filtrei as melhores opções gamers com o melhor equilíbrio entre potência e preço:`;
  }

  // Detect maxPrice if mentioned like "até 2000", "ate 1500", etc.
  const priceMatch = prompt.match(/(?:até|ate|menos de|maximo|máximo)\s*(?:r\$)?\s*([\d\.,]+)/i);
  let maxPrice: number | null = null;
  if (priceMatch && priceMatch[1]) {
    const rawNum = priceMatch[1].replace(/\./g, "").replace(",", ".");
    const val = parseFloat(rawNum);
    if (!isNaN(val) && val > 0) maxPrice = val;
  }


  return {
    category: null,
    keywords: words,
    maxPrice,
    minStorageGb: null,
    priorities,
    summary,
    tip,
    greeting: null,
  };
}

// Mantém a primeira resposta útil mesmo quando o modelo local está ocupado.
// A chamada completa continua podendo ser usada pelo cache em execuções futuras.
export function getSearchFallback(prompt: string): SearchInterpretation {
  return generateFriendlyFallback(prompt);
}

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
    return generateFriendlyFallback(data.prompt);
  }

  if (!response.ok) {
    return generateFriendlyFallback(data.prompt);
  }

  const payload = (await response.json()) as OllamaChatResponse;
  const content = payload.message?.content;

  if (!content) {
    return generateFriendlyFallback(data.prompt);
  }

  try {
    const cleaned = content.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(cleaned);
    const validated = searchInterpretationSchema.parse(parsed);

    const fallback = generateFriendlyFallback(data.prompt);
    if (!validated.summary || validated.summary.length < 10) {
      validated.summary = fallback.summary;
    }
    if (!validated.tip) {
      validated.tip = fallback.tip;
    }
    if (!validated.priorities || validated.priorities.length === 0) {
      validated.priorities = fallback.priorities;
    }

    return validated;

  } catch (err) {
    console.error("LLM parse fallback, raw content:", content, err);
    return generateFriendlyFallback(data.prompt);
  }
}

function generateComparisonFallback(data: CompareOffersRequestDTO): ComparisonAnalysis {
  const offers = data.offers;
  const sorted = [...offers].sort((a, b) => a.price - b.price);
  const cheapest = sorted[0]!;
  const highest = sorted[sorted.length - 1]!;
  const average = offers.reduce((sum, offer) => sum + offer.price, 0) / offers.length;
  const difference = highest.price - cheapest.price;
  const money = (value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return {
    summary: `Comparei ${offers.length} ofertas usando os preços informados, a loja e as condições de frete. A opção mais barata é ${cheapest.title}.`,
    recommendation: `A melhor economia está em ${cheapest.title}, por ${money(cheapest.price)} na ${cheapest.source}. Confira se o vendedor e a garantia atendem ao que você precisa antes de fechar.`,
    priceInsight: `A média da seleção é ${money(average)} e a diferença entre a maior e a menor oferta é ${money(difference)}.`,
    bestOfferId: cheapest.id,
    highlights: sorted.slice(0, 8).map((offer, index) => ({
      offerId: offer.id,
      label: index === 0 ? "Menor preço" : offer.freeShipping ? "Frete grátis" : "Alternativa",
      text: `${money(offer.price)} na ${offer.source}${offer.freeShipping ? ", com frete grátis" : ""}.`,
    })),
  };
}

const comparisonSystemPrompt = `Você é o Achado, um especialista brasileiro em comparação de compras.
Analise somente as ofertas recebidas. Não invente preços, descontos, frete, avaliações ou desempenho. O preço, a média e a diferença devem respeitar os números enviados. Responda exclusivamente com JSON válido neste formato:
{
  "summary": "resumo curto da comparação",
  "recommendation": "recomendação prática, citando o título e o id da melhor oferta",
  "priceInsight": "leitura da média, diferença e do que muda entre as ofertas",
  "bestOfferId": "id exato da melhor oferta ou null",
  "highlights": [{ "offerId": "id exato", "label": "Menor preço | Frete grátis | Alternativa", "text": "observação curta baseada nos dados" }]
}
Escreva em português do Brasil, com tom claro e útil.`;

export async function compareOffers(data: CompareOffersRequestDTO): Promise<ComparisonAnalysis> {
  const fallback = generateComparisonFallback(data);
  const compactOffers = data.offers.map(({ id, title, source, price, originalPrice, freeShipping, seller }) => ({
    id,
    title,
    source,
    price,
    originalPrice,
    freeShipping,
    seller,
  }));

  let response: Response;
  try {
    response = await fetch(`${env.OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(12_000),
      body: JSON.stringify({
        model: env.OLLAMA_MODEL,
        stream: false,
        format: "json",
        options: { temperature: 0.2, num_predict: 280 },
        messages: [
          { role: "system", content: comparisonSystemPrompt },
          { role: "user", content: JSON.stringify({ offers: compactOffers }) },
        ],
      }),
    });
  } catch {
    return fallback;
  }

  if (!response.ok) return fallback;

  const payload = (await response.json()) as OllamaChatResponse;
  const content = payload.message?.content;
  if (!content) return fallback;

  try {
    const parsed = JSON.parse(content.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim());
    const validated = comparisonAnalysisSchema.parse(parsed);
    const ids = new Set(data.offers.map((offer) => offer.id));
    if (validated.bestOfferId && !ids.has(validated.bestOfferId)) validated.bestOfferId = fallback.bestOfferId;
    validated.highlights = validated.highlights
      .filter((highlight) => ids.has(highlight.offerId))
      .slice(0, 8);
    return validated;
  } catch (error) {
    console.error("LLM comparison fallback, invalid content:", error);
    return fallback;
  }
}


import { NotFoundError } from "../../errors/app-error.js";
import { authenticate } from "../auth/auth.service.js";
import * as llmService from "../llm/llm.service.js";
import { searchInterpretationSchema, type SearchInterpretation } from "../llm/llm.zod.js";
import * as partnerStoresService from "../partner-stores/partner-stores.service.js";
import * as searchRepository from "./search.repository.js";
import { offerSchema, SearchRequestDTO, type Offer } from "./search.zod.js";

const CACHE_TTL_MS = 10 * 60 * 1_000;
const MAX_STALE_MS = 60 * 60 * 1_000;
const RESPONSE_BUDGET_MS = 12 * 1_000;
const INTERPRETATION_BUDGET_MS = 3_500;

type SearchPayload = {
  interpretation: SearchInterpretation;
  offers: Offer[];
};

const refreshesInFlight = new Map<string, Promise<SearchPayload>>();

function normalizeQueryKey(prompt: string) {
  return prompt
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .slice(0, 500);
}

function resolveWithin<T>(promise: Promise<T>, fallback: T, timeoutMs: number) {
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => resolve(fallback), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
}

async function collectOffers(prompt: string) {
  const results = await Promise.allSettled([
    searchRepository.searchMercadoLivre(prompt),
    searchRepository.searchKabum(prompt),
    searchRepository.searchGoogleShopping(prompt),
    partnerStoresService.searchPartnerProducts(prompt),
  ]);

  return results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
}

function filterOffers(offers: Offer[], interpretation: SearchInterpretation) {
  const filtered = interpretation.maxPrice
    ? offers.filter((offer) => offer.price <= interpretation.maxPrice!)
    : offers;
  return filtered.sort((a, b) => {
    const priceDifference = a.price - b.price;
    const priorityDifference = (b.priority ?? 0) - (a.priority ?? 0);
    const priceWindow = Math.max(a.price, b.price, 1);
    const closeInPrice = Math.abs(priceDifference) / priceWindow <= 0.05;
    return closeInPrice && priorityDifference !== 0 ? priorityDifference : priceDifference;
  });
}

function readCachedPayload(entry: Awaited<ReturnType<typeof searchRepository.getSearchCache>>): SearchPayload | null {
  if (!entry) return null;
  const interpretation = searchInterpretationSchema.safeParse(entry.interpretation);
  const offers = offerSchema.array().safeParse(entry.offers);
  if (!interpretation.success || !offers.success) return null;
  return { interpretation: interpretation.data, offers: offers.data };
}

function startRefresh(prompt: string, queryKey: string) {
  const existing = refreshesInFlight.get(queryKey);
  if (existing) return existing;

  const fallback = llmService.getSearchFallback(prompt);
  const interpretationPromise = resolveWithin(
    llmService.interpretSearch({ prompt }),
    fallback,
    INTERPRETATION_BUDGET_MS,
  );
  const offersPromise = collectOffers(prompt);
  const refresh = Promise.all([offersPromise, interpretationPromise])
    .then(async ([offers, interpretation]) => {
      const payload = { interpretation, offers: filterOffers(offers, interpretation) };
      const fetchedAt = new Date();
      // Não mantém uma resposta vazia por dez minutos quando todas as fontes
      // falharam temporariamente. Uma busca sem resultados continua podendo ser
      // retornada, mas a próxima tentativa terá chance de consultar as lojas.
      if (payload.offers.length > 0) {
        await searchRepository.saveSearchCache({
          queryKey,
          prompt,
          interpretation: payload.interpretation,
          offers: payload.offers,
          fetchedAt,
          expiresAt: new Date(fetchedAt.getTime() + CACHE_TTL_MS),
        });
      }
      return payload;
    })
    .catch((error) => {
      console.warn("Atualização do cache de busca falhou.", error);
      return { interpretation: fallback, offers: [] };
    });

  refreshesInFlight.set(queryKey, refresh);
  void refresh.finally(() => refreshesInFlight.delete(queryKey));
  return refresh;
}

async function saveSessionIfAuthenticated(
  authorization: string | undefined,
  prompt: string,
  payload: SearchPayload,
) {
  let sessionRecord: { id: string; createdAt: Date } | null = null;
  if (authorization) {
    try {
      const user = await authenticate(authorization);
      const created = await searchRepository.createSession(
        user.userId,
        prompt,
        payload.interpretation,
        payload.offers,
      );
      if (created) sessionRecord = { id: created.id, createdAt: created.createdAt };
    } catch {
      // Falha de autenticação não impede a busca anônima se aplicável
    }
  }
  return sessionRecord;
}

export async function searchOffers(data: SearchRequestDTO, authorization?: string) {
  const queryKey = normalizeQueryKey(data.prompt);
  const cachedEntry = await searchRepository.getSearchCache(queryKey);
  const cachedPayload = readCachedPayload(cachedEntry);
  const now = Date.now();

  if (cachedPayload && cachedEntry) {
    const age = now - cachedEntry.fetchedAt.getTime();
    if (age <= MAX_STALE_MS) {
      if (cachedEntry.expiresAt.getTime() <= now) {
        // stale-while-revalidate: a pessoa recebe o último resultado e a próxima busca atualiza a fonte.
        void startRefresh(data.prompt, queryKey);
      }
      const sessionRecord = await saveSessionIfAuthenticated(authorization, data.prompt, cachedPayload);
      return {
        id: sessionRecord?.id ?? null,
        prompt: data.prompt,
        interpretation: cachedPayload.interpretation,
        offers: cachedPayload.offers,
        createdAt: sessionRecord?.createdAt ? sessionRecord.createdAt.toISOString() : new Date().toISOString(),
      };
    }
  }

  // Em uma busca nova, aguarda somente a janela de resposta. O refresh continua em segundo plano
  // e abastece o cache para a próxima consulta, evitando chamadas repetidas às mesmas fontes.
  const payload = await resolveWithin(
    startRefresh(data.prompt, queryKey),
    { interpretation: llmService.getSearchFallback(data.prompt), offers: [] },
    RESPONSE_BUDGET_MS,
  );
  const sessionRecord = await saveSessionIfAuthenticated(authorization, data.prompt, payload);

  return {
    id: sessionRecord?.id ?? null,
    prompt: data.prompt,
    interpretation: payload.interpretation,
    offers: payload.offers,
    createdAt: sessionRecord?.createdAt ? sessionRecord.createdAt.toISOString() : new Date().toISOString(),
  };
}

export async function listChatSessions(authorization?: string) {
  const { userId } = await authenticate(authorization);
  const rows = await searchRepository.listSessions(userId);
  return rows.map((row) => ({
    id: row.id,
    prompt: row.prompt,
    interpretation: row.interpretation,
    offers: row.offers,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function listDashboardOffers(authorization?: string) {
  const cached = await searchRepository.listCachedOffers();
  let historicalOffers: Offer[] = [];

  if (authorization) {
    try {
      const user = await authenticate(authorization);
      historicalOffers = await searchRepository.listSessionOffers(user.userId);
    } catch {
      // O dashboard ainda pode exibir o cache global se a sessão não estiver disponível.
    }
  }

  const uniqueOffers = new Map<string, Offer>();
  for (const offer of [...cached.offers, ...historicalOffers]) {
    if (!uniqueOffers.has(offer.id)) uniqueOffers.set(offer.id, offer);
  }

  return {
    offers: [...uniqueOffers.values()].sort((a, b) => a.price - b.price),
    cachedSearches: cached.cachedSearches,
    lastUpdatedAt: cached.lastUpdatedAt,
  };
}

export async function getChatSession(id: string, authorization?: string) {
  const { userId } = await authenticate(authorization);
  const session = await searchRepository.getSessionById(userId, id);
  if (!session) {
    throw new NotFoundError("Busca não encontrada.");
  }
  return {
    id: session.id,
    prompt: session.prompt,
    interpretation: session.interpretation,
    offers: session.offers,
    createdAt: session.createdAt.toISOString(),
  };
}

export async function deleteChatSession(id: string, authorization?: string) {
  const { userId } = await authenticate(authorization);
  await searchRepository.deleteSession(userId, id);
}

export async function clearChatSessions(authorization?: string) {
  const { userId } = await authenticate(authorization);
  await searchRepository.clearSessions(userId);
}


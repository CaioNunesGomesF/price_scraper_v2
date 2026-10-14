import { and, desc, eq } from "drizzle-orm";
import db from "../../config/db.js";
import { env } from "../../config/env.js";
import { ServiceUnavailableError } from "../../errors/app-error.js";
import { getValidAccessToken } from "../integrations/mercado-livre/mercado-livre.service.js";
import { chatSessionsTable, searchCacheTable } from "./search.schema.js";
import { offerSchema, Offer } from "./search.zod.js";

type MercadoLivreSearchResponse = {
  results?: Array<{
    id?: string;
    title?: string;
    price?: number;
    original_price?: number | null;
    currency_id?: string;
    permalink?: string;
    thumbnail?: string;
    seller?: { id?: number; nickname?: string };
    address?: { city_name?: string; state_name?: string };
    shipping?: { free_shipping?: boolean };
  }>;
};

export async function searchMercadoLivre(query: string): Promise<Offer[]> {
  const accessToken = await getValidAccessToken();
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
  };

  try {
    const response = await fetch(
      `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(query)}&limit=10&sort=relevance`,
      { headers, signal: AbortSignal.timeout(10_000) },
    );
    if (!response.ok) throw new ServiceUnavailableError("Nao foi possivel pesquisar no Mercado Livre.");

    const payload = (await response.json()) as MercadoLivreSearchResponse;
    const offers: Array<Offer | null> = (payload.results ?? []).slice(0, 10).map((item): Offer | null => {
      if (!item.id || typeof item.price !== "number" || !item.title || !item.permalink) return null;
      const location = [item.address?.city_name, item.address?.state_name].filter(Boolean).join(", ") || null;
      return {
        id: item.id,
        source: "mercado_livre" as const,
        title: item.title,
        price: item.price,
        originalPrice: item.original_price ?? null,
        currency: "BRL" as const,
        freeShipping: item.shipping?.free_shipping ?? false,
        seller: item.seller?.nickname ?? (item.seller?.id ? `Vendedor #${item.seller.id}` : null),
        location,
        permalink: item.permalink,
        thumbnail: item.thumbnail?.replace("http://", "https://") ?? null,
        updatedAt: new Date().toISOString(),
      } satisfies Offer;
    });
    return offers.filter((item): item is Offer => item !== null);
  } catch (error) {
    if (error instanceof ServiceUnavailableError) throw error;
    throw new ServiceUnavailableError("O Mercado Livre nao respondeu a busca.");
  }
}

export async function getSearchCache(queryKey: string) {
  try {
    const [entry] = await db
      .select()
      .from(searchCacheTable)
      .where(eq(searchCacheTable.queryKey, queryKey));
    return entry ?? null;
  } catch (error) {
    console.warn("Cache de busca indisponível; seguindo sem cache.", error);
    return null;
  }
}

export async function saveSearchCache(input: {
  queryKey: string;
  prompt: string;
  interpretation: unknown;
  offers: unknown;
  fetchedAt: Date;
  expiresAt: Date;
  lastError?: string | null;
}) {
  try {
    const [entry] = await db
      .insert(searchCacheTable)
      .values(input)
      .onConflictDoUpdate({
        target: searchCacheTable.queryKey,
        set: {
          prompt: input.prompt,
          interpretation: input.interpretation,
          offers: input.offers,
          fetchedAt: input.fetchedAt,
          expiresAt: input.expiresAt,
          lastError: input.lastError ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();
    return entry ?? null;
  } catch (error) {
    console.warn("Não foi possível atualizar o cache de busca.", error);
    return null;
  }
}

export async function listCachedOffers(limit = 200) {
  try {
    const rows = await db
      .select({ offers: searchCacheTable.offers, fetchedAt: searchCacheTable.fetchedAt })
      .from(searchCacheTable)
      .orderBy(desc(searchCacheTable.fetchedAt))
      .limit(50);
    const uniqueOffers = new Map<string, Offer>();

    for (const row of rows) {
      const parsed = offerSchema.array().safeParse(row.offers);
      if (!parsed.success) continue;
      for (const offer of parsed.data) {
        if (!uniqueOffers.has(offer.id)) uniqueOffers.set(offer.id, offer);
        if (uniqueOffers.size >= limit) break;
      }
      if (uniqueOffers.size >= limit) break;
    }

    return {
      offers: [...uniqueOffers.values()].sort((a, b) => a.price - b.price),
      cachedSearches: rows.length,
      lastUpdatedAt: rows[0]?.fetchedAt?.toISOString() ?? null,
    };
  } catch (error) {
    console.warn("Não foi possível carregar as ofertas do dashboard.", error);
    return { offers: [], cachedSearches: 0, lastUpdatedAt: null };
  }
}

export async function listSessionOffers(userId: string, limit = 200) {
  try {
    const rows = await db
      .select({ offers: chatSessionsTable.offers, createdAt: chatSessionsTable.createdAt })
      .from(chatSessionsTable)
      .where(eq(chatSessionsTable.userId, userId))
      .orderBy(desc(chatSessionsTable.createdAt))
      .limit(50);
    const uniqueOffers = new Map<string, Offer>();

    for (const row of rows) {
      const parsed = offerSchema.array().safeParse(row.offers);
      if (!parsed.success) continue;
      for (const offer of parsed.data) {
        if (!uniqueOffers.has(offer.id)) uniqueOffers.set(offer.id, offer);
        if (uniqueOffers.size >= limit) break;
      }
      if (uniqueOffers.size >= limit) break;
    }

    return [...uniqueOffers.values()].sort((a, b) => a.price - b.price);
  } catch (error) {
    console.warn("Não foi possível carregar as ofertas do histórico.", error);
    return [];
  }
}

type KabumProduct = {
  id: string | number;
  attributes?: {
    title?: string;
    price?: number;
    price_with_discount?: number;
    photos?: {
      g?: string[];
      m?: string[];
    };
    offer?: {
      free_shipping?: boolean;
    };
  };
};

export async function searchKabum(query: string): Promise<Offer[]> {
  try {
    const url = `https://servicespub.prod.api.aws.grupokabum.com.br/catalog/v2/products?query=${encodeURIComponent(
      query,
    )}&page_number=1&page_size=10&facet_filters=&sort=most_searched`;

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as { data?: KabumProduct[] };
    const items = payload.data ?? [];

    return items.flatMap((p) => {
      const title = p.attributes?.title;
      const price = p.attributes?.price_with_discount ?? p.attributes?.price;
      if (!p.id || !title || typeof price !== "number" || price <= 0) {
        return [];
      }

      const thumbnail =
        p.attributes?.photos?.g?.[0] ?? p.attributes?.photos?.m?.[0] ?? null;

      const offer: Offer = {
        id: `kabum_${p.id}`,
        source: "kabum" as const,
        title,
        price,
        originalPrice: p.attributes?.price ?? null,
        currency: "BRL" as const,
        freeShipping: Boolean(p.attributes?.offer?.free_shipping),
        seller: "KaBuM!",
        location: "Brasil",
        permalink: `https://www.kabum.com.br/produto/${p.id}`,
        thumbnail,
        updatedAt: new Date().toISOString(),
      };

      return [offer];
    });
  } catch {
    return [];
  }
}

type SerpApiShoppingItem = {
  product_id?: string;
  title?: string;
  extracted_price?: number;
  price?: string | number;
  source?: string;
  product_link?: string;
  link?: string;
  thumbnail?: string;
  delivery?: string;
};

export async function searchGoogleShopping(query: string): Promise<Offer[]> {
  const apiKey = env.SERPAPI_API_KEY || process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    return [];
  }

  try {
    const url = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(
      query,
    )}&gl=br&hl=pt&api_key=${apiKey}`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as {
      shopping_results?: SerpApiShoppingItem[];
    };
    const items = payload.shopping_results ?? [];

    return items.flatMap((item, index) => {
      const title = item.title;
      const price =
        typeof item.extracted_price === "number"
          ? item.extracted_price
          : typeof item.price === "number"
          ? item.price
          : null;

      if (!title || typeof price !== "number" || price <= 0) {
        return [];
      }

      const permalink =
        item.product_link ||
        item.link ||
        `https://www.google.com/search?q=${encodeURIComponent(title)}&tbm=shop`;

      const sourceName =
        item.source
          ?.replace(/\s*-\s*Retail$/i, "")
          .replace(/\s*-\s*Seller$/i, "")
          .trim() || "Google Shopping";

      const offer: Offer = {
        id: `google_${item.product_id || index}_${Date.now()}`,
        source: sourceName,
        title,
        price,
        originalPrice: null,
        currency: "BRL" as const,
        freeShipping: Boolean(item.delivery?.toLowerCase().includes("grátis")),
        seller: sourceName,
        location: "Brasil",
        permalink,
        thumbnail: item.thumbnail ?? null,
        updatedAt: new Date().toISOString(),
      };

      return [offer];
    });
  } catch {
    return [];
  }
}

export async function createSession(
  userId: string,
  prompt: string,
  interpretation: unknown,
  offers: unknown,
) {
  const [created] = await db
    .insert(chatSessionsTable)
    .values({
      userId,
      prompt,
      interpretation,
      offers,
    })
    .returning();
  return created;
}

export async function listSessions(userId: string) {
  return db
    .select()
    .from(chatSessionsTable)
    .where(eq(chatSessionsTable.userId, userId))
    .orderBy(desc(chatSessionsTable.createdAt));
}

export async function getSessionById(userId: string, id: string) {
  const [session] = await db
    .select()
    .from(chatSessionsTable)
    .where(and(eq(chatSessionsTable.userId, userId), eq(chatSessionsTable.id, id)));
  return session ?? null;
}

export async function deleteSession(userId: string, id: string) {
  await db
    .delete(chatSessionsTable)
    .where(and(eq(chatSessionsTable.userId, userId), eq(chatSessionsTable.id, id)));
}

export async function clearSessions(userId: string) {
  await db
    .delete(chatSessionsTable)
    .where(eq(chatSessionsTable.userId, userId));
}

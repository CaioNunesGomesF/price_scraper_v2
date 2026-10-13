import { env } from "../../config/env.js";
import { ServiceUnavailableError } from "../../errors/app-error.js";
import { getValidAccessToken } from "../integrations/mercado-livre/mercado-livre.service.js";
import { Offer } from "./search.zod.js";

type MercadoLivreSearchResponse = {
  results?: Array<{
    id?: string;
    title?: string;
    price?: number;
    original_price?: number | null;
    currency_id?: string;
    permalink?: string;
    thumbnail?: string;
    seller?: { nickname?: string };
    address?: { city_name?: string; state_name?: string };
    shipping?: { free_shipping?: boolean };
  }>;
};

type MercadoLivreErrorResponse = {
  error?: string;
  status?: number;
};

type MeliItem = {
  item_id?: string;
  title?: string;
  price?: number;
  currency_id?: string;
  permalink?: string;
  thumbnail?: string;
  shipping?: { free_shipping?: boolean };
  seller_id?: number;
  seller_address?: {
    city?: { name?: string };
    state?: { name?: string };
  };
};

export async function searchMercadoLivre(query: string): Promise<Offer[]> {
  const accessToken = await getValidAccessToken();
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
  };

  try {
    // 1. Descobrir o dominio e a categoria mais relevante para o termo buscado
    let categoryId = "MLB1055"; // Default Celulares e Smartphones
    try {
      const discRes = await fetch(
        `https://api.mercadolibre.com/sites/MLB/domain_discovery/search?q=${encodeURIComponent(query)}`,
        { headers, signal: AbortSignal.timeout(8_000) },
      );
      if (discRes.ok) {
        const disc = (await discRes.json()) as Array<{ category_id?: string }>;
        const first = disc[0];
        if (first?.category_id) {
          categoryId = first.category_id;
        }
      }
    } catch {
      // Ignora falha na descoberta de dominio e usa fallback
    }

    // 2. Buscar os produtos em destaque da categoria
    const highlightsRes = await fetch(
      `https://api.mercadolibre.com/highlights/MLB/category/${categoryId}`,
      { headers, signal: AbortSignal.timeout(8_000) },
    );

    if (!highlightsRes.ok) {
      throw new ServiceUnavailableError("Nao foi possivel obter destaques do Mercado Livre.");
    }

    const highlightsData = (await highlightsRes.json()) as {
      content?: Array<{ id: string; type: string }>;
    };

    const productIds = (highlightsData.content ?? [])
      .filter((c) => c.type === "PRODUCT" && Boolean(c.id))
      .slice(0, 10)
      .map((c) => c.id);

    if (productIds.length === 0) {
      return [];
    }

    // 3. A listagem de itens já traz os dados da oferta; evita uma chamada extra
    // ao endpoint de produto para cada resultado.
    const productFetches = productIds.map(async (pid) => {
      try {
        const itemsRes = await fetch(`https://api.mercadolibre.com/products/${pid}/items`, {
          headers,
          signal: AbortSignal.timeout(8_000),
        });
        if (!itemsRes.ok) return null;
        const itemsData = (await itemsRes.json()) as { results?: MeliItem[] };
        const bestItem = itemsData.results?.[0] ?? null;

        if (!bestItem || typeof bestItem.price !== "number") return null;
        const price = bestItem.price;

        // Algumas respostas não incluem título/foto/link no item; nesse caso,
        // consulta o produto somente como fallback, não em toda busca.
        let productDetails: { name?: string; permalink?: string; pictures?: Array<{ url?: string }> } | null = null;
        if (!bestItem.title || !bestItem.thumbnail || !bestItem.permalink) {
          try {
            const productRes = await fetch(`https://api.mercadolibre.com/products/${pid}`, {
              headers,
              signal: AbortSignal.timeout(8_000),
            });
            if (productRes.ok) productDetails = await productRes.json();
          } catch {
            // Mantém os campos disponíveis na resposta de itens.
          }
        }

        const title = bestItem.title || productDetails?.name || "Produto Mercado Livre";
        const location = [
          bestItem?.seller_address?.city?.name,
          bestItem?.seller_address?.state?.name,
        ]
          .filter(Boolean)
          .join(", ") || null;

        const permalink =
          bestItem?.permalink ||
          productDetails?.permalink ||
          `https://produto.mercadolivre.com.br/${bestItem?.item_id || pid}`;

        const thumbnail =
          (bestItem?.thumbnail || productDetails?.pictures?.[0]?.url)?.replace(
            "http://",
            "https://",
          ) || null;

        const offer: Offer = {
          id: bestItem?.item_id || pid,
          source: "mercado_livre" as const,
          title,
          price,
          originalPrice: null,
          currency: "BRL" as const,
          freeShipping: bestItem?.shipping?.free_shipping ?? false,
          seller: bestItem?.seller_id ? `Vendedor #${bestItem.seller_id}` : null,
          location,
          permalink,
          thumbnail,
          updatedAt: new Date().toISOString(),
        };

        return offer;
      } catch {
        return null;
      }
    });

    const settled = await Promise.all(productFetches);
    return settled.filter((item): item is Offer => item !== null);
  } catch (error) {
    if (error instanceof ServiceUnavailableError) throw error;
    throw new ServiceUnavailableError("O Mercado Livre nao respondeu a busca.");
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

import { ServiceUnavailableError } from "../../errors/app-error.js";

function decodeHtml(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/<[^>]+>/g, "").trim();
}

function metaValue(html: string, key: string) {
  const pattern = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  const reversed = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["'][^>]*>`, "i");
  return pattern.exec(html)?.[1] ?? reversed.exec(html)?.[1] ?? null;
}

function jsonLdProduct(html: string) {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of scripts) {
    try {
      const parsed = JSON.parse(match[1] ?? "") as Record<string, unknown> | Array<Record<string, unknown>>;
      const candidates = Array.isArray(parsed) ? parsed : [parsed, ...((parsed["@graph"] as Array<Record<string, unknown>> | undefined) ?? [])];
      const product = candidates.find((item) => String(item["@type"] ?? "").toLowerCase().includes("product"));
      if (product) {
        const offers = product.offers as Record<string, unknown> | undefined;
        return { name: typeof product.name === "string" ? product.name : null, brand: typeof product.brand === "string" ? product.brand : null, model: typeof product.model === "string" ? product.model : null, price: typeof offers?.price === "number" ? offers.price : typeof offers?.price === "string" ? Number(offers.price.replace(",", ".")) : null };
      }
    } catch {
      // Tenta os metadados básicos quando o JSON-LD da página é inválido.
    }
  }
  return null;
}

export async function importSource(url: string) {
  let response: Response;
  try {
    response = await fetch(url, { headers: { Accept: "text/html,application/xhtml+xml,application/pdf", "User-Agent": "Achado/1.0" }, signal: AbortSignal.timeout(10_000) });
  } catch {
    throw new ServiceUnavailableError("Não foi possível consultar esse link agora.");
  }
  if (!response.ok) throw new ServiceUnavailableError(`A fonte respondeu HTTP ${response.status}.`);
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/pdf") || url.toLowerCase().split("?")[0]?.endsWith(".pdf")) {
    const raw = Buffer.from(await response.arrayBuffer()).toString("latin1");
    const extracted = [...raw.matchAll(/\(([^()]{2,500})\)\s*Tj/g)].map((match) => match[1]!.replace(/\\([()\\])/g, "$1")).join(" ").replace(/\s+/g, " ").trim().slice(0, 12_000);
    return { url, tipo: "pdf", confirmado: Boolean(extracted), nome: decodeURIComponent(url.split("/").pop() ?? "Documento PDF").replace(/[-_]+/g, " "), especificacoes: {}, textoExtraido: extracted, precoBrl: null, recuperadoEm: new Date().toISOString(), aviso: extracted ? null : "PDF identificado, mas o texto não pôde ser extraído automaticamente." };
  }
  const html = await response.text();
  const product = jsonLdProduct(html);
  const title = product?.name ?? metaValue(html, "og:title") ?? decodeHtml(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "");
  const amount = product?.price ?? Number(metaValue(html, "product:price:amount")?.replace(",", "."));
  return { url, tipo: "pagina", confirmado: Boolean(title), nome: title || new URL(url).hostname, especificacoes: { ...(product?.brand ? { marca: product.brand } : {}), ...(product?.model ? { modelo: product.model } : {}) }, precoBrl: Number.isFinite(amount) && amount > 0 ? amount : null, recuperadoEm: new Date().toISOString(), aviso: null };
}

import { ConflictError } from "../../errors/app-error.js";
import * as repository from "./partner-stores.repository.js";
import type { CreatePartnerStoreDTO } from "./partner-stores.zod.js";

const searchSources = [
  { id: "mercado_livre", name: "Mercado Livre", domain: "mercadolivre.com.br", kind: "marketplace", description: "Busca de produtos publicados no Mercado Livre." },
  { id: "kabum", name: "KaBuM!", domain: "kabum.com.br", kind: "retailer", description: "Busca no catálogo da KaBuM!." },
  { id: "google_shopping", name: "Google Shopping", domain: "shopping.google.com", kind: "aggregator", description: "Agregador que pode trazer lojas como Amazon e Magalu; as lojas variam por produto." },
] as const;

export async function getDirectory() {
  const partnerStores = await repository.listApprovedStores();
  return { searchSources, partnerStores };
}

export async function submitStore(data: CreatePartnerStoreDTO) {
  const normalizedWebsite = new URL(data.websiteUrl).origin.toLowerCase();
  if (await repository.findByWebsite(normalizedWebsite)) {
    throw new ConflictError("Já existe um cadastro para este endereço de loja.");
  }
  return repository.createSubmission(data, normalizedWebsite);
}

export async function searchPartnerProducts(query: string) {
  const rows = await repository.searchApprovedProducts(query);
  return rows.filter(({ product }) => product.inStock).map(({ product, store }) => ({
    id: `partner_${product.id}`,
    source: store.name,
    title: product.title,
    price: product.priceCents / 100,
    originalPrice: null,
    currency: "BRL" as const,
    freeShipping: false,
    seller: store.name,
    location: [store.city, store.state].filter(Boolean).join(", ") || null,
    permalink: product.productUrl,
    thumbnail: product.imageUrl,
    updatedAt: product.updatedAt.toISOString(),
  }));
}

import { ConflictError } from "../../errors/app-error.js";
import * as repository from "./partner-stores.repository.js";
import type { CreatePartnerStoreDTO } from "./partner-stores.zod.js";
import type { Offer } from "../search/search.zod.js";

const searchSources = [
  { id: "mercado_livre", name: "Mercado Livre", domain: "mercadolivre.com.br", kind: "marketplace", description: "Busca de produtos publicados no Mercado Livre." },
  { id: "kabum", name: "KaBuM!", domain: "kabum.com.br", kind: "retailer", description: "Catálogo online da KaBuM!." },
  { id: "pichau", name: "Pichau Informática", domain: "pichau.com.br", kind: "retailer", description: "Catálogo de hardware e computadores gamer da Pichau." },
  { id: "terabyte", name: "Terabyte Shop", domain: "terabyteshop.com.br", kind: "retailer", description: "Catálogo de tecnologia e hardware da Terabyte." },
  { id: "google_shopping", name: "Google Shopping", domain: "shopping.google.com", kind: "aggregator", description: "Agregador de ofertas com Amazon, Magazine Luiza e grandes varejistas." },
] as const;

export async function getDirectory() {
  const partnerStores = await repository.listApprovedStores();
  return { searchSources, partnerStores };
}

export async function getCatalog() {
  return repository.listCatalogProducts();
}

export async function submitStore(data: CreatePartnerStoreDTO) {
  const normalizedWebsite = new URL(data.websiteUrl).origin.toLowerCase();
  if (await repository.findByWebsite(normalizedWebsite)) {
    throw new ConflictError("Já existe um cadastro para este endereço de loja.");
  }
  return repository.createSubmission(data, normalizedWebsite);
}

export async function searchPartnerProducts(query: string): Promise<Offer[]> {
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
    priority: store.priority,
  }));
}

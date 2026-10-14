import { and, asc, count, desc, eq, ilike, or } from "drizzle-orm";
import db from "../../config/db.js";
import { partnerProductsTable, partnerStoresTable } from "./partner-stores.schema.js";
import type { CreatePartnerStoreDTO } from "./partner-stores.zod.js";

export async function findByWebsite(websiteUrl: string) {
  return (await db.select({ id: partnerStoresTable.id }).from(partnerStoresTable).where(eq(partnerStoresTable.websiteUrl, websiteUrl)))[0];
}

export async function createSubmission(data: CreatePartnerStoreDTO, websiteUrl: string) {
  return db.transaction(async (transaction) => {
    const [store] = await transaction.insert(partnerStoresTable).values({
      name: data.name,
      websiteUrl,
      contactEmail: data.contactEmail,
      description: data.description || null,
      city: data.city || null,
      state: data.state || null,
      status: "approved",
    }).returning({ id: partnerStoresTable.id, status: partnerStoresTable.status });
    if (!store) throw new Error("Não foi possível salvar os dados da loja.");

    const products = await transaction.insert(partnerProductsTable).values(data.products.map((product) => ({
      storeId: store.id,
      title: product.title,
      productUrl: product.productUrl,
      imageUrl: product.imageUrl || null,
      priceCents: Math.round(product.price * 100),
      inStock: product.inStock,
      status: "approved" as const,
    }))).returning({ id: partnerProductsTable.id });

    return { storeId: store.id, status: store.status, productCount: products.length };
  });
}

export async function listApprovedStores() {
  return db.select({
    id: partnerStoresTable.id,
    name: partnerStoresTable.name,
    websiteUrl: partnerStoresTable.websiteUrl,
    description: partnerStoresTable.description,
    city: partnerStoresTable.city,
    state: partnerStoresTable.state,
    priority: partnerStoresTable.priority,
    status: partnerStoresTable.status,
    productCount: count(partnerProductsTable.id),
  }).from(partnerStoresTable)
    .leftJoin(partnerProductsTable, and(eq(partnerProductsTable.storeId, partnerStoresTable.id), eq(partnerProductsTable.status, "approved")))
    .where(or(eq(partnerStoresTable.status, "approved"), eq(partnerStoresTable.status, "pending")))
    .groupBy(partnerStoresTable.id)
    .orderBy(desc(partnerStoresTable.priority), asc(partnerStoresTable.name));
}

export async function listCatalogProducts(limit = 100) {
  const rows = await db.select({
    id: partnerProductsTable.id,
    storeId: partnerStoresTable.id,
    storeName: partnerStoresTable.name,
    storeWebsite: partnerStoresTable.websiteUrl,
    title: partnerProductsTable.title,
    productUrl: partnerProductsTable.productUrl,
    imageUrl: partnerProductsTable.imageUrl,
    priceCents: partnerProductsTable.priceCents,
    inStock: partnerProductsTable.inStock,
    createdAt: partnerProductsTable.createdAt,
  })
    .from(partnerProductsTable)
    .innerJoin(partnerStoresTable, eq(partnerProductsTable.storeId, partnerStoresTable.id))
    .where(eq(partnerStoresTable.status, "approved"))
    .orderBy(partnerProductsTable.priceCents)
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    price: row.priceCents / 100,
  }));
}

export async function searchApprovedProducts(query: string, limit = 30) {
  const terms = [...new Set(query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [])].slice(0, 6);
  if (!terms.length) return [];
  const titleConditions = terms.map((term) => ilike(partnerProductsTable.title, `%${term}%`));

  return db.select({ product: partnerProductsTable, store: partnerStoresTable })
    .from(partnerProductsTable)
    .innerJoin(partnerStoresTable, eq(partnerProductsTable.storeId, partnerStoresTable.id))
    .where(and(eq(partnerProductsTable.status, "approved"), eq(partnerStoresTable.status, "approved"), or(...titleConditions)))
    .orderBy(desc(partnerStoresTable.priority), asc(partnerProductsTable.priceCents))
    .limit(limit);
}

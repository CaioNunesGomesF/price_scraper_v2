import { boolean, index, integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export type StoreReviewStatus = "pending" | "approved" | "rejected";

export const partnerStoresTable = pgTable("partner_stores", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 160 }).notNull(),
  websiteUrl: varchar("website_url", { length: 500 }).notNull().unique(),
  contactEmail: varchar("contact_email", { length: 320 }).notNull(),
  description: text("description"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  priority: integer("priority").notNull().default(0),
  status: varchar("status", { length: 16 }).$type<StoreReviewStatus>().notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("partner_stores_status_idx").on(table.status)]);

export const partnerProductsTable = pgTable("partner_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").notNull().references(() => partnerStoresTable.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  productUrl: varchar("product_url", { length: 2_000 }).notNull(),
  imageUrl: varchar("image_url", { length: 2_000 }),
  priceCents: integer("price_cents").notNull(),
  inStock: boolean("in_stock").notNull().default(true),
  status: varchar("status", { length: 16 }).$type<StoreReviewStatus>().notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("partner_products_store_idx").on(table.storeId),
  index("partner_products_status_idx").on(table.status),
]);

export type PartnerStore = typeof partnerStoresTable.$inferSelect;
export type NewPartnerStore = typeof partnerStoresTable.$inferInsert;
export type PartnerProduct = typeof partnerProductsTable.$inferSelect;

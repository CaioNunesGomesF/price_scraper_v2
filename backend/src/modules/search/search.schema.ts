import { index, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const chatSessionsTable = pgTable("chat_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  prompt: text("prompt").notNull(),
  interpretation: jsonb("interpretation").notNull(),
  offers: jsonb("offers").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const searchCacheTable = pgTable("search_cache", {
  id: uuid("id").primaryKey().defaultRandom(),
  queryKey: varchar("query_key", { length: 500 }).notNull().unique(),
  prompt: text("prompt").notNull(),
  interpretation: jsonb("interpretation").notNull(),
  offers: jsonb("offers").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("search_cache_expires_idx").on(table.expiresAt),
]);

import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export type EquipmentCategorySlug =
  | "monitor"
  | "tv"
  | "projector"
  | "computer"
  | "notebook"
  | "server"
  | "smartphone"
  | "tablet"
  | "console"
  | "peripheral"
  | "network"
  | "component";

export type AnalysisStatus = "needs_questions" | "processing" | "completed" | "partial" | "failed";
export type DataOrigin = "informed" | "known" | "estimated" | "not_informed";
export type Confidence = "alta" | "media" | "baixa";
export type CompatibilityStatus = "compativel" | "incompativel" | "parcial" | "indeterminado";
export type SourceType = "official" | "retailer" | "marketplace" | "aggregator" | "knowledge_base" | "manual";
export type TrustLevel = "high" | "medium" | "low";

export type JsonObject = Record<string, unknown>;

export type AnalysisContext = {
  objective?: string;
  budgetBrl?: number | null;
  existingEquipment?: string | null;
  technicalLevel?: "iniciante" | "intermediario" | "avancado";
  region: "BR";
};

export const equipmentCategoriesTable = pgTable("equipment_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 40 }).$type<EquipmentCategorySlug>().notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  criteria: jsonb("criteria").$type<JsonObject>().notNull(),
  version: varchar("version", { length: 32 }).notNull().default("1"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("equipment_categories_slug_idx").on(table.slug),
]);

export const equipmentModelsTable = pgTable("equipment_models", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id").notNull().references(() => equipmentCategoriesTable.id, { onDelete: "restrict" }),
  brand: varchar("brand", { length: 160 }),
  canonicalName: varchar("canonical_name", { length: 300 }).notNull(),
  normalizedKey: varchar("normalized_key", { length: 360 }).notNull(),
  identifiers: jsonb("identifiers").$type<JsonObject>().notNull().default({}),
  confirmed: boolean("confirmed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("equipment_models_category_key_idx").on(table.categoryId, table.normalizedKey),
  index("equipment_models_brand_idx").on(table.brand),
]);

export const dataSourcesTable = pgTable("equipment_data_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: varchar("type", { length: 24 }).$type<SourceType>().notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  baseUrl: varchar("base_url", { length: 2_000 }),
  trustLevel: varchar("trust_level", { length: 12 }).$type<TrustLevel>().notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("equipment_data_sources_type_idx").on(table.type),
  index("equipment_data_sources_enabled_idx").on(table.enabled),
]);

export const equipmentSpecificationsTable = pgTable("equipment_specifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  equipmentModelId: uuid("equipment_model_id").notNull().references(() => equipmentModelsTable.id, { onDelete: "cascade" }),
  key: varchar("key", { length: 120 }).notNull(),
  value: jsonb("value").$type<unknown>().notNull(),
  unit: varchar("unit", { length: 32 }),
  origin: varchar("origin", { length: 16 }).$type<DataOrigin>().notNull(),
  confidence: varchar("confidence", { length: 8 }).$type<Confidence>(),
  sourceId: uuid("source_id").references(() => dataSourcesTable.id, { onDelete: "set null" }),
  sourceUrl: varchar("source_url", { length: 2_000 }),
  observedAt: timestamp("observed_at", { withTimezone: true }),
  normalizerVersion: varchar("normalizer_version", { length: 32 }).notNull().default("1"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("equipment_specifications_model_key_idx").on(table.equipmentModelId, table.key),
  index("equipment_specifications_source_idx").on(table.sourceId),
]);

export const analysisSessionsTable = pgTable("equipment_analysis_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id"),
  anonymousKeyHash: varchar("anonymous_key_hash", { length: 128 }),
  categoryId: uuid("category_id").references(() => equipmentCategoriesTable.id, { onDelete: "set null" }),
  rawInput: text("raw_input").notNull(),
  context: jsonb("context").$type<AnalysisContext>().notNull(),
  normalizedInput: jsonb("normalized_input").$type<JsonObject>().notNull().default({}),
  clarificationQuestions: jsonb("clarification_questions").$type<unknown[]>().notNull().default([]),
  status: varchar("status", { length: 24 }).$type<AnalysisStatus>().notNull().default("needs_questions"),
  summary: text("summary"),
  result: jsonb("result").$type<JsonObject>(),
  modelName: varchar("model_name", { length: 160 }),
  fallbackModelName: varchar("fallback_model_name", { length: 160 }),
  promptVersion: varchar("prompt_version", { length: 40 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check("equipment_analysis_owner_check", sql`${table.userId} IS NOT NULL OR ${table.anonymousKeyHash} IS NOT NULL`),
  index("equipment_analysis_user_created_idx").on(table.userId, table.createdAt),
  index("equipment_analysis_anonymous_created_idx").on(table.anonymousKeyHash, table.createdAt),
  index("equipment_analysis_status_idx").on(table.status),
]);

export const analysisItemsTable = pgTable("equipment_analysis_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  analysisId: uuid("analysis_id").notNull().references(() => analysisSessionsTable.id, { onDelete: "cascade" }),
  equipmentModelId: uuid("equipment_model_id").references(() => equipmentModelsTable.id, { onDelete: "set null" }),
  position: integer("position").notNull(),
  rawName: varchar("raw_name", { length: 500 }).notNull(),
  normalizedName: varchar("normalized_name", { length: 500 }),
  confirmed: boolean("confirmed").notNull().default(false),
  specifications: jsonb("specifications").$type<JsonObject>().notNull().default({}),
  estimates: jsonb("estimates").$type<unknown[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("equipment_analysis_items_position_idx").on(table.analysisId, table.position),
  index("equipment_analysis_items_model_idx").on(table.equipmentModelId),
]);

export const analysisSourcesTable = pgTable("equipment_analysis_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  analysisId: uuid("analysis_id").notNull().references(() => analysisSessionsTable.id, { onDelete: "cascade" }),
  sourceId: uuid("source_id").references(() => dataSourcesTable.id, { onDelete: "set null" }),
  sourceType: varchar("source_type", { length: 24 }).$type<SourceType>().notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  url: varchar("url", { length: 2_000 }).notNull(),
  excerpt: text("excerpt"),
  contentHash: varchar("content_hash", { length: 128 }),
  retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull(),
  trustLevel: varchar("trust_level", { length: 12 }).$type<TrustLevel>().notNull(),
}, (table) => [
  index("equipment_analysis_sources_analysis_idx").on(table.analysisId),
  index("equipment_analysis_sources_retrieved_idx").on(table.retrievedAt),
]);

export const priceObservationsTable = pgTable("equipment_price_observations", {
  id: uuid("id").primaryKey().defaultRandom(),
  analysisId: uuid("analysis_id").references(() => analysisSessionsTable.id, { onDelete: "set null" }),
  analysisItemId: uuid("analysis_item_id").references(() => analysisItemsTable.id, { onDelete: "set null" }),
  equipmentModelId: uuid("equipment_model_id").references(() => equipmentModelsTable.id, { onDelete: "set null" }),
  sourceId: uuid("source_id").references(() => dataSourcesTable.id, { onDelete: "set null" }),
  sourceOfferId: varchar("source_offer_id", { length: 180 }),
  title: varchar("title", { length: 500 }).notNull(),
  priceCents: integer("price_cents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("BRL"),
  shippingCents: integer("shipping_cents"),
  availability: varchar("availability", { length: 24 }).notNull().default("unknown"),
  seller: varchar("seller", { length: 240 }),
  url: varchar("url", { length: 2_000 }).notNull(),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  rawData: jsonb("raw_data").$type<JsonObject>().notNull().default({}),
}, (table) => [
  check("equipment_price_currency_check", sql`${table.currency} = 'BRL'`),
  check("equipment_price_non_negative_check", sql`${table.priceCents} >= 0`),
  index("equipment_price_item_observed_idx").on(table.analysisItemId, table.observedAt),
  index("equipment_price_model_observed_idx").on(table.equipmentModelId, table.observedAt),
  index("equipment_price_expires_idx").on(table.expiresAt),
]);

export const compatibilityChecksTable = pgTable("equipment_compatibility_checks", {
  id: uuid("id").primaryKey().defaultRandom(),
  analysisId: uuid("analysis_id").notNull().references(() => analysisSessionsTable.id, { onDelete: "cascade" }),
  itemAId: uuid("item_a_id").references(() => analysisItemsTable.id, { onDelete: "set null" }),
  itemBId: uuid("item_b_id").references(() => analysisItemsTable.id, { onDelete: "set null" }),
  itemA: varchar("item_a", { length: 300 }).notNull(),
  itemB: varchar("item_b", { length: 300 }).notNull(),
  ruleUsed: text("rule_used").notNull(),
  supportingData: jsonb("supporting_data").$type<unknown[]>().notNull().default([]),
  missingData: jsonb("missing_data").$type<string[]>().notNull().default([]),
  result: varchar("result", { length: 20 }).$type<CompatibilityStatus>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("equipment_compatibility_analysis_idx").on(table.analysisId),
  index("equipment_compatibility_result_idx").on(table.result),
]);

export const comparisonSessionsTable = pgTable("equipment_comparisons", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  analysisId: uuid("analysis_id").references(() => analysisSessionsTable.id, { onDelete: "set null" }),
  selectedItems: jsonb("selected_items").$type<string[]>().notNull(),
  criteria: jsonb("criteria").$type<string[]>().notNull(),
  result: jsonb("result").$type<JsonObject>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("equipment_comparisons_user_created_idx").on(table.userId, table.createdAt),
  index("equipment_comparisons_analysis_idx").on(table.analysisId),
]);

export const anonymousAnalysisUsageTable = pgTable("anonymous_analysis_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  subjectHash: varchar("subject_hash", { length: 128 }).notNull(),
  usageDate: date("usage_date").notNull(),
  analysisCount: integer("analysis_count").notNull().default(0),
  dailyLimit: integer("daily_limit").notNull().default(3),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("anonymous_analysis_usage_subject_date_idx").on(table.subjectHash, table.usageDate),
  check("anonymous_analysis_usage_count_check", sql`${table.analysisCount} >= 0`),
  check("anonymous_analysis_usage_limit_check", sql`${table.dailyLimit} > 0`),
]);

export const priceAlertsTable = pgTable("equipment_price_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  analysisId: uuid("analysis_id").references(() => analysisSessionsTable.id, { onDelete: "cascade" }),
  analysisItemId: uuid("analysis_item_id").references(() => analysisItemsTable.id, { onDelete: "set null" }),
  title: varchar("title", { length: 500 }).notNull(),
  url: varchar("url", { length: 2_000 }),
  targetPriceCents: integer("target_price_cents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("BRL"),
  active: boolean("active").notNull().default(true),
  lastNotifiedAt: timestamp("last_notified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check("equipment_price_alert_currency_check", sql`${table.currency} = 'BRL'`),
  check("equipment_price_alert_target_check", sql`${table.targetPriceCents} > 0`),
  index("equipment_price_alert_user_idx").on(table.userId, table.active, table.createdAt),
]);


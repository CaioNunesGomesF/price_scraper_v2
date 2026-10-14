import { integer, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const userPreferencesTable = pgTable("user_preferences", {
  userId: uuid("user_id").primaryKey(),
  objective: text("objective"),
  budgetCents: integer("budget_cents"),
  existingEquipment: text("existing_equipment"),
  avoidedBrands: jsonb("avoided_brands").$type<string[]>().notNull().default([]),
  technicalLevel: varchar("technical_level", { length: 20 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

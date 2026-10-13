import { jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const mercadoLivreCredentialsTable = pgTable("mercado_livre_credentials", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: varchar("provider", { length: 40 }).notNull().unique(),
  accessTokenEncrypted: text("access_token_encrypted").notNull(),
  refreshTokenEncrypted: text("refresh_token_encrypted").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const mercadoLivreWebhookEventsTable = pgTable("mercado_livre_webhook_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventKey: varchar("event_key", { length: 64 }).notNull().unique(),
  topic: varchar("topic", { length: 80 }).notNull(),
  resource: text("resource").notNull(),
  payload: jsonb("payload").notNull(),
  receivedAt: timestamp("received_at").defaultNow().notNull(),
});

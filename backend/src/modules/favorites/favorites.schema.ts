import { jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
export const favoritesTable = pgTable("favorites", { id: uuid("id").primaryKey().defaultRandom(), userId: uuid("user_id").notNull(), offerId: varchar("offer_id", { length: 80 }).notNull(), offer: jsonb("offer").notNull(), createdAt: timestamp("created_at").defaultNow().notNull() });

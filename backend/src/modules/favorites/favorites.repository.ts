import { and, desc, eq } from "drizzle-orm"; import db from "../../config/db.js"; import { favoritesTable } from "./favorites.schema.js";
export const list = async (userId: string) => db.select().from(favoritesTable).where(eq(favoritesTable.userId, userId)).orderBy(desc(favoritesTable.createdAt));
export const findByOfferId = async (userId: string, offerId: string) => (await db.select().from(favoritesTable).where(and(eq(favoritesTable.userId, userId), eq(favoritesTable.offerId, offerId))))[0];
export const add = async (userId: string, offerId: string, offer: Record<string, unknown>) => (await db.insert(favoritesTable).values({ userId, offerId, offer }).returning())[0];
export const remove = async (userId: string, id: string) => db.delete(favoritesTable).where(and(eq(favoritesTable.userId, userId), eq(favoritesTable.id, id)));

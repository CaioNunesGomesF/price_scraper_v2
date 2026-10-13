import { eq } from "drizzle-orm";
import db from "../../config/db.js";
import { itemsTable, NewItem } from "./items.schema.js";

export async function createItem(data: NewItem) {
  const [result] = await db.insert(itemsTable).values(data).returning();
  return result;
}

export async function getItemById(id: string) {
  const [result] = await db.select().from(itemsTable).where(eq(itemsTable.id, id));
  return result;
}

export async function getItemByCode(code: string) {
  const [result] = await db.select().from(itemsTable).where(eq(itemsTable.code, code));
  return result;
}

import { and, eq, gt } from "drizzle-orm";
import db from "../../config/db.js";
import { sessionsTable, usersTable } from "./auth.schema.js";
export const findUserByEmail = async (email: string) => (await db.select().from(usersTable).where(eq(usersTable.email, email)))[0];
export const createUser = async (email: string, passwordHash: string) => (await db.insert(usersTable).values({ email, passwordHash }).returning())[0];
export const createSession = async (userId: string, tokenHash: string, expiresAt: Date) => db.insert(sessionsTable).values({ userId, tokenHash, expiresAt });
export const findActiveSession = async (tokenHash: string) => (await db.select({ userId: sessionsTable.userId, email: usersTable.email }).from(sessionsTable).innerJoin(usersTable, eq(usersTable.id, sessionsTable.userId)).where(and(eq(sessionsTable.tokenHash, tokenHash), gt(sessionsTable.expiresAt, new Date()))))[0];
export const deleteSession = async (tokenHash: string) => db.delete(sessionsTable).where(eq(sessionsTable.tokenHash, tokenHash));

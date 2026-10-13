import { eq } from "drizzle-orm";
import db from "../../../config/db.js";
import { mercadoLivreCredentialsTable, mercadoLivreWebhookEventsTable } from "./mercado-livre.schema.js";

export async function saveTokens(data: {
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string;
  expiresAt: Date;
}) {
  const [result] = await db
    .insert(mercadoLivreCredentialsTable)
    .values({ provider: "mercado_livre", ...data })
    .onConflictDoUpdate({
      target: mercadoLivreCredentialsTable.provider,
      set: { ...data, updatedAt: new Date() },
    })
    .returning();

  return result;
}

export async function getTokens() {
  const [result] = await db
    .select()
    .from(mercadoLivreCredentialsTable)
    .where(eq(mercadoLivreCredentialsTable.provider, "mercado_livre"));
  return result;
}

export async function enqueueNotification(data: {
  eventKey: string;
  topic: string;
  resource: string;
  payload: Record<string, unknown>;
}) {
  await db
    .insert(mercadoLivreWebhookEventsTable)
    .values(data)
    .onConflictDoNothing({ target: mercadoLivreWebhookEventsTable.eventKey });
}

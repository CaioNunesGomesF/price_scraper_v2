import { and, desc, eq, or } from "drizzle-orm";
import db from "../../config/db.js";
import {
  analysisItemsTable,
  analysisSessionsTable,
  anonymousAnalysisUsageTable,
  compatibilityChecksTable,
  dataSourcesTable,
  priceObservationsTable,
  priceAlertsTable,
  equipmentCategoriesTable,
} from "./equipment-analysis.schema.js";
import type { AnalysisContextDTO, AnalysisOutputDTO } from "./equipment-analysis.zod.js";
import type { EquipmentCategorySlug } from "./equipment-analysis.schema.js";

export async function findCategory(slug: EquipmentCategorySlug) {
  const [category] = await db.select().from(equipmentCategoriesTable).where(eq(equipmentCategoriesTable.slug, slug));
  return category ?? null;
}

export async function createAnalysis(input: {
  userId?: string;
  anonymousKeyHash?: string;
  categoryId?: string;
  rawInput: string;
  context: AnalysisContextDTO;
  normalizedInput?: Record<string, unknown>;
  questions: unknown[];
  items: Array<{ rawName: string; confirmed: boolean }>;
}) {
  return db.transaction(async (tx) => {
    const [session] = await tx.insert(analysisSessionsTable).values({
      userId: input.userId,
      anonymousKeyHash: input.anonymousKeyHash,
      categoryId: input.categoryId,
      rawInput: input.rawInput,
      context: input.context,
      clarificationQuestions: input.questions,
      normalizedInput: input.normalizedInput ?? {},
      status: input.questions.length > 0 ? "needs_questions" : "processing",
    }).returning();

    if (!session) throw new Error("Nao foi possivel criar a analise.");
    await tx.insert(analysisItemsTable).values(input.items.map((item, position) => ({
      analysisId: session.id,
      position,
      rawName: item.rawName,
      confirmed: item.confirmed,
    })));
    return session;
  });
}

function ownerWhere(id: string, userId?: string, anonymousKeyHash?: string) {
  if (userId) return and(eq(analysisSessionsTable.id, id), eq(analysisSessionsTable.userId, userId));
  return and(eq(analysisSessionsTable.id, id), eq(analysisSessionsTable.anonymousKeyHash, anonymousKeyHash ?? ""));
}

export async function findOwnedAnalysis(id: string, userId?: string, anonymousKeyHash?: string) {
  const [session] = await db.select().from(analysisSessionsTable).where(ownerWhere(id, userId, anonymousKeyHash));
  if (!session) return null;
  const items = await db.select().from(analysisItemsTable).where(eq(analysisItemsTable.analysisId, id)).orderBy(analysisItemsTable.position);
  const compatibility = await db.select().from(compatibilityChecksTable).where(eq(compatibilityChecksTable.analysisId, id));
  return { session, items, compatibility };
}

export async function listOwnedAnalyses(userId?: string, anonymousKeyHash?: string) {
  const condition = userId
    ? eq(analysisSessionsTable.userId, userId)
    : eq(analysisSessionsTable.anonymousKeyHash, anonymousKeyHash ?? "");
  return db.select().from(analysisSessionsTable).where(condition).orderBy(desc(analysisSessionsTable.createdAt)).limit(50);
}

export async function updateContext(id: string, context: AnalysisContextDTO, questions: unknown[]) {
  const [updated] = await db.update(analysisSessionsTable)
    .set({ context, clarificationQuestions: questions, updatedAt: new Date() })
    .where(eq(analysisSessionsTable.id, id))
    .returning();
  return updated ?? null;
}

export async function saveResult(id: string, output: AnalysisOutputDTO, modelName: string, fallbackModelName: string | null) {
  await db.transaction(async (tx) => {
    await tx.delete(compatibilityChecksTable).where(eq(compatibilityChecksTable.analysisId, id));
    const items = await tx.select().from(analysisItemsTable).where(eq(analysisItemsTable.analysisId, id)).orderBy(analysisItemsTable.position);
    for (const [position, item] of output.equipamentos.entries()) {
      const row = items[position];
      if (!row) continue;
      await tx.update(analysisItemsTable).set({
        normalizedName: item.nome,
        specifications: item.specs_informadas,
        estimates: item.estimativas,
      }).where(eq(analysisItemsTable.id, row.id));
    }
    if (output.compatibilidade.length > 0) {
      await tx.insert(compatibilityChecksTable).values(output.compatibilidade.map((check) => ({
        analysisId: id,
        itemA: check.item_a,
        itemB: check.item_b,
        ruleUsed: check.regra_usada,
        supportingData: check.dados_apoio,
        missingData: check.dados_faltantes,
        result: check.resultado,
      })));
    }
    await tx.update(analysisSessionsTable).set({
      status: "completed",
      summary: output.recomendacao.motivo,
      result: output,
      modelName,
      fallbackModelName,
      promptVersion: "universal-v1",
      updatedAt: new Date(),
    }).where(eq(analysisSessionsTable.id, id));
  });
}

export async function markProcessing(id: string) {
  await db.update(analysisSessionsTable).set({ status: "processing", updatedAt: new Date() }).where(eq(analysisSessionsTable.id, id));
}

export async function markFailed(id: string, message: string) {
  await db.update(analysisSessionsTable).set({ status: "failed", summary: message, updatedAt: new Date() }).where(eq(analysisSessionsTable.id, id));
}

export async function deleteOwnedAnalysis(id: string, userId?: string, anonymousKeyHash?: string) {
  await db.delete(analysisSessionsTable).where(ownerWhere(id, userId, anonymousKeyHash));
}

export async function savePriceObservations(analysisId: string, analysisItemId: string, offers: Array<{ id: string; title: string; price: number; source: string; seller: string | null; permalink: string; freeShipping: boolean; currency: "BRL"; updatedAt: string }>) {
  if (offers.length === 0) return;
  await db.transaction(async (tx) => {
    for (const offer of offers) {
      const sourceType = offer.source.toLocaleLowerCase("pt-BR").includes("google") ? "aggregator" : offer.source.toLocaleLowerCase("pt-BR").includes("mercado") ? "marketplace" : "retailer";
      const [source] = await tx.insert(dataSourcesTable).values({
        type: sourceType,
        name: offer.source,
        baseUrl: new URL(offer.permalink).origin,
        trustLevel: sourceType === "retailer" ? "medium" : "low",
      }).returning();
      const observedAt = new Date(offer.updatedAt);
      await tx.insert(priceObservationsTable).values({
        analysisId,
        analysisItemId,
        sourceId: source?.id,
        sourceOfferId: offer.id,
        title: offer.title,
        priceCents: Math.round(offer.price * 100),
        currency: "BRL",
        shippingCents: offer.freeShipping ? 0 : null,
        availability: "available",
        seller: offer.seller,
        url: offer.permalink,
        observedAt,
        expiresAt: new Date(observedAt.getTime() + 6 * 60 * 60 * 1000),
        rawData: { source: offer.source, freeShipping: offer.freeShipping },
      });
    }
  });
}

export async function listPriceObservations(analysisId: string) {
  return db.select().from(priceObservationsTable).where(eq(priceObservationsTable.analysisId, analysisId)).orderBy(desc(priceObservationsTable.observedAt));
}

export async function createPriceAlert(input: { userId: string; analysisId?: string; analysisItemId?: string; title: string; url?: string; targetPriceCents: number }) {
  const [created] = await db.insert(priceAlertsTable).values({ ...input, currency: "BRL" }).returning();
  return created;
}

export async function listPriceAlerts(userId: string) {
  return db.select().from(priceAlertsTable).where(eq(priceAlertsTable.userId, userId)).orderBy(desc(priceAlertsTable.createdAt));
}

export async function updatePriceAlert(userId: string, id: string, active: boolean) {
  const [updated] = await db.update(priceAlertsTable).set({ active, updatedAt: new Date() }).where(and(eq(priceAlertsTable.userId, userId), eq(priceAlertsTable.id, id))).returning();
  return updated ?? null;
}

export async function triggerPriceAlerts(analysisId: string, offers: Array<{ price: number; itemId: string }>) {
  const alerts = await db.select().from(priceAlertsTable).where(and(eq(priceAlertsTable.analysisId, analysisId), eq(priceAlertsTable.active, true)));
  const triggered: string[] = [];
  for (const alert of alerts) {
    const hit = offers.some((offer) => (!alert.analysisItemId || alert.analysisItemId === offer.itemId) && Math.round(offer.price * 100) <= alert.targetPriceCents);
    if (!hit) continue;
    await db.update(priceAlertsTable).set({ lastNotifiedAt: new Date(), updatedAt: new Date() }).where(eq(priceAlertsTable.id, alert.id));
    triggered.push(alert.id);
  }
  return triggered;
}

export async function consumeAnonymousQuota(subjectHash: string, dailyLimit = 3) {
  const today = new Date().toISOString().slice(0, 10);
  const [existing] = await db.select().from(anonymousAnalysisUsageTable).where(and(
    eq(anonymousAnalysisUsageTable.subjectHash, subjectHash),
    eq(anonymousAnalysisUsageTable.usageDate, today),
  ));
  if (existing && existing.analysisCount >= existing.dailyLimit) return { allowed: false, used: existing.analysisCount, limit: existing.dailyLimit };
  if (existing) {
    const [updated] = await db.update(anonymousAnalysisUsageTable).set({ analysisCount: existing.analysisCount + 1, updatedAt: new Date() }).where(eq(anonymousAnalysisUsageTable.id, existing.id)).returning();
    return { allowed: true, used: updated?.analysisCount ?? existing.analysisCount + 1, limit: existing.dailyLimit };
  }
  const [created] = await db.insert(anonymousAnalysisUsageTable).values({ subjectHash, usageDate: today, analysisCount: 1, dailyLimit }).returning();
  return { allowed: true, used: created?.analysisCount ?? 1, limit: dailyLimit };
}

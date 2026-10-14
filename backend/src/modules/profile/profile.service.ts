import { eq } from "drizzle-orm";
import { UnauthorizedError } from "../../errors/app-error.js";
import db from "../../config/db.js";
import { authenticate } from "../auth/auth.service.js";
import { userPreferencesTable } from "./profile.schema.js";
import type { ProfilePreferencesDTO } from "./profile.zod.js";

export async function get(authorization?: string) {
  const user = await authenticate(authorization);
  const [preferences] = await db.select().from(userPreferencesTable).where(eq(userPreferencesTable.userId, user.userId));
  return { email: user.email, preferences: preferences ? { objective: preferences.objective, budgetBrl: preferences.budgetCents === null ? null : preferences.budgetCents / 100, existingEquipment: preferences.existingEquipment, avoidedBrands: preferences.avoidedBrands, technicalLevel: preferences.technicalLevel } : null };
}

export async function update(data: ProfilePreferencesDTO, authorization?: string) {
  if (!authorization) throw new UnauthorizedError("Faça login para salvar suas preferências.");
  const user = await authenticate(authorization);
  const values = {
    userId: user.userId,
    objective: data.objective ?? null,
    budgetCents: data.budgetBrl === undefined || data.budgetBrl === null ? null : Math.round(data.budgetBrl * 100),
    existingEquipment: data.existingEquipment ?? null,
    avoidedBrands: data.avoidedBrands ?? [],
    technicalLevel: data.technicalLevel ?? null,
    updatedAt: new Date(),
  };
  const [saved] = await db.insert(userPreferencesTable).values(values).onConflictDoUpdate({ target: userPreferencesTable.userId, set: values }).returning();
  return saved ? { objective: saved.objective, budgetBrl: saved.budgetCents === null ? null : saved.budgetCents / 100, existingEquipment: saved.existingEquipment, avoidedBrands: saved.avoidedBrands, technicalLevel: saved.technicalLevel } : null;
}

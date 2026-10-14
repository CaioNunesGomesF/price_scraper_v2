import { z } from "zod";

export const profilePreferencesSchema = z.object({
  objective: z.string().trim().max(240).nullable().optional(),
  budgetBrl: z.number().finite().nonnegative().max(200_000_000).nullable().optional(),
  existingEquipment: z.string().trim().max(2_000).nullable().optional(),
  avoidedBrands: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  technicalLevel: z.enum(["iniciante", "intermediario", "avancado"]).nullable().optional(),
});
export type ProfilePreferencesDTO = z.infer<typeof profilePreferencesSchema>;

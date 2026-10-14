import { request } from "../../shared/api";
import type { AnalyzerPrice, AnalyzerSession } from "./analyzer.types";

export type ImportedSource = { url: string; tipo: "pagina" | "pdf"; confirmado: boolean; nome: string; especificacoes: Record<string, unknown>; textoExtraido?: string; precoBrl: number | null; recuperadoEm: string; aviso: string | null };
export type PriceAlert = { id: string; title: string; url: string | null; targetPriceBrl: number; currency: string; active: boolean; createdAt: string; lastNotifiedAt: string | null };

export function importSource(url: string, token?: string) {
  return request<ImportedSource>("/api/analyzer/sources/import", { method: "POST", body: JSON.stringify({ url }) }, token);
}

export function createPriceAlert(input: { analysisId?: string; analysisItemId?: string; title: string; url?: string; targetPriceBrl: number }, token?: string) {
  return request<PriceAlert>("/api/analyzer/alerts", { method: "POST", body: JSON.stringify(input) }, token);
}

export function listPriceAlerts(token: string) {
  return request<PriceAlert[]>("/api/analyzer/alerts", {}, token);
}

export function updatePriceAlert(id: string, active: boolean, token: string) {
  return request<{ id: string; active: boolean }>(`/api/analyzer/alerts/${id}`, { method: "PATCH", body: JSON.stringify({ active }) }, token);
}

export type UserPreferences = { objective: string | null; budgetBrl: number | null; existingEquipment: string | null; avoidedBrands: string[]; technicalLevel: "iniciante" | "intermediario" | "avancado" | null };
export function getProfile(token: string) {
  return request<{ email: string; preferences: UserPreferences | null }>("/api/profile", {}, token);
}
export function saveProfile(preferences: UserPreferences, token: string) {
  return request<UserPreferences>("/api/profile", { method: "PATCH", body: JSON.stringify(preferences) }, token);
}

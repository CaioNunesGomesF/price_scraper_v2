import { getAnonymousKey, request } from "../../shared/api";
import type { AnalyzerPrice, AnalyzerSession } from "./analyzer.types";

const headers = () => ({ "X-Anonymous-Key": getAnonymousKey() });

export function createAnalysis(input: { input: string; categoria?: string; equipamentos?: Array<{ nome: string; origem: "manual" | "busca"; confirmado: boolean }>; contexto: { objective?: string; budgetBrl?: number | null; existingEquipment?: string | null; region: "BR" } }, token?: string) {
  return request<AnalyzerSession>("/api/analyzer/analyses", { method: "POST", headers: headers(), body: JSON.stringify(input) }, token);
}

export function answerAnalysis(id: string, answers: Array<{ questionId: string; answer: string }>, token?: string) {
  return request<AnalyzerSession>(`/api/analyzer/analyses/${id}/answers`, { method: "POST", headers: headers(), body: JSON.stringify({ answers }) }, token);
}

export function runAnalysis(id: string, token?: string) {
  return request<AnalyzerSession>(`/api/analyzer/analyses/${id}/run`, { method: "POST", headers: headers() }, token);
}

export function listAnalyses(token?: string) {
  return request<Array<{ id: string; input: string; status: string; summary: string | null; createdAt: string; updatedAt: string }>>("/api/analyzer/analyses", { headers: headers() }, token);
}

export function refreshPrices(id: string, token?: string) {
  return request<{ analysis: AnalyzerSession; atualizados: Array<{ itemId: string; item: string; quantidade: number }>; precos: AnalyzerPrice[]; alertasAtingidos: string[] }>(`/api/analyzer/analyses/${id}/prices`, { method: "POST", headers: headers() }, token);
}

import { Request, Response } from "express";
import * as service from "./equipment-analysis.service.js";
import { analysisAnswersSchema, createAnalysisInputSchema } from "./equipment-analysis.zod.js";
import { createPriceAlertSchema, importSourceSchema, updatePriceAlertSchema } from "./equipment-analysis.extra.zod.js";
import { importSource } from "./source-import.service.js";

function anonymousKey(req: Request) {
  return req.header("x-anonymous-key") || `${req.ip}:${req.header("user-agent") || "unknown"}`;
}

export async function create(req: Request, res: Response) {
  const data = createAnalysisInputSchema.parse(req.body);
  const result = await service.create(data, req.header("authorization"), anonymousKey(req));
  return res.sendSuccess(result, "Análise criada.", 201);
}

export async function answer(req: Request, res: Response) {
  const data = analysisAnswersSchema.parse(req.body);
  const result = await service.answer(String(req.params.id), data.answers, req.header("authorization"), anonymousKey(req));
  return res.sendSuccess(result, "Contexto atualizado.");
}

export async function run(req: Request, res: Response) {
  const result = await service.run(String(req.params.id), req.header("authorization"), anonymousKey(req));
  return res.sendSuccess(result, "Análise concluída.");
}

export async function get(req: Request, res: Response) {
  return res.sendSuccess(await service.get(String(req.params.id), req.header("authorization"), anonymousKey(req)), "Análise recuperada.");
}

export async function list(req: Request, res: Response) {
  return res.sendSuccess(await service.list(req.header("authorization"), anonymousKey(req)), "Histórico recuperado.");
}

export async function remove(req: Request, res: Response) {
  await service.remove(String(req.params.id), req.header("authorization"), anonymousKey(req));
  return res.sendSuccess(null, "Análise removida.");
}

export async function refreshPrices(req: Request, res: Response) {
  const result = await service.refreshPrices(String(req.params.id), req.header("authorization"), anonymousKey(req));
  return res.sendSuccess(result, "Preços atualizados com data e fonte.");
}

export async function createAlert(req: Request, res: Response) {
  return res.sendSuccess(await service.createAlert(createPriceAlertSchema.parse(req.body), req.header("authorization")), "Alerta de preço criado.", 201);
}

export async function listAlerts(req: Request, res: Response) {
  return res.sendSuccess(await service.listAlerts(req.header("authorization")), "Alertas recuperados.");
}

export async function updateAlert(req: Request, res: Response) {
  return res.sendSuccess(await service.updateAlert(String(req.params.id), updatePriceAlertSchema.parse(req.body).active, req.header("authorization")), "Alerta atualizado.");
}

export async function importUrl(req: Request, res: Response) {
  const { url } = importSourceSchema.parse(req.body);
  return res.sendSuccess(await importSource(url), "Fonte importada.");
}

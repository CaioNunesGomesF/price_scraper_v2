import { Request, Response } from "express";
import * as llmService from "./llm.service.js";
import { compareOffersRequestSchema, interpretSearchRequestSchema } from "./llm.zod.js";

export async function interpretSearch(req: Request, res: Response) {
  const data = interpretSearchRequestSchema.parse(req.body);
  const interpretation = await llmService.interpretSearch(data);
  return res.sendSuccess(interpretation, "Preferencias de busca interpretadas.");
}

export async function compareOffers(req: Request, res: Response) {
  const data = compareOffersRequestSchema.parse(req.body);
  const comparison = await llmService.compareOffers(data);
  return res.sendSuccess(comparison, "Comparação concluída.");
}

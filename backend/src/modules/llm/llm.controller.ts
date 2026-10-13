import { Request, Response } from "express";
import * as llmService from "./llm.service.js";
import { interpretSearchRequestSchema } from "./llm.zod.js";

export async function interpretSearch(req: Request, res: Response) {
  const data = interpretSearchRequestSchema.parse(req.body);
  const interpretation = await llmService.interpretSearch(data);
  return res.sendSuccess(interpretation, "Preferencias de busca interpretadas.");
}

import { Request, Response } from "express";
import * as searchService from "./search.service.js";
import { searchRequestSchema } from "./search.zod.js";

export async function searchOffers(req: Request, res: Response) {
  const data = searchRequestSchema.parse(req.body);
  const result = await searchService.searchOffers(data);
  return res.sendSuccess(result, "Ofertas encontradas.");
}

import type { Request, Response } from "express";
import * as service from "./partner-stores.service.js";
import { createPartnerStoreSchema } from "./partner-stores.zod.js";

export async function list(_req: Request, res: Response) {
  return res.sendSuccess(await service.getDirectory());
}

export async function listCatalog(_req: Request, res: Response) {
  return res.sendSuccess(await service.getCatalog());
}

export async function create(req: Request, res: Response) {
  const data = createPartnerStoreSchema.parse(req.body);
  const result = await service.submitStore(data);
  return res.sendSuccess(result, "Cadastro recebido e ativado no catálogo.", 201);
}

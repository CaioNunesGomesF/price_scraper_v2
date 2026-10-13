import { Request, Response } from "express";
import * as itemService from "./items.service.js";
import { createItemSchema, itemIdParamSchema } from "./items.zod.js";

export async function createItem(req: Request, res: Response) {
  const data = createItemSchema.parse(req.body);
  const result = await itemService.createItem(data);
  return res.sendSuccess(result, "Registro criado com sucesso.", 201);
}

export async function getItemById(req: Request, res: Response) {
  const { id } = itemIdParamSchema.parse(req.params);
  const result = await itemService.getItemById(id);
  return res.sendSuccess(result, "Registro recuperado com sucesso.");
}

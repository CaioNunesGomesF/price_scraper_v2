import type { Request, Response } from "express";
import { favoriteIdSchema, favoriteSchema } from "./favorites.zod.js";
import * as service from "./favorites.service.js";

export async function list(req: Request, res: Response) {
  return res.sendSuccess(await service.listFavorites(req.header("authorization")));
}

export async function add(req: Request, res: Response) {
  const { offer } = favoriteSchema.parse(req.body);
  return res.sendSuccess(await service.addFavorite(req.header("authorization"), offer), "Favorito salvo.", 201);
}

export async function remove(req: Request, res: Response) {
  const { id } = favoriteIdSchema.parse(req.params);
  await service.removeFavorite(req.header("authorization"), id);
  return res.sendSuccess(null, "Favorito removido.");
}

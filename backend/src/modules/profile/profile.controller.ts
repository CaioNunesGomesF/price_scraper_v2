import type { Request, Response } from "express";
import * as service from "./profile.service.js";
import { profilePreferencesSchema } from "./profile.zod.js";

export async function get(req: Request, res: Response) {
  return res.sendSuccess(await service.get(req.header("authorization")), "Perfil recuperado.");
}

export async function update(req: Request, res: Response) {
  return res.sendSuccess(await service.update(profilePreferencesSchema.parse(req.body), req.header("authorization")), "Preferências salvas.");
}

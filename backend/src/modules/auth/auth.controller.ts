import type { Request, Response } from "express";
import { credentialsSchema } from "./auth.zod.js"; import * as service from "./auth.service.js";
export const register = async (req: Request, res: Response) => res.sendSuccess(await service.register(credentialsSchema.parse(req.body)), "Conta criada.", 201);
export const login = async (req: Request, res: Response) => res.sendSuccess(await service.login(credentialsSchema.parse(req.body)), "Login realizado.");
export const me = async (req: Request, res: Response) => res.sendSuccess({ user: await service.authenticate(req.header("authorization")) });
export const logout = async (req: Request, res: Response) => { await service.logout(req.header("authorization")); return res.sendSuccess(null, "Sessao encerrada."); };

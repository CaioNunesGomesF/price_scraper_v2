import { Request, Response } from "express";
import * as searchService from "./search.service.js";
import { searchRequestSchema, sessionIdParamSchema } from "./search.zod.js";

export async function searchOffers(req: Request, res: Response) {
  const data = searchRequestSchema.parse(req.body);
  const result = await searchService.searchOffers(data, req.header("authorization"));
  return res.sendSuccess(result, "Ofertas encontradas.");
}

export async function listDashboardOffers(_req: Request, res: Response) {
  return res.sendSuccess(await searchService.listDashboardOffers(_req.header("authorization")), "Dados do dashboard recuperados.");
}

export async function listSessions(req: Request, res: Response) {
  const sessions = await searchService.listChatSessions(req.header("authorization"));
  return res.sendSuccess(sessions, "Histórico de buscas recuperado.");
}

export async function getSession(req: Request, res: Response) {
  const { id } = sessionIdParamSchema.parse(req.params);
  const session = await searchService.getChatSession(id, req.header("authorization"));
  return res.sendSuccess(session, "Busca recuperada.");
}

export async function deleteSession(req: Request, res: Response) {
  const { id } = sessionIdParamSchema.parse(req.params);
  await searchService.deleteChatSession(id, req.header("authorization"));
  return res.sendSuccess(null, "Busca excluída com sucesso.");
}

export async function clearSessions(req: Request, res: Response) {
  await searchService.clearChatSessions(req.header("authorization"));
  return res.sendSuccess(null, "Histórico limpo com sucesso.");
}


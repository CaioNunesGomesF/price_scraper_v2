import { Request, Response } from "express";
import * as mercadoLivreService from "./mercado-livre.service.js";
import { oauthCallbackSchema } from "./mercado-livre.zod.js";
import { notificationSchema } from "./mercado-livre.zod.js";

export function connect(_req: Request, res: Response) {
  return res.redirect(302, mercadoLivreService.createAuthorizationUrl());
}

export async function callback(req: Request, res: Response) {
  const { code, state } = oauthCallbackSchema.parse(req.query);
  await mercadoLivreService.exchangeAuthorizationCode(code, state);
  return res.status(200).type("html").send("<h1>Mercado Livre conectado com seguranca.</h1><p>Voce pode fechar esta janela.</p>");
}

export async function receiveNotification(req: Request, res: Response) {
  const payload = notificationSchema.parse(req.body);
  await mercadoLivreService.receiveNotification(payload);
  return res.sendStatus(200);
}

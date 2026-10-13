import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "../../../config/env.js";
import { ServiceUnavailableError } from "../../../errors/app-error.js";
import * as repository from "./mercado-livre.repository.js";

const authorizationUrl = "https://auth.mercadolivre.com.br/authorization";
const tokenUrl = "https://api.mercadolibre.com/oauth/token";
const pendingAuthorizations = new Map<string, { verifier: string; expiresAt: number }>();

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
};

let refreshInFlight: Promise<string> | null = null;

function config() {
  if (!env.MELI_CLIENT_ID || !env.MELI_CLIENT_SECRET || !env.MELI_REDIRECT_URI) {
    throw new ServiceUnavailableError("A integracao com Mercado Livre ainda nao foi configurada.");
  }
  return { clientId: env.MELI_CLIENT_ID, clientSecret: env.MELI_CLIENT_SECRET, redirectUri: env.MELI_REDIRECT_URI };
}

function encryptionKey() {
  const value = process.env.MELI_TOKEN_ENCRYPTION_KEY;
  if (!value) throw new ServiceUnavailableError("A chave de cifragem da integracao nao foi configurada.");
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) throw new ServiceUnavailableError("A chave de cifragem da integracao e invalida.");
  return key;
}

function encrypt(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decrypt(value: string) {
  const payload = Buffer.from(value, "base64");
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

function base64Url(value: Buffer) {
  return value.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export function createAuthorizationUrl() {
  const { clientId, redirectUri } = config();
  const state = base64Url(randomBytes(32));
  const verifier = base64Url(randomBytes(64));
  const challenge = base64Url(createHash("sha256").update(verifier).digest());
  pendingAuthorizations.set(state, { verifier, expiresAt: Date.now() + 10 * 60 * 1000 });

  const url = new URL(authorizationUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  // O refresh token so e emitido quando o acesso offline e solicitado.
  url.searchParams.set("scope", "offline_access read write");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export async function exchangeAuthorizationCode(code: string, state: string) {
  const pending = pendingAuthorizations.get(state);
  pendingAuthorizations.delete(state);
  if (!pending || pending.expiresAt < Date.now()) {
    throw new ServiceUnavailableError("A autorizacao expirou ou nao corresponde a uma solicitacao valida.");
  }

  const { clientId, clientSecret, redirectUri } = config();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
    code_verifier: pending.verifier,
  });

  let response: Response;
  try {
    response = await fetch(tokenUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body, signal: AbortSignal.timeout(15_000) });
  } catch {
    throw new ServiceUnavailableError("Nao foi possivel concluir a autorizacao com Mercado Livre.");
  }

  if (!response.ok) throw new ServiceUnavailableError("O Mercado Livre recusou a autorizacao.");
  const tokens = (await response.json()) as TokenResponse;
  if (!tokens.access_token || !tokens.refresh_token || !tokens.expires_in) {
    throw new ServiceUnavailableError("O Mercado Livre nao retornou credenciais validas.", {
      oauthStatus: response.status,
      receivedFields: Object.keys(tokens).sort(),
      hasAccessToken: Boolean(tokens.access_token),
      hasRefreshToken: Boolean(tokens.refresh_token),
      hasExpiresIn: Boolean(tokens.expires_in),
    });
  }

  await repository.saveTokens({
    accessTokenEncrypted: encrypt(tokens.access_token),
    refreshTokenEncrypted: encrypt(tokens.refresh_token),
    expiresAt: new Date(Date.now() + tokens.expires_in * 1_000),
  });
}

async function refreshAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = config();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  let response: Response;
  try {
    response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new ServiceUnavailableError("Nao foi possivel renovar a conexao com Mercado Livre.");
  }

  if (!response.ok) {
    throw new ServiceUnavailableError("A conexao com Mercado Livre expirou. Conecte a conta novamente.");
  }

  const tokens = (await response.json()) as TokenResponse;
  if (!tokens.access_token || !tokens.refresh_token || !tokens.expires_in) {
    throw new ServiceUnavailableError("O Mercado Livre nao retornou credenciais renovadas validas.");
  }

  await repository.saveTokens({
    accessTokenEncrypted: encrypt(tokens.access_token),
    refreshTokenEncrypted: encrypt(tokens.refresh_token),
    expiresAt: new Date(Date.now() + tokens.expires_in * 1_000),
  });
  return tokens.access_token;
}

export async function getValidAccessToken() {
  const stored = await repository.getTokens();
  if (!stored) {
    throw new ServiceUnavailableError("Conecte uma conta Mercado Livre antes de pesquisar.");
  }

  // Renova um minuto antes do vencimento para nao falhar durante uma requisicao.
  if (stored.expiresAt.getTime() > Date.now() + 60_000) {
    return decrypt(stored.accessTokenEncrypted);
  }

  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken(decrypt(stored.refreshTokenEncrypted))
      .finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

export async function receiveNotification(payload: {
  resource: string;
  user_id: number;
  topic: "items";
  sent: string;
  received?: string;
}) {
  const eventKey = createHash("sha256")
    .update(`${payload.topic}:${payload.resource}:${payload.user_id}:${payload.sent}`)
    .digest("hex");

  await repository.enqueueNotification({
    eventKey,
    topic: payload.topic,
    resource: payload.resource,
    payload,
  });
}

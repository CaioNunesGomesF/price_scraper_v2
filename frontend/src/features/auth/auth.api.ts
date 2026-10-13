import { request } from "../../shared/api";

export type AuthSession = { token: string; user: { email: string } };
export type Credentials = { email: string; password: string };

export const register = (credentials: Credentials) =>
  request<AuthSession>("/api/auth/register", { method: "POST", body: JSON.stringify(credentials) });

export const login = (credentials: Credentials) =>
  request<AuthSession>("/api/auth/login", { method: "POST", body: JSON.stringify(credentials) });

export const getCurrentUser = (token: string) =>
  request<{ user: { email: string } }>("/api/auth/me", {}, token);

export const logout = (token: string) =>
  request<null>("/api/auth/logout", { method: "POST" }, token);

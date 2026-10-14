import { request } from "../../shared/api";
import type { ChatSession, ComparisonAnalysis, Offer, SearchResult } from "./search.types";

export const searchOffers = (prompt: string, token?: string, signal?: AbortSignal) =>
  request<SearchResult>("/api/search", { method: "POST", body: JSON.stringify({ prompt }), signal }, token);

export type DashboardData = {
  offers: Offer[];
  cachedSearches: number;
  lastUpdatedAt: string | null;
};

export const getDashboardData = (token?: string) => request<DashboardData>("/api/search/dashboard", {}, token);

export const listChatSessions = (token: string) =>
  request<ChatSession[]>("/api/search/sessions", {}, token);

export const getChatSession = (token: string, id: string) =>
  request<ChatSession>(`/api/search/sessions/${id}`, {}, token);

export const deleteChatSession = (token: string, id: string) =>
  request<null>(`/api/search/sessions/${id}`, { method: "DELETE" }, token);

export const clearChatSessions = (token: string) =>
  request<null>("/api/search/sessions", { method: "DELETE" }, token);

export const compareOffers = (offers: Offer[], token?: string, signal?: AbortSignal) =>
  request<ComparisonAnalysis>(
    "/api/llm/compare-offers",
    {
      method: "POST",
      body: JSON.stringify({
        offers: offers.map(({ id, title, source, price, originalPrice, freeShipping, seller }) => ({
          id,
          title,
          source,
          price,
          originalPrice,
          freeShipping,
          seller,
        })),
      }),
      signal,
    },
    token,
  );


import { request } from "../../shared/api";
import type { SearchResult } from "./search.types";

export const searchOffers = (prompt: string, signal?: AbortSignal) =>
  request<SearchResult>("/api/search", { method: "POST", body: JSON.stringify({ prompt }), signal });

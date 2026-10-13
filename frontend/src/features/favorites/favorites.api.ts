import { request } from "../../shared/api";
import type { Offer } from "../search/search.types";

export type Favorite = { id: string; offerId: string; offer: Offer; createdAt: string };

export const listFavorites = (token: string) => request<Favorite[]>("/api/favorites", {}, token);

export const addFavorite = (token: string, offer: Offer) =>
  request<Favorite>("/api/favorites", { method: "POST", body: JSON.stringify({ offer }) }, token);

export const removeFavorite = (token: string, id: string) =>
  request<null>(`/api/favorites/${id}`, { method: "DELETE" }, token);

import { authenticate } from "../auth/auth.service.js";
import type { Offer } from "../search/search.zod.js";
import * as repository from "./favorites.repository.js";

export async function listFavorites(authorization?: string) {
  const { userId } = await authenticate(authorization);
  return repository.list(userId);
}

export async function addFavorite(authorization: string | undefined, offer: Offer) {
  const { userId } = await authenticate(authorization);
  const existing = await repository.findByOfferId(userId, offer.id);
  return existing ?? repository.add(userId, offer.id, offer);
}

export async function removeFavorite(authorization: string | undefined, id: string) {
  const { userId } = await authenticate(authorization);
  await repository.remove(userId, id);
}

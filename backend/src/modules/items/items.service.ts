import { ConflictError, NotFoundError } from "../../errors/app-error.js";
import * as itemRepository from "./items.repository.js";
import { CreateItemDTO } from "./items.zod.js";

export async function createItem(data: CreateItemDTO) {
  const existing = await itemRepository.getItemByCode(data.code);
  if (existing) throw new ConflictError("Já existe um registro cadastrado com este código.");
  return itemRepository.createItem(data);
}

export async function getItemById(id: string) {
  const item = await itemRepository.getItemById(id);
  if (!item) throw new NotFoundError("Registro não encontrado.");
  return item;
}

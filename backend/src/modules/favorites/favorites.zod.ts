import { z } from "zod"; import { offerSchema } from "../search/search.zod.js";
export const favoriteSchema = z.object({ offer: offerSchema }); export const favoriteIdSchema = z.object({ id: z.string().uuid() });

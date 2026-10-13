import { z } from "zod";

export const createItemSchema = z.object({
  code: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(255),
});

export const itemIdParamSchema = z.object({ id: z.string().uuid() });

export type CreateItemDTO = z.infer<typeof createItemSchema>;

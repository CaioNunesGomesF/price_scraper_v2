import { z } from "zod";

export const oauthCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(32).max(256),
});

export const notificationSchema = z.object({
  resource: z.string().startsWith("/").max(500),
  user_id: z.number().int().positive(),
  topic: z.literal("items"),
  sent: z.string().max(80),
  received: z.string().max(80).optional(),
});

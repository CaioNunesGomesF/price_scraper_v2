import { z } from "zod";
export const credentialsSchema = z.object({ email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()), password: z.string().min(8).max(128) });
export type CredentialsDTO = z.infer<typeof credentialsSchema>;

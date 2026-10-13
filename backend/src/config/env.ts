import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z.string().url().default("postgres://postgres:postgres@localhost:5432/price_scraper"),
  OLLAMA_BASE_URL: z.string().url().default("http://localhost:11434"),
  OLLAMA_MODEL: z.string().min(1).default("llama3.2:3b"),
  MELI_CLIENT_ID: z.string().min(1).optional(),
  MELI_CLIENT_SECRET: z.string().min(1).optional(),
  MELI_REDIRECT_URI: z.string().url().optional(),
  SERPAPI_API_KEY: z.string().min(1).optional(),
});

export const env = envSchema.parse(process.env);

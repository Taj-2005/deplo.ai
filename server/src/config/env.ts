import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  API_VERSION: z.string().default("v1"),

  DATABASE_URL: z.string().url(),

  REDIS_URL: z.string().url(),

  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("7d"),

  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  GITHUB_REDIRECT_URI: z.string().url(),

  // Vercel Integration OAuth app (registered once by deplo.ai — NOT per-user credentials).
  // Each user's token is stored encrypted in the ProviderConnection table.
  VERCEL_CLIENT_ID: z.string().min(1),
  VERCEL_CLIENT_SECRET: z.string().min(1),
  VERCEL_INTEGRATION_SLUG: z.string().min(1),

  // Public URL of this server (e.g. https://api.deplo.ai) — used for OAuth callbacks + GitHub webhooks.
  PUBLIC_URL: z.string().url().optional(),

  // Optional secret for validating inbound webhooks from GitHub.
  WEBHOOK_SECRET: z.string().min(16).optional(),

  ENCRYPTION_KEY: z.string().min(64),

  ALLOWED_ORIGINS: z
    .string()
    .transform((s) => s.split(",").map((o) => o.trim())),

  LOG_LEVEL: z
    .enum(["error", "warn", "info", "http", "debug", "silly"])
    .default("info"),
});

const _parsed = envSchema.safeParse(process.env);

if (!_parsed.success) {
  /* eslint-disable no-console -- env bootstrap runs before logger is available */
  console.error("❌  Invalid environment variables:");
  console.error(JSON.stringify(_parsed.error.flatten().fieldErrors, null, 2));
  /* eslint-enable no-console */
  process.exit(1);
}

export const env = _parsed.data;
export type Env = typeof env;

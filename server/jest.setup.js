/**
 * Jest setupFiles — runs BEFORE any module is imported.
 *
 * src/config/env.ts validates process.env at import time and exits the
 * process when required vars are missing. Locally .env fills them; in CI
 * there is no .env, so provide harmless dummies for any var not already set.
 * Never overrides real values, so local runs behave identically.
 */
const defaults = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://test:test@localhost:5432/test",
  REDIS_URL: "redis://localhost:6379",
  JWT_SECRET: "jest-test-secret-jest-test-secret-jest!!",
  GITHUB_CLIENT_ID: "test-client-id",
  GITHUB_CLIENT_SECRET: "test-client-secret",
  GITHUB_REDIRECT_URI: "http://localhost:3000/api/v1/auth/github/callback",
  VERCEL_CLIENT_ID: "test-vercel-client-id",
  VERCEL_CLIENT_SECRET: "test-vercel-client-secret",
  VERCEL_INTEGRATION_SLUG: "deplo-ai-test",
  ENCRYPTION_KEY: "a".repeat(64),
  ALLOWED_ORIGINS: "http://localhost:3000",
  LOG_LEVEL: "error",
};

for (const [key, value] of Object.entries(defaults)) {
  if (!process.env[key]) process.env[key] = value;
}

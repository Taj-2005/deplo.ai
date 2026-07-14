# syntax=docker/dockerfile:1.7
# ── Stage 1: deps ────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS deps
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci --no-audit --no-fund && npx prisma generate

# ── Stage 2: builder ─────────────────────────────────────────────────────────
FROM deps AS builder
COPY tsconfig*.json ./
COPY src ./src

RUN npm run build

# ── Stage 3: runtime ─────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends wget ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/package*.json ./

USER node
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:4000/api/v1/health || exit 1

# Neon (serverless Postgres) auto-suspends when idle and takes ~5-10s to wake,
# so the first connection attempt can fail with P1001. Retry the migration with
# backoff before giving up so cold starts don't crash-loop the container.
CMD ["sh", "-c", "\
  for i in 1 2 3 4 5 6; do \
    npx prisma migrate deploy && exec node dist/index.js; \
    echo \"prisma migrate deploy failed (attempt $i/6) — database may be waking, retrying in 5s…\"; \
    sleep 5; \
  done; \
  echo 'Database unreachable after 6 attempts — exiting.'; \
  exit 1"]

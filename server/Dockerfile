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

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]

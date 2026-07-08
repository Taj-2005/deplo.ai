# deplo.ai

**AI-powered deployment & cloud orchestration platform.** Connect your GitHub repo and Vercel account, and deplo.ai analyzes your stack, provisions the right config, and ships your app end-to-end — no manual pipelines, dashboards, or YAML.

---

## How it works

1. **Sign in with GitHub** — deplo.ai reads your repositories.
2. **Connect Vercel** (per-user OAuth) — deployments run under _your own_ Vercel account; the access token is encrypted at rest.
3. **Pick a repo** — the analyzer detects the stack (framework, env vars, build settings).
4. **Deploy** — a background worker orchestrates the build and deploy to Vercel, streams logs, and reports status back to the dashboard.

---

## Monorepo layout

```
deplo-ai/
├── client/     # Next.js dashboard + landing (App Router, React, Tailwind, Framer Motion)
└── server/     # Node/TypeScript API (Clean Architecture)
```

### Server (`server/`)

TypeScript backend built on **Clean Architecture**:

| Layer | Path | Responsibility |
|---|---|---|
| Interfaces | `src/interfaces` | HTTP controllers, GraphQL, webhooks |
| Application | `src/application` | Services + deployment orchestration |
| Domain | `src/domain` | Entities & repository contracts |
| Infrastructure | `src/infrastructure` | Prisma, Redis/BullMQ, GitHub & Vercel adapters |

**Stack:** Express + Apollo GraphQL · Prisma ORM + PostgreSQL · Redis + BullMQ (job queue / orchestrator) · JWT auth · Zod validation · Winston logging · Docker.

**Data models:** `User`, `ProviderConnection`, `Repository`, `Deployment`.

### Client (`client/`)

Next.js (App Router) app serving both the marketing site and the authenticated dashboard (`/dashboard`), plus the post-signup `/onboarding` flow that walks new users through connecting Vercel.

---

## Getting started

**Prerequisites:** Node.js 20+, a PostgreSQL database (e.g. Neon), and a Redis instance.

### 1. Server

```bash
cd server
npm install
cp .env.example .env      # then fill in the values below
npm run prisma:generate
npm run prisma:migrate     # apply migrations (dev)
npm run dev                # starts on http://localhost:4000
```

### 2. Client

```bash
cd client
npm install
npm run dev                # starts on http://localhost:3000
```

---

## Environment variables (`server/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string (BullMQ) |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | Auth token signing |
| `ENCRYPTION_KEY` | Encrypts stored provider access tokens |
| `GITHUB_APP_ID` / `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` / `GITHUB_REDIRECT_URI` | GitHub OAuth / App |
| `VERCEL_CLIENT_ID` / `VERCEL_CLIENT_SECRET` / `VERCEL_INTEGRATION_SLUG` | Per-user Vercel OAuth integration |
| `PUBLIC_URL` | Public HTTPS base URL of the API (required for Vercel OAuth callback) |
| `ALLOWED_ORIGINS` | Comma-separated allowed client origins |
| `WEBHOOK_SECRET` | Verifies inbound deployment webhooks |
| `NODE_ENV` / `PORT` / `API_VERSION` / `LOG_LEVEL` | Runtime config |

---

## Useful scripts (`server/`)

```bash
npm run dev                  # watch-mode dev server
npm run build                # compile to dist/
npm run typecheck            # tsc --noEmit
npm run lint                 # ESLint
npm run test                 # Jest
npm run prisma:studio        # browse the DB
npm run prisma:migrate:deploy  # apply migrations (production)
```

---

## Deployment

The server ships as a multi-stage Docker image (`server/Dockerfile`). On boot it runs `prisma migrate deploy` and then starts the API on port `4000`, with a `/api/v1/health` healthcheck.

> **Migration note:** never rename or edit a migration that has already been applied to a shared/production database — add a new migration instead. A rewritten history leaves an orphaned failed record that blocks `migrate deploy` (Prisma error **P3009**). If you hit it, resolve with `prisma migrate resolve --rolled-back "<migration_name>"`.

See [`ecs-cost-estimate.html`](./ecs-cost-estimate.html) for an AWS ECS hosting cost breakdown.

---

## License

Proprietary — © deplo.ai. All rights reserved.

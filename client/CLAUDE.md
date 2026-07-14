# CLAUDE.md — deplo.ai Engineering Handbook

> This is the **authoritative engineering and architecture guide** for the deplo.ai platform. All contributors, AI coding agents, and future developers treat this document as the single source of truth. Update it immediately when architecture, stack, or workflows change.

---

## 1. Project Vision

deplo.ai is an **AI-powered deployment orchestration platform**. It eliminates DevOps complexity for indie hackers, startups, students, and hackathon teams by:

1. Connecting to a GitHub repository
2. Automatically detecting the frontend/backend stack
3. Asking for required environment variables
4. Deploying frontend → Vercel, backend → Render
5. Returning production-ready URLs in under 3 minutes

**Core Philosophy:** _Code goes in. Production URL comes out._

---

## 2. Monorepo Structure

```
deplo-ai/
├── client/          # Next.js 16 landing page + future dashboard
├── server/          # Node.js TypeScript API (GraphQL + REST)
├── docker-compose.yml
├── .github/
│   └── workflows/
│       ├── ci.yml       # Main CI (lint + type-check + test + build)
│       ├── pr-lint.yml  # Fast PR gate
│       └── docker.yml   # Docker build verification
└── CLAUDE.md
```

---

## 3. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript 5 strict |
| Styling | TailwindCSS v4 (`@import "tailwindcss"`) |
| Animation | Framer Motion 12 |
| Backend | Node.js 20, TypeScript 5 strict, Express 4 |
| API | GraphQL (Apollo Server 4) + REST fallback |
| Database | PostgreSQL 16 via Prisma ORM |
| Cache | Redis 7 (ioredis) |
| Auth | GitHub OAuth → JWT |
| Docs | Swagger/OpenAPI 3.0 (light mode, at `/docs`) |
| Containerization | Docker + docker-compose |
| CI/CD | GitHub Actions |
| Deployment | Client → Vercel, Server → Render |

---

## 4. Backend Architecture

### 4.1 Layered Clean Architecture

```
server/src/
├── config/              # Env validation, database config
├── domain/              # Pure domain entities and repository interfaces
│   ├── user/            # User entity + IUserRepository
│   ├── deployment/      # Deployment entity + IDeploymentRepository
│   └── shared/          # Result<T, E> type
├── application/         # Use cases / business logic
│   └── services/        # AuthService, DeploymentService, AnalysisService
├── infrastructure/      # Concrete implementations
│   ├── database/        # Prisma client + repository implementations
│   ├── redis/           # RedisClient + CacheService
│   ├── github/          # GitHubAdapter (OAuth, repo access)
│   ├── vercel/          # VercelAdapter (project/deploy management)
│   └── render/          # RenderAdapter (service/deploy management)
├── interfaces/          # Delivery mechanism layer
│   ├── graphql/         # Apollo schema, resolvers, context
│   ├── http/            # Express controllers, middleware, validators
│   └── swagger/         # OpenAPI spec and Swagger UI setup
└── shared/              # Cross-cutting concerns
    ├── logger/          # Winston logger
    └── errors/          # AppError class + error codes
```

### 4.2 Dependency Rules (STRICTLY enforced)

- `domain` depends on **nothing** — pure TypeScript interfaces and entities
- `application` depends on `domain` and `shared` only — **no** Prisma, **no** Redis, **no** Express
- `infrastructure` depends on `domain` and `application` interfaces
- `interfaces` depends on `application` (services) — **never** on `infrastructure` directly
- `config` and `shared` are usable by all layers

### 4.3 SOLID Principles Enforcement

| Principle | How enforced |
|-----------|-------------|
| Single Responsibility | One class = one concern. Controllers only route, services only orchestrate, repositories only persist |
| Open/Closed | Extend via new implementations of repository interfaces — never modify domain interfaces |
| Liskov Substitution | All repository implementations satisfy their `I*Repository` interface |
| Interface Segregation | Separate `IUserRepository`, `IDeploymentRepository`, `IRepositoryRepository` — no fat interfaces |
| Dependency Inversion | Services depend on interfaces, not concrete classes |

### 4.4 Error Handling

All errors use `AppError` with typed `ErrorCode`:
```typescript
throw AppError.notFound("Deployment");
throw AppError.unauthorized();
throw AppError.conflict("Deployment already completed");
throw AppError.externalService("GitHub", "API rate limit exceeded");
```

Never use `throw new Error()` directly in application code.

### 4.5 Repository Analysis Engine (deterministic-first)

The stack-detection engine (`server/src/application/analysis/`, types in
`server/src/domain/analysis/`) is a **layered, evidence-scored pipeline**.
Detection is **deterministic first**; AI reasoning is a bounded fallback.

**Pipeline**
```
RepoSnapshot (one cached git tree + lazy file reads)
   │
   ├─ Layer 2  StructureAnalyzer      → single | frontend-backend | monorepo
   │                                    (turbo/nx/pnpm/npm/yarn workspaces)
   ├─ Layer 1  FrameworkDetector      → weighted signatures → scored candidates
   │           LanguageDetector       → js/ts/python/go/java/html
   │           ConfidenceEvaluator    → primary framework + escalation flag
   │
   ├─ RuntimeResolver                 → language version + package manager
   ├─ BuildCommandResolver            → install/build/output/start (reads scripts)
   └─ DeploymentStrategyResolver      → framework → provider preset (abstraction)
   ↓
RepositoryAnalysis { structure, components[], confidence, needsAiFallback, evidence }
```

**Principles**
- **Never trust a single indicator.** Every framework is a declarative signature
  in `frameworkSignatures.ts` (dependencies + config files + content patterns +
  scripts, each weighted). Score is normalised to a 0–1 **confidence**; a
  meta-framework (Next.js) beats the base library (React) via priority.
- **Confidence scoring drives escalation.** Below `AI_ESCALATION_THRESHOLD`
  (0.5) the result sets `needsAiFallback = true` (Layer 3 — Groq — is Phase 2).
- **Tree-driven, not filename-guessing.** Structure and workspaces come from the
  full recursive tree, so Python/Go/Java repos and `apps/*` monorepos are seen.
- **Adding a framework is data**, not new control flow — extend the signature
  registry (and optionally `PROVIDER_RULES`).
- **Provider abstraction is centralised** in `DeploymentStrategyResolver`
  (`PROVIDER_RULES`), never scattered across the orchestrator.
- **Backward compatible:** `legacyMapper.toDetectedStack()` projects the rich
  analysis onto the existing `DetectedStack` so the current deploy path is
  unchanged. `AnalysisService` returns `{ stack, envVars, analysis }`.

**Detection coverage** — Frontend: Next.js, React, Vite, Vue, Nuxt, Angular,
Astro, Svelte/SvelteKit, Remix, Gatsby, static HTML. Backend: Express, Fastify,
NestJS, Hono, Koa, FastAPI, Flask, Django, Spring Boot, Go, Bun.

**Deployable today** (Phase 1): Next.js, Vite/React (→ Vercel), Express, Fastify
(→ Vercel serverless). Everything else is **detected with a correct strategy**
but marked `deployable: false` (`strategy.notes` explains). Broadening deploy
targets (Render for Python/Go/Java) is **Phase 3**.

**Layer 3 — Groq AI fallback (Phase 2, implemented)**

When deterministic confidence < 0.5, the pipeline escalates to Groq
(`GroqReasoningService` + `infrastructure/groq/GroqClient`). Strictly bounded —
**max 2 AI calls per deployment**:

1. `reasonAboutRepository()` — fired from `AnalysisService` on low confidence.
   Sends the folder tree (≤200 paths), key config files + small top-level
   source files (≤25 files, ≤1.5KB each), dependency lists, and the
   deterministic evidence — never the whole repo. Returns per-component
   framework/language/commands via **strict JSON-schema structured outputs**
   with framework/language **enums** (constrained decoding → always canonical).
   AI corrections merge only when more confident than the deterministic result;
   merged evidence is tagged `ai:groq`.
2. `diagnoseDeploymentFailure()` — fired once from the orchestrator's
   `failDeployment()`. Sends the detected stack, error, and log tail; returns
   likely cause + corrected build/start/output suggestions, appended to the
   deployment logs for the user.

Implementation contract:
- Model: `GROQ_MODEL` (default `openai/gpt-oss-120b` — production model with
  strict structured outputs; free tier).
- Keys: `GROQ_API_TOKEN_1/2` (optional). `GroqClient` tries each key at most
  once per completion, failing over on 401/403/429/5xx/timeout (45s).
- Degrades gracefully: no keys → deterministic-only; LLM failure → deterministic
  result is kept, never an error to the user.
- `RepositoryAnalysis.aiUsed` marks AI-assisted results.

---

## 5. GraphQL Architecture

### 5.1 Schema-First Approach

All schema is defined in `src/interfaces/graphql/schema/typeDefs.ts` using SDL. This is the source of truth — TypeScript types are derived from the schema.

### 5.2 Resolver Organization

Resolvers live in `src/interfaces/graphql/resolvers/index.ts`. Split into domain-specific files when any domain exceeds ~300 lines.

Rules:
- Resolvers **never** call repositories directly — always through services
- `requireAuth(ctx)` guard used at the start of all authenticated resolvers
- Parent field resolvers use DataLoaders when N+1 risk exists

### 5.3 Context

Context is built per-request in `buildContext()`. It includes:
- `prisma` — for simple queries
- `userRepository`, `deploymentRepository` — domain repositories
- `authService`, `deploymentService` — application services
- `cache` — CacheService for Redis access
- `currentUser` — resolved from JWT (or `null` for anonymous)

---

## 6. Database (PostgreSQL / Prisma)

### 6.1 Schema Rules

- All IDs use `cuid()` — never `autoincrement()` integers for public-facing entities
- Every table has `createdAt` and `updatedAt`
- All foreign keys have explicit `onDelete:` behavior
- All frequently-queried fields have `@@index`
- Sensitive data (tokens) stored **encrypted** — never plaintext

### 6.2 Migration Workflow

```bash
npm run prisma:migrate          # dev: creates + applies migration
npm run prisma:migrate:deploy   # prod: applies existing migrations only
npm run prisma:seed             # seed demo data
```

**Never** use `prisma db push` in production.

---

## 7. Redis / Caching

| Use Case | Key Pattern | TTL |
|----------|-------------|-----|
| GitHub repo list | `repos:{userId}` | 300s |
| Deployment status | `deployment:{id}` | 30s |
| User profile | `user:{id}` | 3600s |

```typescript
await cache.get<Deployment>("deployment:abc123");
await cache.set("deployment:abc123", data, 30);
await cache.delPattern("repos:*");
cache.buildKey("deployment", id);
```

---

## 8. Authentication

- GitHub OAuth Code → access token → AES-256-GCM encrypted at rest
- JWT issued on each login (HS256, 7-day expiry)
- HTTP: `createAuthMiddleware()` → `req.userId`
- GraphQL: `buildContext()` → `ctx.currentUser`

---

## 9. Frontend Architecture (Next.js)

### 9.1 Directory Structure

```
client/
├── app/                  # Next.js App Router
│   ├── layout.tsx        # Root layout + SEO metadata
│   ├── page.tsx          # Landing page composition
│   ├── globals.css       # TailwindCSS v4 theme + keyframes
│   ├── sitemap.ts        # Dynamic sitemap
│   ├── robots.ts         # Crawl rules
│   └── manifest.ts       # PWA manifest
├── components/
│   ├── landing/          # Landing page sections
│   └── seo/              # JSON-LD structured data
└── public/               # Static assets
```

### 9.2 Component Rules

- **No business logic in components** — extract to hooks or utilities
- **No inline styles** — only TailwindCSS classes
- **No `any` types** — strict TypeScript everywhere
- `"use client"` only when browser APIs are required
- Server Components are the default

### 9.3 TailwindCSS v4

```css
/* globals.css */
@import "tailwindcss";
@theme { --color-accent-cyan: #00d2ff; }
```

Use CSS variables in `globals.css` for all brand colors. Never hardcode hex in component JSX for repeated values.

### 9.4 Animation Rules (Framer Motion 12)

- `whileInView` + `viewport={{ once: true }}` for scroll animations
- `variants` objects for stagger animations
- `AnimatePresence` for exit animations
- `useInView` from `framer-motion`

---

## 9.5 API Routing — Vercel Rewrite Proxy (Option 1)

The frontend (Vercel) and backend (Render) live on different hosts, but **users
only ever see the frontend domain**. All API traffic is proxied through it.

```
User
      │
      ▼
https://www.deplo.in
      │
      ├── Frontend pages ───────────────► Vercel (Next.js)
      │
      └── /api/*  (+ /docs)
              │
              ▼
      Vercel Rewrite Proxy   (next.config.ts → rewrites())
              │
              ▼
https://deplo-ai.onrender.com/api/*   (Render backend)
```

### Rules

1. **The browser ALWAYS calls same-origin `/api/...`.** It never talks to the
   Render URL directly. Enforced by `getApiBaseUrl()` in `lib/auth.ts`, which
   returns `""` (same-origin) in the browser.
2. **Rewrites do the proxying**, defined in `next.config.ts`:
   - `/api/:path*`   → `${API_URL}/api/:path*`
   - `/docs`, `/docs/:path*` → backend Swagger UI (kept on-domain)
3. **No API logic lives on the frontend.** There are **no** Next.js route
   handlers under `app/api/` — the rewrite forwards everything, including
   OAuth redirects (the backend 302s flow back through the proxy untouched).
4. **Backend origin is a server-only variable.** `API_URL` is **not** prefixed
   with `NEXT_PUBLIC_`, so it is never shipped to the browser — the Render URL
   stays invisible. `NEXT_PUBLIC_API_URL` is **not** used for API wiring.

### Request flows

**Development** (`API_URL` unset → defaults to `http://127.0.0.1:4000`):
```
Browser → localhost:3000/api/v1/... → (Next rewrite) → 127.0.0.1:4000/api/v1/...
```

**Production** (`API_URL=https://deplo-ai.onrender.com` on Vercel):
```
Browser → www.deplo.in/api/v1/... → (Vercel rewrite) → deplo-ai.onrender.com/api/v1/...
```

### Why rewrites (not client-side base URLs or CORS)?

- **Transparent** — users never see the backend host; one domain, no CORS
  preflights in the browser (requests are same-origin).
- **Environment-independent frontend** — the same client bundle runs anywhere;
  only the server-side `API_URL` changes per environment.
- **Auth-safe** — `Authorization: Bearer <jwt>` headers are forwarded by the
  proxy; auth uses localStorage tokens (no cookies), so SameSite/secure-cookie
  concerns do not apply. GitHub OAuth `redirect_uri` targets the **frontend**
  domain so the callback returns through the proxy.

### What is NOT proxied

External providers that call **us** hit the backend's own public URL directly
(`PUBLIC_URL`), never the frontend:
- GitHub webhooks → `PUBLIC_URL/api/v1/webhooks/github`
- Vercel OAuth/webhooks → `PUBLIC_URL/api/v1/integrations/vercel/callback`

### Deployment considerations

- Vercel: set **`API_URL`** (server-only) to the Render URL. Do **not** set
  `NEXT_PUBLIC_API_URL` for API wiring.
- Render: set `ALLOWED_ORIGINS` (canonical frontend origin first) and
  `GITHUB_REDIRECT_URI` to the frontend callback URL.
- Rewrites forward status codes, validation errors, auth failures, and 3xx
  redirects verbatim, so the frontend behaves as if talking to the backend
  directly.

---

## 10. SEO Architecture

| Feature | File |
|---------|------|
| Metadata (title, OG, Twitter) | `app/layout.tsx` |
| Structured Data | `components/seo/StructuredData.tsx` |
| Sitemap | `app/sitemap.ts` |
| Robots | `app/robots.ts` |
| PWA Manifest | `app/manifest.ts` |
| Security Headers | `next.config.ts` |

**Rule:** Only add URLs to `sitemap.ts` that return 200. No anchor hash fragments.

---

## 11. TypeScript Standards

```jsonc
// Required tsconfig settings (both client and server)
{
  "strict": true,
  "noImplicitAny": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true
}
```

- Never use `as any` — use `unknown` with type guards
- Never use `!` non-null assertion on external data
- Prefer `interface` for implementable object shapes
- Use discriminated unions over optional fields

---

## 12. Code Quality Gates

### CI Requirements (all must pass)

1. ESLint — zero errors
2. TypeScript — `tsc --noEmit` exits 0
3. Prettier — `prettier --check` exits 0
4. Tests — all pass, ≥70% coverage (server)
5. Build — succeeds

---

## 13. Testing Standards

- Unit tests: mock all external deps (Prisma, Redis, GitHub API)
- Integration tests: use test database
- Never test implementation details — test behavior
- Describe: domain or feature. It: "throws UNAUTHORIZED when token is expired"

---

## 14. DevOps Workflow

### Local Development

```bash
docker compose up postgres redis -d

# Server
cd server && npm install && cp .env.example .env
npm run prisma:migrate && npm run dev  # → localhost:4000

# Client
cd client && npm install && npm run dev  # → localhost:3000
```

### Docker

```bash
docker compose up --build
docker compose --profile tools up  # + Adminer on :8080
```

### Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready, protected |
| `develop` | Integration branch |
| `feat/*` | New features |
| `fix/*` | Bug fixes |
| `chore/*` | Non-functional changes |

### Commit Convention

```
feat(server): add GitHub OAuth callback handler
fix(client): correct env sync pill alignment on mobile
chore(deps): upgrade framer-motion to 12.39
```

---

## 15. Environment Variables

- All vars validated at startup via Zod (`server/src/config/env.ts`)
- Missing/invalid vars = process exits with clear error
- Sensitive vars never logged
- `.env.example` always up to date with comments
- Client: only `NEXT_PUBLIC_*` prefix — never put secrets here
- **Backend origin is server-only:** the client uses `API_URL` (no
  `NEXT_PUBLIC_` prefix) purely to drive the `next.config.ts` rewrite proxy.
  It is never shipped to the browser, and the browser always calls same-origin
  `/api/*`. See §9.5. Do **not** use `NEXT_PUBLIC_API_URL` for API wiring.

---

## 16. Security Standards

- Tokens encrypted AES-256-GCM before storage
- CORS: explicit allowlist from `ALLOWED_ORIGINS`
- Rate limiting: 200 req/15min per IP
- Helmet: all headers in production
- JWT: HS256, 7-day expiry
- SQL injection: impossible via Prisma parameterized queries
- No secrets in git

---

## 17. MVP Constraints

**Frontend:** Next.js, React (Vite/CRA)
**Backend:** Express.js, Node.js APIs, Fastify
**Languages:** JavaScript, TypeScript
**Frontend hosting:** Vercel only
**Backend hosting:** Render only
**Auth:** GitHub OAuth only

**DO NOT BUILD:** Kubernetes, Terraform, AWS/GCP/Azure, Docker execution engine, multi-cloud, AI agent frameworks, custom hosting, full CI/CD pipelines, container runtime, serverless orchestration, VMs, auto-scaling.

---

## 18. Observability

```typescript
logger.info("Deployment started", { deploymentId, userId });
logger.warn("Cache miss", { key });
logger.error("External service failed", { service: "GitHub", error: err.message });
```

Health: `GET /api/v1/health` — used by Docker HEALTHCHECK and monitoring.
Never log tokens, passwords, or encryption keys.

---

## 19. Performance Guidelines

**Frontend:** `next/image`, `next/font`, `dynamic()` for heavy dashboard components, `viewport={{ once: true }}` on all animations.

**Backend:** Redis cache before expensive DB/API calls, DataLoaders for N+1 risk, `select` to fetch only needed fields.

---

## 20. PR Checklist

- [ ] TypeScript compiles without errors
- [ ] ESLint passes with zero warnings
- [ ] Prettier formatting applied
- [ ] Tests written for new server logic
- [ ] No `console.log` (use `logger`)
- [ ] No hardcoded secrets
- [ ] `.env.example` updated if new env vars added
- [ ] `CLAUDE.md` updated if architecture decisions changed
- [ ] Commit messages follow convention

---

## 21. Onboarding (Local Dev Setup)

```bash
# 1. Clone
git clone https://github.com/your-org/deplo-ai.git && cd deplo-ai

# 2. Start infrastructure
docker compose up postgres redis -d

# 3. Server
cd server && npm install && cp .env.example .env
# Fill in GitHub OAuth, Vercel, Render credentials
npm run prisma:migrate && npm run dev  # → localhost:4000

# 4. Client (new terminal)
cd ../client && npm install && npm run dev  # → localhost:3000

# 5. GraphQL Playground: http://localhost:4000/graphql
# 6. API Docs (Swagger): http://localhost:4000/docs
```

---

## 22. Deployment

**Client (Vercel):** Push to `main` → auto-deploys. Set **`API_URL`** (server-only)
to the backend, e.g. `https://deplo-ai.onrender.com`. The browser calls
same-origin `/api/*`, which Vercel rewrites to `API_URL` (see §9.5). Do **not**
set `NEXT_PUBLIC_API_URL` for API wiring.

**Server (Render):** Push to `main` → auto-deploys. Render manages `DATABASE_URL`
and `REDIS_URL`. Set `ALLOWED_ORIGINS` (canonical frontend origin first),
`PUBLIC_URL` (the backend's own public URL, for webhooks/OAuth callbacks), and
`GITHUB_REDIRECT_URI=https://www.deplo.in/api/v1/auth/github/callback`
(frontend, proxied).

### Production request flow
```
User → https://www.deplo.in/api/* → Vercel rewrite → https://deplo-ai.onrender.com/api/*
```

---

_Last updated: 2026-07-09_

# Deploy API on Render

## Why the build failed

```
failed to read dockerfile: read .../server: is a directory
```

Render was told the **Dockerfile path is `server`** (a folder). It must point to the **file** `Dockerfile`.

## Fix in Render Dashboard

Open your Web Service → **Settings** → **Build & Deploy**:

| Setting | Correct value |
|---------|----------------|
| **Root Directory** | `server` |
| **Dockerfile Path** | `Dockerfile` |
| **Docker Build Context Directory** | `server` (or empty if root is already `server`) |

**Wrong:** Dockerfile Path = `server`  
**Right:** Dockerfile Path = `Dockerfile` (with Root Directory = `server`)

Or from repo root (no root dir):

| Setting | Value |
|---------|--------|
| Root Directory | *(empty)* |
| Dockerfile Path | `server/Dockerfile` |
| Docker Context | `server` |

## Environment variables (required)

Set in Render → **Environment**:

```env
NODE_ENV=production
DATABASE_URL=postgresql://...neon...?sslmode=require
REDIS_URL=rediss://...upstash...
JWT_SECRET=<64+ char secret>
ENCRYPTION_KEY=<64 hex chars>
GITHUB_CLIENT_ID=Iv1....
GITHUB_CLIENT_SECRET=...
GITHUB_REDIRECT_URI=https://deplo.ai.taj.works/api/v1/auth/github/callback
ALLOWED_ORIGINS=https://deplo.ai.taj.works
VERCEL_TOKEN=...
RENDER_API_KEY=...
```

`ALLOWED_ORIGINS` must list your frontend URL (first entry is used for OAuth redirect).

## Alternative: Node build (no Docker)

| Setting | Value |
|---------|--------|
| Runtime | Node |
| Root Directory | `server` |
| Build Command | `npm ci && npx prisma generate && npm run build` |
| Start Command | `npx prisma migrate deploy && npm start` |

## Health check

Path: `/api/v1/health`

## Logs

No registry setup needed — Render builds and hosts the image automatically.

Application logs are written to **stdout** (view in Render → Logs). Do not enable file logging in the container.

## Prisma on Render (Docker)

`schema.prisma` includes `binaryTargets = ["native", "debian-openssl-3.0.x"]` for the
`node:20-bookworm-slim` runtime. If you see a Query Engine mismatch after changing this,
trigger a **Clear build cache & deploy** on Render.

## After deploy

Set on Vercel (frontend):

```env
NEXT_PUBLIC_API_URL=https://deplo-api.onrender.com
API_URL=https://deplo-api.onrender.com
```

Replace with your actual Render service URL.

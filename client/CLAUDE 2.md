# CLAUDE.md

# deplo.ai

AI-powered deployment orchestration platform for developers.

---

# Project Vision

deplo.ai helps developers deploy production-ready applications without deep DevOps knowledge.

The platform connects to a user's GitHub repository, analyzes the codebase, detects the frontend/backend stack automatically, asks for required environment variables, deploys services to free-tier cloud platforms, and returns production-ready frontend/backend URLs.

The goal is to remove infrastructure complexity for:

* indie hackers
* startup founders
* students
* hackathon teams
* frontend-focused developers

Core philosophy:

> Code goes in. Production URL comes out.

---

# MVP Scope (STRICT)

The MVP should ONLY support:

## Supported Frontend Frameworks

* Next.js
* React (Vite/Create React App)

## Supported Backend Frameworks

* Express.js
* Node.js APIs
* Fastify

## Supported Languages

* JavaScript
* TypeScript

## Supported Platforms

### Frontend Deployment

* Vercel

### Backend Deployment

* Render

## Authentication Providers

* GitHub OAuth
* Vercel OAuth/API
* Render OAuth/API

---

# Important MVP Constraints

DO NOT BUILD:

* Kubernetes support
* Terraform generation
* AWS/GCP/Azure integrations
* Docker execution engine
* Multi-cloud orchestration
* AI agent frameworks everywhere
* Custom hosting infrastructure
* Full CI/CD pipelines
* Runtime container execution
* Serverless orchestration
* Infrastructure provisioning
* VM management
* Auto-scaling systems

This MVP is ONLY:

> Repo analysis + deployment orchestration on existing free-tier providers.

---

# Core User Flow

## Step 1 — User Login

User signs in with GitHub.

## Step 2 — Repository Selection

User selects:

* frontend repo
* backend repo
  OR monorepo

## Step 3 — Repo Analysis

The platform automatically detects:

* framework
* package manager
* build command
* output directory
* runtime
* ports
* env variable usage

## Step 4 — Environment Variables

The platform scans for:

* process.env
* import.meta.env
* dotenv usage
* config files

Then generates a required env variable form.

Example:

```env
DATABASE_URL=
JWT_SECRET=
OPENAI_API_KEY=
NEXT_PUBLIC_API_URL=
```

## Step 5 — Backend Deployment

Deploy backend to Render:

* create service
* connect GitHub repo
* set build/start commands
* inject env variables
* wait for deployment completion

Receive:

```txt
https://api-myapp.onrender.com
```

## Step 6 — Frontend Linking

Automatically inject backend URL into frontend env variables.

Example:

```env
NEXT_PUBLIC_API_URL=https://api-myapp.onrender.com
```

## Step 7 — Frontend Deployment

Deploy frontend to Vercel:

* create project
* connect repo
* inject env vars
* deploy

Receive:

```txt
https://myapp.vercel.app
```

## Step 8 — Return Final URLs

Dashboard shows:

* frontend production URL
* backend production URL
* deployment status
* logs

---

# Product Positioning

deplo.ai is NOT:

* a replacement for DevOps engineers
* a cloud provider
* a Kubernetes platform
* an infrastructure hosting company

It IS:

> an AI-powered deployment orchestration layer.

Primary positioning:

> Deploy fullstack apps without DevOps complexity.

Secondary positioning:

> Connect GitHub. Get production URLs.

---

# Brand Identity

## Brand Name

* deplo.ai

## Brand Personality

* modern
* minimal
* developer-first
* premium
* fast
* trustworthy
* AI-native
* infrastructure-focused

## Visual Direction

Inspired by:

* Linear
* Vercel
* Railway
* Render
* Stripe
* Raycast

The design language should feel:

* geometric
* minimal
* precise
* clean
* high-contrast
* developer-native

Avoid:

* childish gradients
* generic AI robots
* excessive glassmorphism
* cluttered dashboards

---

# Branding Assets

All branding assets are stored in:

```txt
/docs/branding
```

This includes:

* logo files
* icon-only variants
* favicon assets
* dark mode versions
* typography guidelines
* color palettes
* hero branding references

---

# Logo Direction

The deplo.ai logo represents:

* deployment flow
* orchestration
* cloud infrastructure
* automation
* AI-assisted deployment

Logo style:

* black typography
* minimal geometric icon
* premium SaaS aesthetic
* scalable favicon-friendly iconography

Preferred fonts:

* Geist Sans
* Inter

Preferred UI font:

* Geist Sans

Preferred mono font:

* Geist Mono

---

# Recommended Colors

## Light Theme

```txt
Background: #FFFFFF
Primary Text: #000000
Secondary Text: #64748B
Border: #E2E8F0
Accent Gradient: #00D2FF → #7928CA
```

## Dark Theme

```txt
Background: #030303
Primary Text: #F8FAFC
Secondary Text: #94A3B8
Accent Glow: #00F5D4
```

---

# Technical Architecture

## Frontend

Framework:

* Next.js

Styling:

* TailwindCSS
* shadcn/ui

Purpose:

* dashboard
* repo selection
* deployment status
* env variable forms
* onboarding

---

## Backend API

Preferred:

* Go

Alternative:

* Node.js

Responsibilities:

* OAuth handling
* repo analysis
* orchestration
* deployment management
* webhook handling
* status tracking

---

## AI/Analysis Layer

Preferred:

* Python

Responsibilities:

* repo analysis
* framework detection
* env detection
* heuristic analysis
* optional LLM fallback

IMPORTANT:
Do NOT rely entirely on LLMs.
Use deterministic heuristics first.

---

# Database

Preferred:

* PostgreSQL

Suggested provider:

* Supabase

Store:

* users
* OAuth tokens
* repos
* deployments
* logs
* deployment states
* env metadata

---

# Async Jobs

Deployments are asynchronous.

Required:

* Redis queues
  OR
* Inngest
  OR
* Trigger.dev

Never handle deployments directly in request-response lifecycle.

---

# Security Requirements

CRITICAL:

* Never ask for passwords
* Never store raw cloud credentials
* Use OAuth wherever possible
* Request minimum OAuth scopes
* Encrypt sensitive tokens
* Validate webhook signatures
* Avoid running arbitrary user code on platform servers

The platform should orchestrate deployments — NOT execute user applications.

---

# Repo Analysis Heuristics

Detect using:

* package.json
* dependencies
* lock files
* config files
* framework-specific files

Examples:

## Next.js

Detect:

* next.config.js
* dependency: next

## Vite

Detect:

* vite.config.ts
* dependency: vite

## Express

Detect:

* express dependency

## Fastify

Detect:

* fastify dependency

---

# Deployment Status States

Supported statuses:

* analyzing
* waiting_for_env
* deploying_backend
* backend_ready
* deploying_frontend
* completed
* failed

---

# Future Features (NOT MVP)

Potential future roadmap:

* Docker support
* Terraform/OpenTofu generation
* Cost estimation
* AI infra recommendations
* Multi-cloud deployments
* Railway support
* Supabase auto-creation
* Background workers
* Cron job support
* Kubernetes support
* Monitoring integrations
* One-click staging environments
* Production optimization suggestions

These are intentionally OUT OF SCOPE for V1.

---

# UX Philosophy

The experience should feel:

* instant
* magical
* low-friction
* developer-native
* trustworthy
* minimal

Avoid enterprise complexity.

The user should feel:

> “I connected GitHub and got production URLs in minutes.”

---

# Landing Page Messaging

Primary Hero:

> From Repo to Production URL.

Secondary Hero:

> Deploy fullstack apps without DevOps complexity.

Terminal-style demo:

```bash
$ deplo deploy --main

── Detecting Next.js frontend...
── Deploying to Vercel...
── Detecting Express backend...
── Deploying to Render...
── Syncing environment variables...

✔ Production URL Ready
```

---

# Maintenance Instructions

IMPORTANT:
This CLAUDE.md file must always remain updated as the project evolves.

Whenever:

* architecture changes
* new providers are added
* deployment flows change
* branding evolves
* APIs change
* stack decisions change
* folder structures change
* roadmap priorities shift
* security requirements change
* supported frameworks/providers expand

this document must also be updated immediately.

This file is the single source of truth for:

* product direction
* engineering decisions
* architecture
* branding
* deployment orchestration logic
* MVP constraints
* UX philosophy

All contributors, AI coding agents, and future developers should treat this document as the authoritative project context.

Always prefer updating this document rather than letting implementa

1. Simplicity over feature overload
2. Reliability over AI hype
3. Fast onboarding over customization
4. Minimal UI over enterprise dashboards
5. Smart defaults over endless configuration
6. Orchestration over infrastructure ownership
7. Developer trust above everything

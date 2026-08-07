import type { Metadata } from "next";
import {
  PageTitle,
  H2,
  H3,
  P,
  A,
  Code,
  Callout,
  Ul,
  Li,
  DocTable,
  Tr,
  Td,
} from "@/components/docs/primitives";
import { CodeBlock } from "@/components/docs/CodeBlock";

export const metadata: Metadata = {
  title: "Project Structure",
  description: "How the deplo.ai codebase is organized: client, server, CLI, and workers.",
};

export default function ProjectStructure() {
  return (
    <>
      <PageTitle lead="A map of the deplo.ai monorepo for contributors and the curious: where the dashboard, API, workers, detection engine, and CLI live, and the layering rules that keep them honest.">
        Project Structure
      </PageTitle>

      <P>
        deplo.ai is a monorepo with three deployable applications — the Next.js client, the Express server, and the npm
        CLI — plus shared CI workflows. The client deploys to Vercel, the server to Render, and the CLI publishes to
        npm as <Code>@deplo.ai/cli</Code>.
      </P>

      <CodeBlock
        language="text"
        title="deplo-ai/"
        code={`deplo-ai/
├── client/                      # Next.js 16 (App Router) — deploys to Vercel
│   ├── app/
│   │   ├── page.tsx             # Landing page
│   │   ├── dashboard/           # Repos, deployments, integrations, monitoring
│   │   ├── onboarding/          # Post-signup provider connection flow
│   │   ├── auth/                # OAuth callback handling
│   │   ├── cli-auth/            # Browser side of \`deplo login\`
│   │   └── docs/                # This documentation portal
│   ├── components/
│   │   ├── landing/  dashboard/  docs/  auth/  seo/  providers/
│   ├── lib/                     # auth.ts, dashboard-api.ts, docs/navigation.ts
│   └── next.config.ts           # Security headers + /api/* rewrite proxy
│
├── server/                      # Express + TypeScript API — deploys to Render
│   ├── prisma/                  # schema.prisma + migrations
│   └── src/
│       ├── config/              # Zod-validated env
│       ├── domain/              # Entities + repository interfaces (pure TS)
│       ├── application/
│       │   ├── services/        # Auth, Deployment, Integration, CliToken, …
│       │   ├── analysis/        # Stack-detection engine + Groq reasoning
│       │   ├── orchestration/   # DeploymentOrchestrator
│       │   └── notifications/   # Deployment lifecycle emails
│       ├── infrastructure/
│       │   ├── database/        # Prisma client + repository implementations
│       │   ├── queue/           # BullMQ: DeploymentWorker, MonitoringWorker
│       │   ├── redis/           # CacheService
│       │   ├── github/  vercel/  render/  groq/  email/   # external adapters
│       ├── interfaces/
│       │   ├── http/            # REST controllers + middleware
│       │   ├── graphql/         # Apollo schema, resolvers, context
│       │   └── swagger/         # OpenAPI spec (dev-only UI)
│       └── shared/              # Winston logger, AppError
│
├── cli/                         # @deplo.ai/cli — publishes to npm (bin: deplo)
│   └── src/
│       ├── commands/            # login, deploy, status, whoami, connect
│       ├── api.ts  config.ts  git.ts  handoff.ts  ui.ts
│
├── .github/workflows/           # ci.yml, pr-lint.yml, docker.yml, release-cli.yml
└── docker-compose.yml           # Local Postgres 16 + Redis 7`}
      />

      <H2>client/ — the web app</H2>
      <P>
        A single Next.js 16 application (React 19, TailwindCSS v4, TypeScript strict) containing the marketing landing
        page, the dashboard, onboarding, the <Code>/cli-auth</Code> hand-off page, and this docs portal. Server
        components are the default; <Code>&quot;use client&quot;</Code> appears only where browser APIs are required.
      </P>
      <P>
        The most architecturally important file is <Code>next.config.ts</Code>: its <Code>rewrites()</Code> proxy every{" "}
        <Code>/api/*</Code> request to the backend using the server-only <Code>API_URL</Code> variable, which is why
        the browser only ever sees one domain. There are no route handlers under <Code>app/api/</Code> — the client
        contains no API logic at all. See <A href="/docs/concepts/architecture">Architecture</A>.
      </P>
      <P>
        The docs portal itself follows a registry pattern: <Code>lib/docs/navigation.ts</Code> is the single source of
        truth for the page tree, and it drives the sidebar, breadcrumbs, prev/next links, search index, and sitemap.
        Adding a page means one entry there plus one <Code>page.tsx</Code>.
      </P>

      <H2>server/ — the API and workers</H2>
      <P>
        One Node.js 20 process serves the REST API (<Code>/api/v1</Code>), the GraphQL endpoint
        (<Code>/graphql</Code>), and runs the background workers. It follows strict clean architecture — each layer
        depends only inward:
      </P>
      <DocTable head={["Layer", "Responsibility", "Depends on"]}>
        <Tr>
          <Td mono>domain/</Td>
          <Td>Entities and repository interfaces. Pure TypeScript — no framework imports of any kind.</Td>
          <Td>Nothing</Td>
        </Tr>
        <Tr>
          <Td mono>application/</Td>
          <Td>Business logic: services, the detection engine, the deployment orchestrator, notifications.</Td>
          <Td mono>domain, shared</Td>
        </Tr>
        <Tr>
          <Td mono>infrastructure/</Td>
          <Td>Concrete tech: Prisma, Redis, BullMQ, and the GitHub/Vercel/Render/Groq/SMTP adapters.</Td>
          <Td mono>domain, application</Td>
        </Tr>
        <Tr>
          <Td mono>interfaces/</Td>
          <Td>Delivery: REST controllers, GraphQL resolvers, Swagger. Controllers route; services decide.</Td>
          <Td mono>application</Td>
        </Tr>
      </DocTable>
      <P>
        <Code>config/</Code> and <Code>shared/</Code> are usable by every layer. The composition root is{" "}
        <Code>src/index.ts</Code>: it connects Postgres and Redis, wires repositories → services → controllers by
        constructor injection, starts the BullMQ deployment worker and the five-minute monitoring scheduler, and mounts
        the Express app — one process, no DI framework, no service mesh.
      </P>

      <H3>Places worth reading first</H3>
      <Ul>
        <Li>
          <Code>application/analysis/</Code> — the detection engine: <Code>RepositoryAnalyzer</Code>,{" "}
          <Code>StructureAnalyzer</Code>, <Code>FrameworkDetector</Code> with its declarative{" "}
          <Code>frameworkSignatures.ts</Code>, <Code>EnvVarScanner</Code>, and <Code>GroqReasoningService</Code>. See{" "}
          <A href="/docs/concepts/architecture">Architecture</A> for how the pipeline fits together.
        </Li>
        <Li>
          <Code>application/orchestration/DeploymentOrchestrator.ts</Code> — the deployment state machine: analysis,
          backend-first deploy, URL wiring, failure diagnosis. Narrated in{" "}
          <A href="/docs/concepts/deployment-lifecycle">Deployment Lifecycle</A>.
        </Li>
        <Li>
          <Code>infrastructure/queue/</Code> — <Code>DeploymentQueue</Code> (job definitions),{" "}
          <Code>DeploymentWorker</Code> (retry semantics), <Code>MonitoringWorker</Code> (uptime probes).
        </Li>
        <Li>
          <Code>prisma/schema.prisma</Code> — the whole data model: users, repositories, deployments,{" "}
          <Code>ProviderConnection</Code>, CLI tokens, uptime samples.
        </Li>
      </Ul>

      <H2>cli/ — the terminal client</H2>
      <P>
        <Code>@deplo.ai/cli</Code> (v0.1.0, Node 20+, bin name <Code>deplo</Code>) is a thin client over the same REST
        API the dashboard uses — it holds no deployment logic of its own. <Code>commands/</Code> maps one file per
        command (<Code>login</Code>, <Code>deploy</Code>, <Code>status</Code>, <Code>whoami</Code>,{" "}
        <Code>connect</Code>); <Code>handoff.ts</Code> implements the loopback browser hand-off described in{" "}
        <A href="/docs/concepts/authentication">Authentication &amp; Security</A>; <Code>git.ts</Code> matches the
        current directory&apos;s GitHub remote to your synced repositories. Full usage in the{" "}
        <A href="/docs/cli">CLI docs</A>.
      </P>

      <H2>CI and local development</H2>
      <P>
        Four GitHub Actions workflows keep the monorepo honest: <Code>ci.yml</Code> (lint, type-check, test, build for
        client and server), <Code>pr-lint.yml</Code> (fast PR gate), <Code>docker.yml</Code> (Docker build
        verification), and <Code>release-cli.yml</Code> (publishing the CLI to npm). Locally,{" "}
        <Code>docker-compose.yml</Code> provides Postgres 16 and Redis 7:
      </P>
      <CodeBlock
        language="bash"
        title="local development"
        code={`$ docker compose up postgres redis -d

# server → http://localhost:4000  (REST /api/v1 · GraphQL /graphql · Swagger /docs)
$ cd server && npm install && cp .env.example .env
$ npm run prisma:migrate && npm run dev

# client → http://localhost:3000  (rewrites /api/* to 127.0.0.1:4000)
$ cd client && npm install && npm run dev`}
      />
      <Callout type="note">
        In development the backend also serves a Swagger UI at <Code>localhost:4000/docs</Code>; it is disabled in
        production, where this portal is the documentation surface.
      </Callout>

      <H2>Related pages</H2>
      <Ul>
        <Li>
          <A href="/docs/concepts/architecture">Architecture</A> — how these directories behave at runtime.
        </Li>
        <Li>
          <A href="/docs/concepts/deployment-lifecycle">Deployment Lifecycle</A> — the orchestrator end to end.
        </Li>
        <Li>
          <A href="/docs/api">API Reference</A> — the REST surface exposed by <Code>server/</Code>.
        </Li>
      </Ul>
    </>
  );
}

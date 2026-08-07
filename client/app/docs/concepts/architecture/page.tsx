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
  FlowDiagram,
} from "@/components/docs/primitives";
import { CodeBlock } from "@/components/docs/CodeBlock";

export const metadata: Metadata = {
  title: "Architecture",
  description: "Deep dive: clean architecture layers, queue system, detection engine, AI analysis.",
};

export default function Architecture() {
  return (
    <>
      <PageTitle lead="How deplo.ai is built: strict clean architecture on the server, a BullMQ job system for deployment work, a deterministic-first detection engine with a bounded AI fallback, and per-user encrypted provider credentials. This is the contributor-level view — for the gentler tour, start with the Architecture Overview.">
        Architecture
      </PageTitle>

      <P>
        If you have not read the <A href="/docs/getting-started/architecture-overview">Architecture Overview</A>, start
        there — this page assumes you know the cast of characters (dashboard, API, queue, worker, detection engine,
        provider adapters) and digs into how each is actually implemented.
      </P>

      <H2>The request path</H2>
      <P>
        The frontend (Vercel) and the backend (Render) live on different hosts, but users only ever see one domain.
        Every API call from the browser is same-origin; a Vercel rewrite defined in the client&apos;s{" "}
        <Code>next.config.ts</Code> proxies <Code>/api/*</Code> to the Render backend:
      </P>
      <FlowDiagram
        steps={[
          { label: "Browser", detail: "fetch(\"/api/v1/deployments\") — always same-origin" },
          { label: "www.deplo.in", detail: "Vercel edge — serves pages, rewrites /api/*" },
          { label: "Vercel rewrite proxy", detail: "next.config.ts rewrites() → server-only API_URL" },
          { label: "Render backend", detail: "Express — helmet, CORS allowlist, 200 req/15 min rate limit" },
          { label: "Controller → Service → Repository", detail: "clean architecture layers", accent: true },
        ]}
      />
      <Ul>
        <Li>
          The backend origin is a <strong>server-only</strong> environment variable (<Code>API_URL</Code>, no{" "}
          <Code>NEXT_PUBLIC_</Code> prefix) — it is never shipped to the browser.
        </Li>
        <Li>
          Because requests are same-origin, there are no CORS preflights in the browser; the backend&apos;s CORS
          allowlist is a secondary safeguard for direct access.
        </Li>
        <Li>
          Auth headers (<Code>Authorization: Bearer …</Code>) and 3xx redirects pass through the proxy verbatim, so
          OAuth callbacks flow back through the frontend domain untouched.
        </Li>
        <Li>
          Only inbound webhooks (GitHub, Vercel) bypass the proxy — external providers call the backend&apos;s own
          public URL directly.
        </Li>
      </Ul>

      <H2>Clean architecture layers</H2>
      <P>
        The server (<Code>server/src/</Code>) follows layered clean architecture with strictly enforced dependency
        rules. Each layer may only depend inward:
      </P>
      <DocTable head={["Layer", "Contents", "May depend on"]}>
        <Tr>
          <Td mono>domain/</Td>
          <Td>
            Pure entities and repository interfaces (<Code>User</Code>, <Code>Deployment</Code>,{" "}
            <Code>IDeploymentRepository</Code>, the <Code>Result</Code> type, analysis types)
          </Td>
          <Td>Nothing</Td>
        </Tr>
        <Tr>
          <Td mono>application/</Td>
          <Td>
            Use cases: services (<Code>AuthService</Code>, <Code>DeploymentService</Code>,{" "}
            <Code>IntegrationService</Code>, <Code>CliTokenService</Code>), the analysis engine, and the{" "}
            <Code>DeploymentOrchestrator</Code>
          </Td>
          <Td>
            <Code>domain</Code>, <Code>shared</Code> — no Prisma, no Redis, no Express
          </Td>
        </Tr>
        <Tr>
          <Td mono>infrastructure/</Td>
          <Td>
            Concrete implementations: Prisma repositories, Redis cache, BullMQ queue and workers, and the GitHub /
            Vercel / Render / Groq adapters
          </Td>
          <Td>
            <Code>domain</Code> and <Code>application</Code> interfaces
          </Td>
        </Tr>
        <Tr>
          <Td mono>interfaces/</Td>
          <Td>Delivery: Express controllers and middleware, the GraphQL schema and resolvers, Swagger</Td>
          <Td>
            <Code>application</Code> services — never <Code>infrastructure</Code> directly
          </Td>
        </Tr>
      </DocTable>
      <P>
        <Code>config/</Code> (Zod-validated environment) and <Code>shared/</Code> (logger, <Code>AppError</Code>) are
        usable by all layers. Everything is composed once at startup in <Code>server/src/index.ts</Code>: repositories
        are constructed over Prisma, services over repositories, controllers over services, and the worker over the
        orchestrator — plain constructor injection, no DI framework. The same services back both the REST API (mounted
        at <Code>/api/v1</Code>) and the GraphQL endpoint (<Code>/graphql</Code>).
      </P>

      <H2>The detection engine</H2>
      <P>
        Stack detection (<Code>server/src/application/analysis/</Code>) is a layered, evidence-scored pipeline.
        The guiding principle: <strong>never trust a single indicator</strong>. A framework is identified by a
        declarative signature — dependencies, config files, content patterns, and scripts, each weighted — not by the
        presence of one file.
      </P>
      <FlowDiagram
        steps={[
          { label: "RepoSnapshot", detail: "one cached git tree + lazy file reads — the repo is fetched once" },
          { label: "StructureAnalyzer", detail: "single | frontend-backend | monorepo (turbo / nx / workspaces)" },
          { label: "FrameworkDetector + LanguageDetector", detail: "weighted signatures → scored candidates" },
          { label: "ConfidenceEvaluator", detail: "0–1 confidence per component + escalation flag" },
          { label: "Groq AI fallback", detail: "only when confidence < 0.5 — bounded Layer 3" },
          { label: "Runtime / BuildCommand / DeploymentStrategy resolvers", detail: "versions, commands, provider preset" },
          { label: "RepositoryAnalysis", detail: "structure, components[], confidence, evidence", accent: true },
        ]}
      />
      <Ul>
        <Li>
          <strong>Weighted signatures.</strong> Every supported framework is data in{" "}
          <Code>frameworkSignatures.ts</Code>; scores normalize to a 0–1 confidence, and a meta-framework (Next.js)
          beats its base library (React) via priority. Adding a framework means adding a signature, not new control
          flow.
        </Li>
        <Li>
          <strong>Tree-driven.</strong> Structure and workspaces come from the full recursive git tree, so Python, Go,
          and <Code>apps/*</Code> monorepo layouts are seen — no filename guessing.
        </Li>
        <Li>
          <strong>Real commands.</strong> <Code>BuildCommandResolver</Code> reads the repo&apos;s own{" "}
          <Code>package.json</Code> scripts; Python start commands are derived from the detected app module (e.g.{" "}
          <Code>uvicorn main:app</Code> from <Code>app = FastAPI()</Code>); Go build targets come from the{" "}
          <Code>main.go</Code> / <Code>cmd/*</Code> layout.
        </Li>
        <Li>
          <strong>Centralized provider mapping.</strong> <Code>DeploymentStrategyResolver</Code> owns the framework →
          provider rules, so provider knowledge never leaks into the orchestrator.
        </Li>
        <Li>
          <strong>Env scanning.</strong> <Code>EnvVarScanner</Code> finds the variables your code actually reads and
          classifies them by scope (frontend, backend, shared) and required-ness — this drives the{" "}
          <A href="/docs/guides/environment-variables">environment variables</A> step.
        </Li>
      </Ul>

      <H3>Layer 3 — the Groq AI fallback</H3>
      <P>
        When deterministic confidence falls below <Code>0.5</Code>, the pipeline escalates to Groq
        (model <Code>openai/gpt-oss-120b</Code> by default). AI use is strictly bounded:{" "}
        <strong>at most two calls per deployment</strong>, ever.
      </P>
      <Ul>
        <Li>
          <strong>Call 1 — low-confidence analysis.</strong> <Code>reasonAboutRepository()</Code> sends the folder tree
          (at most 200 paths), key config files and small top-level source files (at most 25 files, 1.5&nbsp;KB each),
          dependency lists, and the deterministic evidence — never the whole repository. The response is constrained by
          a strict JSON schema with framework and language enums, so the model can only answer in canonical terms. Its
          corrections merge only when more confident than the deterministic result, and merged evidence is tagged{" "}
          <Code>ai:groq</Code>.
        </Li>
        <Li>
          <strong>Call 2 — failure diagnosis.</strong> <Code>diagnoseDeploymentFailure()</Code> fires once when a
          deployment fails, from the orchestrator&apos;s terminal failure path. See{" "}
          <A href="/docs/concepts/deployment-lifecycle">Deployment Lifecycle</A>.
        </Li>
      </Ul>
      <Callout type="ai" title="Graceful degradation">
        With no Groq keys configured the platform runs deterministic-only. If the model errors or times out, the
        deterministic result is kept — AI failure is never surfaced as a user-facing error. Results that used AI are
        marked with an <Code>aiUsed</Code> flag.
      </Callout>

      <H2>The queue system</H2>
      <P>
        All deployment work runs on BullMQ over Redis. The API enqueues; a worker (concurrency 5, in the same process
        today) executes. A deployment is two job phases with distinct, idempotent job IDs:
      </P>
      <CodeBlock
        language="text"
        title="queue: deployments"
        code={`analyze-<deploymentId>   →  orchestrator.runAnalysis()
                             detects stack, scans env vars
                             → WAITING_FOR_ENV (parked) or enqueue deploy

deploy-<deploymentId>    →  orchestrator.runDeploy()
                             backend → Render, frontend → Vercel, wire URLs`}
      />
      <Ul>
        <Li>
          Jobs default to 3 attempts with exponential backoff (5s base) — transient provider hiccups retry themselves.
        </Li>
        <Li>
          Errors that can never succeed — provider 4xx responses, missing configuration — are wrapped in an{" "}
          <Code>UnrecoverableError</Code> so BullMQ fails them immediately instead of retrying.
        </Li>
        <Li>
          Retries are safe because the orchestrator is idempotent: URLs from completed phases are preserved, and
          existing Render services / Vercel projects are found and reused, never blindly re-created.
        </Li>
      </Ul>
      <P>
        A second queue (<Code>monitoring</Code>) runs a BullMQ job scheduler: every five minutes it probes the live
        frontend and backend URLs of every project with a completed deployment (15s timeout, HTTP status below 500
        counts as up — free-tier cold starts are not false alarms), stores uptime samples, and prunes anything older
        than seven days. This powers <A href="/docs/guides/monitoring">Monitoring &amp; Analytics</A>.
      </P>

      <H2>Credentials and data</H2>
      <P>
        Every provider connection is per-user, stored in a single provider-agnostic <Code>ProviderConnection</Code>{" "}
        table with the credential AES-256-GCM encrypted at rest. Credentials are validated live against the provider
        <em> before</em> being stored (an invalid Render key is never saved), decrypted only inside the orchestrator at
        deploy time, and never returned by any API. There are no global platform hosting credentials — a deployment
        physically cannot land anywhere except your own accounts. Full details in{" "}
        <A href="/docs/concepts/authentication">Authentication &amp; Security</A>.
      </P>
      <Ul>
        <Li>
          <strong>PostgreSQL</strong> (Prisma) — users, repositories, deployments with logs, provider connections,
          CLI token hashes, uptime samples. All public IDs are <Code>cuid()</Code>s.
        </Li>
        <Li>
          <strong>Redis</strong> (ioredis) — BullMQ queues plus short-TTL caches: repository lists (300s), deployment
          status (30s), user profiles (3600s).
        </Li>
      </Ul>

      <H2>Related pages</H2>
      <Ul>
        <Li>
          <A href="/docs/concepts/deployment-lifecycle">Deployment Lifecycle</A> — the orchestrator&apos;s phases,
          every status, and failure handling.
        </Li>
        <Li>
          <A href="/docs/concepts/project-structure">Project Structure</A> — where all of this lives in the codebase.
        </Li>
        <Li>
          <A href="/docs/api">API Reference</A> — the REST surface the dashboard and CLI call.
        </Li>
      </Ul>
    </>
  );
}

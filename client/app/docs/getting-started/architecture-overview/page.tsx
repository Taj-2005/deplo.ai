import type { Metadata } from "next";
import {
  PageTitle,
  H2,
  P,
  A,
  Code,
  Callout,
  Ul,
  Li,
  FlowDiagram,
  CardGrid,
  DocCard,
} from "@/components/docs/primitives";

export const metadata: Metadata = {
  title: "Architecture Overview",
  description: "The moving parts: dashboard, API, queue, detection engine, and providers.",
};

export default function ArchitectureOverview() {
  return (
    <>
      <PageTitle lead="A high-level tour of what happens between you clicking Deploy and your app going live. Five moving parts, one important property: everything deploys into accounts you own.">
        Architecture Overview
      </PageTitle>

      <P>
        deplo.ai is a small number of clearly separated pieces: a dashboard, a REST API, a job queue with a worker, a
        stack-detection engine, and provider adapters that talk to Vercel and Render using <em>your</em> credentials.
        Here is the whole system on one diagram:
      </P>

      <FlowDiagram
        steps={[
          { label: "Dashboard / CLI", detail: "Next.js app on Vercel · deplo CLI in your terminal" },
          { label: "www.deplo.in/api/v1", detail: "same-origin — a Vercel rewrite proxies to the backend" },
          { label: "REST API", detail: "Express on Render — auth, validation, enqueue" },
          { label: "BullMQ queue", detail: "deployment jobs on Redis, processed by a worker" },
          { label: "Detection engine", detail: "deterministic analysis + bounded AI fallback" },
          { label: "Provider adapters", detail: "Vercel & Render APIs, using your own credentials" },
          { label: "Your accounts", detail: "frontend in your Vercel · backend in your Render", accent: true },
        ]}
      />

      <H2>The dashboard</H2>
      <P>
        The dashboard at <A href="https://www.deplo.in">www.deplo.in</A> is a Next.js application deployed on Vercel.
        It handles sign-in, repository browsing, the deploy flow, live logs, and per-project monitoring. It contains no
        API logic of its own — every action is a call to the REST API. The <A href="/docs/cli">deplo CLI</A> is a
        second client for exactly the same API, so anything the dashboard can do, the terminal can too.
      </P>

      <H2>The API and the rewrite proxy</H2>
      <P>
        The API is an Express application (TypeScript, clean architecture) running on Render. The browser never talks
        to it directly: it always calls same-origin <Code>/api/v1/…</Code> on <Code>www.deplo.in</Code>, and a Vercel
        rewrite forwards the request to the Render backend. One domain, no CORS preflights, and the backend host stays
        an implementation detail.
      </P>
      <P>
        Requests authenticate with a Bearer token — a 7-day JWT from GitHub OAuth, or a long-lived{" "}
        <Code>dpl_</Code> CLI token. Details in{" "}
        <A href="/docs/concepts/authentication">Authentication &amp; Security</A> and the{" "}
        <A href="/docs/api">API reference</A>.
      </P>

      <H2>The queue and the worker</H2>
      <P>
        Deployments are long-running, so the API never does the work in the request cycle. <Code>POST /deployments</Code>{" "}
        validates, creates a deployment record, enqueues a job on a BullMQ queue backed by Redis, and returns
        immediately. A worker picks the job up and drives the deployment through its phases while the dashboard polls
        for status and logs. Jobs retry transient failures with exponential backoff; provider errors that can never
        succeed (bad requests, missing configuration) fail fast instead of retrying.
      </P>

      <H2>The detection engine</H2>
      <P>
        The first phase of every deployment is analysis. The engine takes one snapshot of the repository tree and runs
        it through a layered, evidence-scored pipeline: structure analysis (single app, frontend + backend, or
        monorepo), weighted framework signatures, language detection, and resolvers for runtime, build commands, and
        deployment strategy. Detection is deterministic first; only when confidence is low does it escalate to a
        strictly bounded AI fallback (at most two model calls per deployment).
      </P>
      <Callout type="ai">
        The AI never overrides a confident deterministic result — it is a fallback for unusual repository layouts, and
        its suggestions merge only when they are more confident than what the deterministic pass found.
      </Callout>

      <H2>The provider adapters</H2>
      <P>
        The final phase talks to the hosting providers through dedicated adapters — one for Vercel, one for Render.
        Both act with credentials <em>you</em> connected (a Vercel OAuth token, a Render API key), stored AES-256-GCM
        encrypted per user and decrypted only at deploy time. There are no platform-level hosting credentials anywhere
        in the system:
      </P>
      <Ul>
        <Li>
          The backend deploys first, as a Render web service in your workspace (named like{" "}
          <Code>deplo-my-app-api</Code>).
        </Li>
        <Li>
          Its live URL is injected into the frontend build, which then deploys to your Vercel account (named like{" "}
          <Code>deplo-my-app-web</Code>).
        </Li>
        <Li>
          The backend receives <Code>FRONTEND_URL</Code> so your CORS configuration points at the real frontend origin.
        </Li>
      </Ul>
      <P>
        The exact order of operations, every status, and what happens on failure are covered in{" "}
        <A href="/docs/concepts/deployment-lifecycle">Deployment Lifecycle</A>.
      </P>

      <H2>Data stores</H2>
      <Ul>
        <Li>
          <strong>PostgreSQL</strong> (via Prisma) — users, repositories, deployments and their logs, encrypted
          provider connections, CLI token hashes, uptime samples.
        </Li>
        <Li>
          <strong>Redis</strong> — the BullMQ job queues plus caching (repository lists, deployment status, user
          profiles).
        </Li>
      </Ul>

      <H2>Going deeper</H2>
      <P>
        This page is deliberately shallow. When you want the internals — clean architecture layers and their dependency
        rules, the full detection pipeline with confidence scoring, queue retry semantics, and how credentials are
        encrypted — go to the deep dive:
      </P>
      <CardGrid>
        <DocCard
          href="/docs/concepts/architecture"
          title="Architecture (deep dive)"
          description="Clean architecture layers, queue system, detection engine, AI analysis."
        />
        <DocCard
          href="/docs/concepts/deployment-lifecycle"
          title="Deployment Lifecycle"
          description="Every state a deployment moves through, from repository to production URL."
        />
        <DocCard
          href="/docs/concepts/authentication"
          title="Authentication & Security"
          description="OAuth flows, JWTs, CLI tokens, credential encryption, and the trust model."
        />
        <DocCard
          href="/docs/api"
          title="API Reference"
          description="Base URL, authentication, versioning, rate limits, and error format."
        />
      </CardGrid>
    </>
  );
}

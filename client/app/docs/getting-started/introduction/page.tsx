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
  Pill,
  CardGrid,
  DocCard,
} from "@/components/docs/primitives";

export const metadata: Metadata = {
  title: "Introduction",
  description: "What deplo.ai does, why it exists, key features, and supported platforms.",
};

export default function Introduction() {
  return (
    <>
      <PageTitle lead="deplo.ai takes a GitHub repository, figures out what's in it, and deploys it to production — frontend to your Vercel account, backend to your Render workspace. Code goes in, production URLs come out.">
        Introduction
      </PageTitle>

      <P>
        deplo.ai is an AI-powered deployment orchestration platform for full-stack applications. You connect a GitHub
        repository; deplo.ai detects the stack (frameworks, monorepo layout, build commands, runtimes), asks for the
        environment variables your code actually reads, deploys the backend to Render and the frontend to Vercel, wires
        the two together, and hands back live production URLs. A typical full-stack deploy completes in a few minutes,
        with no YAML, no Dockerfiles, and no provider dashboards to configure.
      </P>
      <P>
        It is built for indie hackers, startups, students, and hackathon teams — anyone who wants the app live without
        first becoming a DevOps engineer.
      </P>

      <H2>Why deplo.ai exists</H2>
      <P>
        Most platforms that make deployment easy do it by hosting your app themselves. That is convenient on day one
        and a problem on day one hundred: your app, your domains, your usage data, and your bill all live inside
        someone else&apos;s platform, and moving out means re-deploying everything from scratch.
      </P>
      <P>
        deplo.ai takes the opposite position: it is an <em>orchestrator</em>, not a host. Deployments always run inside
        cloud accounts <em>you</em> own — the frontend lands in your Vercel dashboard like any project you created by
        hand, and the backend runs as a Render web service in your own workspace. There are no global platform
        credentials; every deployment uses your own provider credentials, stored AES-256-GCM encrypted per user.
      </P>
      <Ul>
        <Li>
          <strong>No lock-in.</strong> Disconnect deplo.ai at any time and your apps keep running — they were always
          yours. You can manage, scale, or delete them directly in Vercel and Render.
        </Li>
        <Li>
          <strong>No middleman on your traffic.</strong> Requests go straight to your Vercel and Render deployments.
          deplo.ai is not in the serving path.
        </Li>
        <Li>
          <strong>No surprise bills.</strong> deplo.ai is free during beta. You pay only for your own provider usage —
          and both Vercel and Render have free tiers that cover typical side projects.
        </Li>
      </Ul>
      <Callout type="note" title="Trust model">
        deplo.ai holds provider credentials so it can act on your behalf, encrypted at rest and revocable at any time.
        It never hosts your application. The full model is described in{" "}
        <A href="/docs/concepts/authentication">Authentication &amp; Security</A>.
      </Callout>

      <H2>Key features</H2>

      <H3>Automatic stack detection</H3>
      <P>
        A deterministic, evidence-scored detection engine reads your repository tree and identifies frameworks,
        languages, monorepo structure (turbo, nx, pnpm/npm/yarn workspaces), package managers, and build commands —
        from the files themselves, never guesswork on a single indicator. When confidence is low, a bounded AI fallback
        (strictly at most two model calls per deployment) reasons about the repository and corrects the result. See{" "}
        <A href="/docs/concepts/architecture">Architecture</A> for the full pipeline.
      </P>

      <H3>Environment variable wiring</H3>
      <P>
        The analyzer scans your source for the environment variables your code actually reads and marks which are
        required. Connection variables are wired automatically: the backend deploys first, its live URL is injected
        into the frontend build (<Code>NEXT_PUBLIC_API_URL</Code>, <Code>VITE_API_URL</Code>, and friends — whichever
        keys your code uses), and the backend receives <Code>FRONTEND_URL</Code> for CORS. You never have to provide a
        URL that does not exist yet. See <A href="/docs/guides/environment-variables">Environment Variables</A>.
      </P>

      <H3>AI failure diagnosis</H3>
      <P>
        When a deployment fails, deplo.ai runs one bounded AI analysis over the detected stack, the error, and the log
        tail. The diagnosis — likely cause, corrected build/start commands where applicable, and a recommendation — is
        appended to the deployment logs, and you receive an email with the same explanation plus a copy-paste fix
        prompt for your AI coding tool. Failures are a first-class experience, not a dead end.
      </P>

      <H3>Monitoring and analytics</H3>
      <P>
        Every deployed project gets uptime probes every five minutes, latency history, and per-project health — plus
        optional privacy-friendly product analytics via a one-line <Code>insights.js</Code> snippet. See{" "}
        <A href="/docs/guides/monitoring">Monitoring &amp; Analytics</A>.
      </P>

      <H3>A real CLI</H3>
      <P>
        The <A href="/docs/cli">deplo CLI</A> (<Code>@deplo.ai/cli</Code>, Node 20+) does the whole flow from the
        terminal: <Code>deplo login</Code> hands off to the browser once, then <Code>deplo</Code> deploys the repo in
        your current directory. Long-lived <Code>dpl_</Code> tokens make it work on headless machines and in CI.
      </P>

      <H2>Supported platforms</H2>
      <P>
        Frontends deploy to <strong>your Vercel account</strong>; backends deploy as web services in{" "}
        <strong>your Render workspace</strong>. Everything in the tables below is detected by the analysis engine;
        the status column shows what deploys end-to-end today.
      </P>

      <H3>Frontends → Vercel</H3>
      <DocTable head={["Framework", "Status"]}>
        <Tr>
          <Td>Next.js</Td>
          <Td><Pill variant="live" /></Td>
        </Tr>
        <Tr>
          <Td>React (Vite)</Td>
          <Td><Pill variant="live" /></Td>
        </Tr>
        <Tr>
          <Td>Vue</Td>
          <Td><Pill variant="live" /></Td>
        </Tr>
        <Tr>
          <Td>Nuxt</Td>
          <Td><Pill variant="live" /></Td>
        </Tr>
        <Tr>
          <Td>Astro</Td>
          <Td><Pill variant="live" /></Td>
        </Tr>
        <Tr>
          <Td>Svelte</Td>
          <Td><Pill variant="live" /></Td>
        </Tr>
        <Tr>
          <Td>SvelteKit</Td>
          <Td><Pill variant="live" /></Td>
        </Tr>
        <Tr>
          <Td>Remix</Td>
          <Td><Pill variant="live" /></Td>
        </Tr>
        <Tr>
          <Td>Gatsby</Td>
          <Td><Pill variant="live" /></Td>
        </Tr>
        <Tr>
          <Td>Angular</Td>
          <Td><Pill variant="live" /></Td>
        </Tr>
        <Tr>
          <Td>Static HTML</Td>
          <Td><Pill variant="live" /></Td>
        </Tr>
      </DocTable>

      <H3>Backends → Render</H3>
      <DocTable head={["Framework", "Language", "Status"]}>
        <Tr>
          <Td>Express</Td>
          <Td>JavaScript / TypeScript</Td>
          <Td><Pill variant="live" /></Td>
        </Tr>
        <Tr>
          <Td>Fastify</Td>
          <Td>JavaScript / TypeScript</Td>
          <Td><Pill variant="live" /></Td>
        </Tr>
        <Tr>
          <Td>FastAPI</Td>
          <Td>Python</Td>
          <Td><Pill variant="live" /></Td>
        </Tr>
        <Tr>
          <Td>Flask</Td>
          <Td>Python</Td>
          <Td><Pill variant="live" /></Td>
        </Tr>
        <Tr>
          <Td>Django</Td>
          <Td>Python</Td>
          <Td><Pill variant="live" /></Td>
        </Tr>
        <Tr>
          <Td>Go (net/http and frameworks)</Td>
          <Td>Go</Td>
          <Td><Pill variant="live" /></Td>
        </Tr>
        <Tr>
          <Td>NestJS</Td>
          <Td>TypeScript</Td>
          <Td><Pill variant="planned" /></Td>
        </Tr>
        <Tr>
          <Td>Hono</Td>
          <Td>JavaScript / TypeScript</Td>
          <Td><Pill variant="planned" /></Td>
        </Tr>
        <Tr>
          <Td>Koa</Td>
          <Td>JavaScript / TypeScript</Td>
          <Td><Pill variant="planned" /></Td>
        </Tr>
        <Tr>
          <Td>Spring Boot</Td>
          <Td>Java</Td>
          <Td><Pill variant="planned" /></Td>
        </Tr>
        <Tr>
          <Td>Bun runtime</Td>
          <Td>JavaScript / TypeScript</Td>
          <Td><Pill variant="planned" /></Td>
        </Tr>
      </DocTable>
      <P>
        Frameworks marked <Pill variant="planned" /> are already recognized by the detection engine with a correct
        deployment strategy, but are not yet enabled end-to-end. Repos containing them analyze fine; the unsupported
        component is reported honestly rather than deployed badly. Additional hosting providers (Railway, Cloudflare,
        Fly.io) are on the <A href="/docs/integrations/roadmap">provider roadmap</A>.
      </P>

      <H2>Where deplo.ai is going</H2>
      <P>
        The near-term direction is depth over breadth: push-to-deploy via GitHub webhooks, rollbacks{" "}
        <Pill variant="planned" />, the remaining backend frameworks above, and more hosting providers behind the same
        one-connection pattern. The constant is the model: deplo.ai orchestrates, you own everything it creates.
      </P>

      <H2>Next steps</H2>
      <CardGrid>
        <DocCard
          href="/docs/getting-started/quickstart"
          title="Quickstart"
          description="From GitHub sign-in to a live production URL in under ten minutes."
        />
        <DocCard
          href="/docs/getting-started/architecture-overview"
          title="Architecture Overview"
          description="The moving parts: dashboard, API, queue, detection engine, and providers."
        />
        <DocCard
          href="/docs/cli"
          title="deplo CLI"
          description="Install with npm, deploy from the terminal, automate in CI."
        />
        <DocCard
          href="/docs/faq"
          title="FAQ"
          description="Billing, providers, deployments, security, performance — answered."
        />
      </CardGrid>
    </>
  );
}

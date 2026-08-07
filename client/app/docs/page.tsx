import type { Metadata } from "next";
import { PageTitle, P, CardGrid, DocCard, H2 } from "@/components/docs/primitives";
import { CodeBlock } from "@/components/docs/CodeBlock";

export const metadata: Metadata = {
  title: "Documentation",
  description: "Everything you need to ship with deplo.ai — quickstart, guides, CLI and API reference.",
};

export default function DocsHome() {
  return (
    <>
      <PageTitle lead="deplo.ai deploys full-stack apps from a GitHub repository into cloud accounts you own — frontend to your Vercel, backend to your Render — with stack detection, environment wiring, and AI failure diagnosis built in. Code goes in. Production URL comes out.">
        Documentation
      </PageTitle>

      <CodeBlock
        title="the fastest path to production"
        language="bash"
        code={`$ npx @deplo.ai/cli login
$ cd your-project
$ npx @deplo.ai/cli
→ repo detected  github.com/you/your-app (main)
→ stack detected  frontend=Next.js · backend=Express
✓ backend live   https://deplo-your-app-api.onrender.com
✓ frontend live  https://deplo-your-app-web.vercel.app
● Deployed in 2:41`}
      />

      <H2>Start here</H2>
      <CardGrid>
        <DocCard
          href="/docs/getting-started/quickstart"
          title="Quickstart"
          description="GitHub sign-in to live production URL in under ten minutes, via the dashboard."
        />
        <DocCard
          href="/docs/cli"
          title="deplo CLI"
          description="Install the CLI and deploy from your terminal — or from CI."
        />
        <DocCard
          href="/docs/getting-started/introduction"
          title="What is deplo.ai?"
          description="The product, the own-your-accounts model, and what's supported today."
        />
        <DocCard
          href="/docs/guides/deployments"
          title="How deployments work"
          description="What happens between clicking Deploy and getting a URL."
        />
      </CardGrid>

      <H2>Dig deeper</H2>
      <CardGrid>
        <DocCard
          href="/docs/api"
          title="API Reference"
          description="The REST API behind the dashboard and CLI — endpoints, auth, and errors."
        />
        <DocCard
          href="/docs/integrations/github"
          title="Integrations"
          description="GitHub, Vercel, and Render — how each connection works and what it can access."
        />
        <DocCard
          href="/docs/concepts/architecture"
          title="Architecture"
          description="Detection engine, deployment queue, AI analysis, and the trust model."
        />
        <DocCard
          href="/docs/guides/troubleshooting"
          title="Troubleshooting"
          description="Failures explained: what happened, how to fix it, how to prevent it."
        />
      </CardGrid>

      <P>
        Can&apos;t find something? Press <kbd className="border border-ds-outline-variant px-1.5 py-0.5 text-[11px] font-mono">⌘K</kbd> to
        search every page, command, and endpoint.
      </P>
    </>
  );
}

import type { Metadata } from "next";
import { PageTitle, H2, H3, P, A, Code, Callout } from "@/components/docs/primitives";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Billing, providers, deployments, security, performance — answered.",
};

export default function Faq() {
  return (
    <>
      <PageTitle lead="Short answers to the questions we get most. If yours isn't here, email support@deplo.in.">
        Frequently Asked Questions
      </PageTitle>

      <H2>Billing &amp; accounts</H2>

      <H3>How much does deplo.ai cost?</H3>
      <P>
        deplo.ai is free while in beta. Your apps run on your own Vercel and Render accounts, so the only costs are
        whatever those providers charge you — and both have free tiers that comfortably run side projects and demos.
      </P>

      <H3>Do I need paid Vercel or Render plans?</H3>
      <P>
        No. Backends are created on Render&apos;s free plan by default, and frontends deploy to Vercel&apos;s Hobby tier. Free
        Render services sleep after inactivity and wake on the next request — upgrade the service in your own Render
        dashboard if you need always-on.
      </P>

      <H3>How do I delete my account?</H3>
      <P>
        Settings → Danger Zone. Because your apps live in your own provider accounts, deleting your deplo.ai account
        never takes a deployed site down — it only removes deplo.ai&apos;s access and data.
      </P>

      <H2>Providers</H2>

      <H3>Why do deployments go to my accounts instead of deplo.ai hosting them?</H3>
      <P>
        It&apos;s the core design decision: no lock-in. You keep the provider relationship, the URLs, the logs, the billing,
        and the ability to walk away. deplo.ai is the orchestration layer, not the host — if deplo.ai disappeared
        tomorrow, every deployed app would keep running untouched.
      </P>

      <H3>Can I use a custom domain?</H3>
      <P>
        Yes — on the provider&apos;s side. The Vercel project deplo.ai creates is a normal project in your account, so you
        add domains in your Vercel dashboard exactly as you would for any project. Same for Render.
      </P>

      <H3>Which providers are supported?</H3>
      <P>
        Vercel for frontends, Render for backends — today. See the{" "}
        <A href="/docs/integrations/roadmap">provider roadmap</A> for what may come next.
      </P>

      <H2>Deployments</H2>

      <H3>Which frameworks can I deploy?</H3>
      <P>
        Frontends: Next.js, React/Vite, Vue, Nuxt, Astro, Svelte, SvelteKit, Remix, Gatsby, Angular, and static HTML.
        Backends: Express, Fastify, FastAPI, Flask, Django, and Go. The full matrix with detection details is in the{" "}
        <A href="/docs/getting-started/introduction">introduction</A>.
      </P>

      <H3>How long does a deployment take?</H3>
      <P>
        Typically two to four minutes for a full-stack repo — dominated by the providers&apos; build times, not by
        deplo.ai. Backend-only or static deploys are faster.
      </P>

      <H3>Can I roll back to a previous deployment?</H3>
      <P>
        Not yet from deplo.ai — rollbacks are planned. Today you can roll back in the provider&apos;s own dashboard
        (Vercel keeps every deployment; Render keeps previous deploys), or redeploy an older commit.
      </P>

      <H3>Does deplo.ai deploy automatically when I push?</H3>
      <P>
        Yes — after a repository&apos;s first successful deployment, a webhook redeploys it on every push to the deployed
        branch, reusing the detected stack and env vars. For pipelines that need gating (tests before deploy, exit
        codes), run <A href="/docs/cli/ci">the CLI in CI</A> instead.
      </P>

      <H3>My deployment failed. Where do I start?</H3>
      <P>
        The deployment page shows the full log with an AI diagnosis — cause, affected file, fix — and the failure email
        includes a prompt you can paste into Cursor, Claude Code, or Copilot. Start at{" "}
        <A href="/docs/guides/troubleshooting">Troubleshooting</A>.
      </P>

      <H2>GitHub</H2>

      <H3>Why can&apos;t deplo.ai see my private repository?</H3>
      <P>
        OAuth sign-in covers identity and public repos; private repositories additionally require installing the deplo
        GitHub App on your account or org. The dashboard prompts you when it&apos;s needed — details in{" "}
        <A href="/docs/integrations/github">the GitHub integration docs</A>.
      </P>

      <H3>Does deplo.ai clone my whole repository?</H3>
      <P>
        No. Analysis reads the file tree and a bounded set of small config and source files through the GitHub API.
        Builds happen on the providers, which pull the repo themselves.
      </P>

      <H2>CLI</H2>

      <H3>Is the CLI different from the dashboard?</H3>
      <P>
        No — it&apos;s a thin client over the same API. Anything the CLI deploys shows up in the dashboard and vice versa.
        Install with <Code>npm i -g @deplo.ai/cli</Code>; see the <A href="/docs/cli">CLI docs</A>.
      </P>

      <H3>Why is the package @deplo.ai/cli and not deplo?</H3>
      <P>
        The bare <Code>deplo</Code> name on npm belongs to someone else. Always install{" "}
        <Code>@deplo.ai/cli</Code> — the installed command is still <Code>deplo</Code>.
      </P>

      <H2>Security</H2>

      <H3>How are my provider credentials stored?</H3>
      <P>
        Encrypted with AES-256-GCM at rest, validated before storage, never logged, never shown again after you enter
        them. Deployments run with your credentials against the providers&apos; APIs — deplo.ai holds no global deploy
        keys. Full details in <A href="/docs/concepts/authentication">Authentication &amp; Security</A>.
      </P>

      <H3>What can deplo.ai do with my Render API key?</H3>
      <P>
        Create and deploy web services in your workspace, set their environment variables, and read service metrics for
        monitoring. You can revoke the key in Render at any time; deplo.ai&apos;s copy becomes useless the moment you do.
      </P>

      <H3>Is the analytics script tracking my users?</H3>
      <P>
        The optional insights snippet is cookieless and anonymous: it records path and referrer with a visitor hash
        that rotates daily and honors Do&nbsp;Not&nbsp;Track. No cross-site tracking, no personal data. See{" "}
        <A href="/docs/guides/monitoring">Monitoring &amp; Analytics</A>.
      </P>

      <H2>Architecture &amp; performance</H2>

      <H3>Is AI making the deployment decisions?</H3>
      <P>
        Mostly no — detection is deterministic (weighted framework signatures over your repo tree) and AI is a bounded
        fallback: at most two model calls per deployment, used only when confidence is low or a failure needs
        diagnosing. A wrong AI answer can never break a working deterministic result.
      </P>

      <H3>Why is my backend slow on first request?</H3>
      <P>
        That&apos;s Render&apos;s free-plan cold start, not deplo.ai — free services sleep when idle. Upgrade the service plan in
        your Render dashboard for always-on.
      </P>

      <H3>Where does deplo.ai itself run?</H3>
      <P>
        The same way your apps do: the dashboard on Vercel, the API and workers on Render, Postgres and Redis as managed
        services. We deploy deplo.ai with deplo.ai where possible — the terminal on the landing page is a real deploy.
      </P>

      <Callout type="note" title="Still stuck?">
        <P>
          Email <A href="mailto:support@deplo.in">support@deplo.in</A> — include a deployment ID if it&apos;s about a
          specific deploy.
        </P>
      </Callout>
    </>
  );
}

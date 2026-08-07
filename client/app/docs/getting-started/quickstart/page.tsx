import type { Metadata } from "next";
import {
  PageTitle,
  H2,
  P,
  A,
  Code,
  Callout,
  Steps,
  Step,
  Ul,
  Li,
} from "@/components/docs/primitives";
import { CodeBlock } from "@/components/docs/CodeBlock";

export const metadata: Metadata = {
  title: "Quickstart",
  description: "From GitHub sign-in to a live production URL in under ten minutes.",
};

export default function Quickstart() {
  return (
    <>
      <PageTitle lead="This walkthrough takes a full-stack repository from GitHub sign-in to two live production URLs — the frontend in your Vercel account, the backend in your Render workspace. Ten minutes, no YAML.">
        Quickstart
      </PageTitle>

      <P>
        You&apos;ll need a <A href="https://github.com">GitHub</A> account with a repository to deploy, a free{" "}
        <A href="https://vercel.com">Vercel</A> account, and a free <A href="https://render.com">Render</A> account.
        deplo.ai deploys into accounts <em>you</em> own — it never hosts your app itself.
      </P>

      <Callout type="tip">
        Prefer the terminal? The <A href="/docs/cli">deplo CLI</A> does this entire flow with two commands:{" "}
        <Code>npx @deplo.ai/cli login</Code> and <Code>npx @deplo.ai/cli</Code>.
      </Callout>

      <H2>Deploy your first app</H2>
      <Steps>
        <Step title="Sign in with GitHub">
          <P>
            Go to <A href="https://www.deplo.in">deplo.in</A> and click <strong>Sign in with GitHub</strong>. Signing in
            creates your account — there is no separate registration step. deplo.ai requests repository access so it can
            read your repo&apos;s file tree during analysis and create deploy webhooks.
          </P>
        </Step>

        <Step title="Connect Vercel">
          <P>
            After sign-in you land on onboarding, which asks you to authorize the deplo.ai Vercel integration. This is a
            one-click OAuth flow — deplo.ai receives a token scoped to creating and deploying projects in your Vercel
            account, and stores it encrypted. Your frontend will appear in <em>your</em> Vercel dashboard like any other
            project.
          </P>
        </Step>

        <Step title="Connect Render">
          <P>
            Render has no third-party OAuth, so you connect it with a Personal API key: open{" "}
            <A href="https://dashboard.render.com/settings#api-keys">Render → Account Settings → API Keys</A>, create a
            key (it starts with <Code>rnd_</Code>), and paste it in{" "}
            <A href="https://www.deplo.in/dashboard/integrations">Dashboard → Integrations</A>. The key is validated
            live against the Render API before being stored encrypted — an invalid key is never saved.
          </P>
        </Step>

        <Step title="Pick a repository">
          <P>
            Open <A href="https://www.deplo.in/dashboard/repositories">Dashboard → Repositories</A>. Your GitHub repos
            sync automatically; hit <strong>Sync</strong> if a fresh one is missing. Private repositories additionally
            require installing the deplo GitHub App — the dashboard prompts you if it&apos;s needed.
          </P>
        </Step>

        <Step title="Analyze">
          <P>
            Click <strong>Deploy</strong> on a repository. deplo.ai reads the repo tree and detects the stack — frameworks,
            monorepo layout, build commands, runtimes — using a deterministic detection engine, with an AI fallback for
            unusual layouts. You&apos;ll see the detected frontend/backend and where each lives before anything deploys.
          </P>
        </Step>

        <Step title="Provide environment variables">
          <P>
            The analyzer scans your source for environment variables the code actually reads — not just{" "}
            <Code>.env.example</Code> — and marks which are required. Fill in the values; connection-wiring variables
            like <Code>NEXT_PUBLIC_API_URL</Code> and <Code>FRONTEND_URL</Code> are injected automatically, so you never
            provide URLs that don&apos;t exist yet.
          </P>
        </Step>

        <Step title="Deploy">
          <P>
            Confirm, and watch the live log. The backend deploys first to your Render workspace; its live URL is then
            wired into the frontend build, which deploys to your Vercel account. A typical full-stack deploy completes
            in two to four minutes.
          </P>
          <CodeBlock
            language="text"
            title="deployment log"
            code={`Analyzing repository…
Detected: frontend=Next.js (client/) · backend=Express (server/)
Deploying backend to Render…
Backend live: https://deplo-my-app-api.onrender.com
Injecting NEXT_PUBLIC_API_URL into frontend build
Deploying frontend to Vercel…
Frontend live: https://deplo-my-app-web.vercel.app
Deployment completed`}
          />
        </Step>

        <Step title="Verify and monitor">
          <P>
            Open the frontend URL — your app is live. From the deployment page, <strong>Project monitoring &amp;
            analytics</strong> gives you uptime, latency, and server CPU/memory for the new deployment, plus optional
            privacy-friendly product analytics via a one-line snippet. See{" "}
            <A href="/docs/guides/monitoring">Monitoring &amp; Analytics</A>.
          </P>
        </Step>
      </Steps>

      <H2>If the deployment fails</H2>
      <P>Failures are treated as a first-class experience, not a dead end:</P>
      <Ul>
        <Li>
          The deployment page shows the full log plus an <strong>AI diagnosis</strong>: the likely cause, the affected
          file, and a fix.
        </Li>
        <Li>
          You get an email with the same diagnosis and a copy-paste prompt for your AI coding tool (Cursor, Claude Code,
          Copilot) that describes the failure precisely.
        </Li>
        <Li>Fix, push, and hit Retry — the platform reuses the same providers&apos; services idempotently.</Li>
      </Ul>

      <H2>Redeploying</H2>
      <P>
        After the first successful deployment, pushing to the deployed branch triggers a redeploy automatically — a
        webhook is registered on your repository, and the previous configuration (detected stack, env vars) is reused so
        pushes go straight to deploy. You can also redeploy any time with one click in the dashboard or one{" "}
        <Code>deplo</Code> command; existing Vercel projects and Render services are reused idempotently.
      </P>

      <H2>Next steps</H2>
      <Ul>
        <Li>
          <A href="/docs/cli">Install the CLI</A> and deploy without opening the dashboard.
        </Li>
        <Li>
          <A href="/docs/guides/deployments">Understand the pipeline</A> — what deplo.ai does at each stage.
        </Li>
        <Li>
          <A href="/docs/guides/environment-variables">Master environment variables</A> — scopes, detection, wiring.
        </Li>
      </Ul>
    </>
  );
}

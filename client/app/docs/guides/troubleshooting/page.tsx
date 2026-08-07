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
} from "@/components/docs/primitives";
import { CodeBlock } from "@/components/docs/CodeBlock";

export const metadata: Metadata = {
  title: "Troubleshooting",
  description: "Common failures — OAuth, env vars, builds, deploys, API keys, webhooks — and their fixes.",
};

export default function Troubleshooting() {
  return (
    <>
      <PageTitle lead="The most common problems, each with why it happens, how to fix it, and how to avoid it next time. For CLI-specific issues (login loops, token errors, repo matching), see CLI Troubleshooting.">
        Troubleshooting
      </PageTitle>

      <Callout type="ai" title="AI fix prompt">
        When a deployment fails, the failure email includes an AI diagnosis of the likely cause <em>and</em> a
        copy-paste prompt for Cursor, Claude Code, or Copilot that contains everything needed to fix the repo —
        the detected stack, the error, and the relevant log tail. Pasting it into your AI coding tool is usually
        the fastest path to a fix.
      </Callout>

      <H2>GitHub sign-in fails</H2>
      <H3>Why it happens</H3>
      <P>
        When the OAuth exchange with GitHub fails, you are redirected back to the site with{" "}
        <Code>?auth=failed</Code> in the URL. Typical causes: the authorization was denied or timed out on
        GitHub&apos;s side, browser extensions or strict privacy settings blocked the redirect, or a stale
        session interfered with the callback.
      </P>
      <H3>How to fix</H3>
      <Ul>
        <Li>Retry the sign-in — transient OAuth failures are the most common case.</Li>
        <Li>Disable aggressive content/cookie blockers for <Code>deplo.in</Code> and <Code>github.com</Code>.</Li>
        <Li>Try a private window to rule out stale state, then sign in normally.</Li>
      </Ul>
      <H3>Prevention</H3>
      <P>
        Complete the GitHub authorization promptly when the popup appears, and keep <Code>deplo.in</Code> out of
        your blocker&apos;s strict list.
      </P>

      <H2>Private repositories not appearing</H2>
      <H3>Why it happens</H3>
      <P>
        OAuth sign-in covers listing and reading your public repositories. Private repositories additionally
        require installing the <strong>deplo GitHub App</strong>, which grants explicit per-repo access.
      </P>
      <H3>How to fix</H3>
      <P>
        Open <A href="https://www.deplo.in/dashboard/repositories">Dashboard → Repositories</A> — when a private
        repo needs the App, the dashboard shows an install prompt. Install the App, select the repositories you
        want deployable, then hit <strong>Sync</strong>.
      </P>
      <H3>Prevention</H3>
      <P>
        When installing the App, grant access to all repositories you plan to deploy (you can change the
        selection later in GitHub → Settings → Applications).
      </P>

      <H2>Build fails on the provider</H2>
      <H3>Why it happens</H3>
      <P>The two dominant causes are:</P>
      <Ul>
        <Li>
          <strong>Wrong root directory</strong> — the app lives in a subfolder the detection engine could not
          attribute (unusual layout, several apps in one folder).
        </Li>
        <Li>
          <strong>Missing or broken scripts</strong> — Node builds run your repo&apos;s own{" "}
          <Code>package.json</Code> scripts. If <Code>build</Code> or <Code>start</Code> is missing, broken, or
          depends on tools that only exist on your machine, the provider build fails.
        </Li>
      </Ul>
      <H3>How to fix</H3>
      <Ul>
        <Li>
          Open the deployment&apos;s log page — the full provider log is there, followed by the{" "}
          <strong>AI diagnosis</strong>: likely cause, suggested corrected build/start commands, and a
          recommendation.
        </Li>
        <Li>Use the fix prompt from the failure email in your AI coding tool, push the fix, and redeploy.</Li>
        <Li>
          Verify locally first: <Code>npm run build</Code> and <Code>npm start</Code> must work from a clean
          clone.
        </Li>
      </Ul>
      <H3>Prevention</H3>
      <P>
        Follow the layout and script conventions in <A href="/docs/guides/best-practices">Best Practices</A> —
        one app per folder, working <Code>build</Code>/<Code>start</Code> scripts, lockfile committed.
      </P>

      <H2>Deployment stuck in WAITING_FOR_ENV</H2>
      <H3>Why it happens</H3>
      <P>
        This is not an error — the analyzer found required environment variables with no value, parked the
        deployment, and emailed you the exact list of missing keys. Nothing deploys until they are provided.
      </P>
      <H3>How to fix</H3>
      <P>
        Provide the values on the deployment page (or via <Code>POST /api/v1/deployments/:id/env</Code>, or the
        CLI prompts). The deployment resumes immediately. If a variable is genuinely unused, remove the reference
        from your code — required-ness comes from what your code reads.
      </P>
      <H3>Prevention</H3>
      <P>
        Pre-fill values on the Configure step before deploying, or keep an up-to-date <Code>.env.example</Code>{" "}
        with safe defaults so fewer variables are strictly required. See{" "}
        <A href="/docs/guides/environment-variables">Environment Variables</A>.
      </P>

      <H2>Invalid Render API key</H2>
      <H3>Why it happens</H3>
      <P>
        Render keys are validated <strong>live</strong> against the Render API before being stored — an invalid
        key is rejected immediately and never saved. A key that worked before can also stop working if you
        revoked it in Render or deleted the workspace it belonged to.
      </P>
      <H3>How to fix</H3>
      <Ul>
        <Li>
          Create a fresh key in{" "}
          <A href="https://dashboard.render.com/settings#api-keys">Render → Account Settings → API Keys</A> — it
          starts with <Code>rnd_</Code>.
        </Li>
        <Li>
          Paste it in <A href="https://www.deplo.in/dashboard/integrations">Dashboard → Integrations</A> using
          the rotate flow — reconnecting with a new key replaces the old one.
        </Li>
      </Ul>
      <H3>Prevention</H3>
      <P>
        If you rotate keys in Render as routine hygiene, update the Integrations page in the same sitting —
        backend deploys and live server metrics both depend on it.
      </P>

      <H2>Vercel not connected</H2>
      <H3>Why it happens</H3>
      <P>
        Frontend deployments need the deplo.ai Vercel integration authorized on your account. If you skipped
        that onboarding step, or uninstalled the integration from your Vercel dashboard (deplo.ai detects the
        uninstall and marks the connection removed), deployments with a frontend fail with a &ldquo;connect
        Vercel&rdquo; error.
      </P>
      <H3>How to fix</H3>
      <P>
        Open <A href="https://www.deplo.in/dashboard/integrations">Dashboard → Integrations</A> and connect
        Vercel — it is a one-click OAuth flow. Backend-only repositories are unaffected; they deploy with Render
        alone.
      </P>
      <H3>Prevention</H3>
      <P>Complete both provider connections during onboarding, before your first full-stack deploy.</P>

      <H2>Deployment failed, but the old site is still up</H2>
      <H3>Why it happens</H3>
      <P>
        This is by design. A failed attempt never touches what is already serving traffic — the live URLs always
        belong to the latest <em>successful</em> deployment. So a red failed deploy and a perfectly healthy
        production site coexist.
      </P>
      <H3>How to fix</H3>
      <P>
        Open <strong>Project monitoring &amp; analytics</strong>: the latest-attempt banner shows the failed
        attempt and its error, while the uptime charts below confirm the previous successful deploy is still
        live. Fix the failure (see the AI diagnosis), redeploy, and the new version replaces the old one only
        when it completes. See <A href="/docs/guides/monitoring">Monitoring &amp; Analytics</A>.
      </P>
      <H3>Prevention</H3>
      <P>None needed — this is the safe failure mode. Just don&apos;t mistake the banner for an outage.</P>

      <H2>Rate limiting (HTTP 429)</H2>
      <H3>Why it happens</H3>
      <P>
        The API allows <strong>200 requests per 15 minutes per IP</strong>. Tight polling loops against{" "}
        <Code>GET /api/v1/deployments/:id</Code> — or CI jobs sharing one egress IP — can hit the limit.
      </P>
      <H3>How to fix</H3>
      <P>
        Back off and retry after the window resets. Responses include standard <Code>RateLimit-*</Code> headers
        that tell you the remaining quota and reset time.
      </P>
      <H3>Prevention</H3>
      <P>
        Poll deployment status at a few-second interval rather than in a hot loop — a full deploy takes minutes.
        The <A href="/docs/cli/commands">CLI</A> polls at a safe rate.
      </P>
      <CodeBlock
        language="http"
        title="rate-limited response"
        code={`HTTP/1.1 429 Too Many Requests
RateLimit-Limit: 200
RateLimit-Remaining: 0
RateLimit-Reset: 412`}
      />

      <H2>Still stuck?</H2>
      <Ul>
        <Li>
          <A href="/docs/cli/troubleshooting">CLI Troubleshooting</A> — login loops, token errors, repo matching.
        </Li>
        <Li>
          <A href="/docs/concepts/deployment-lifecycle">Deployment Lifecycle</A> — what every status means.
        </Li>
        <Li>
          <A href="/docs/faq">FAQ</A> — billing, providers, and security questions.
        </Li>
      </Ul>
    </>
  );
}

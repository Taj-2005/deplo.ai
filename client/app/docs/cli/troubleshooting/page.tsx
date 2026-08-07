import type { Metadata } from "next";
import {
  PageTitle,
  H2,
  P,
  A,
  Code,
  Callout,
} from "@/components/docs/primitives";
import { CodeBlock } from "@/components/docs/CodeBlock";

export const metadata: Metadata = {
  title: "Troubleshooting",
  description: "CLI-specific issues: login loops, token errors, repo matching, and connectivity.",
};

export default function CliTroubleshooting() {
  return (
    <>
      <PageTitle lead="Every CLI error message names its own fix — this page collects them with the cause behind each one. For deployment failures themselves (builds, env vars, provider errors), see the platform Troubleshooting guide.">
        Troubleshooting
      </PageTitle>

      <P>
        Platform-side failures — OAuth, builds, invalid API keys — are covered in{" "}
        <A href="/docs/guides/troubleshooting">Guides → Troubleshooting</A>. Below are the errors the CLI itself
        produces.
      </P>

      <H2>Authentication</H2>

      <CodeBlock language="text" code={`✗ not signed in — run deplo login`} />
      <P>
        <strong>Cause:</strong> no token found — neither the <Code>DEPLO_TOKEN</Code> environment variable nor{" "}
        <Code>~/.config/deplo/config.json</Code> has one. In non-interactive deploys the message reads{" "}
        <Code>✗ not signed in — run deplo login (or set DEPLO_TOKEN)</Code>.
        <br />
        <strong>Fix:</strong> run <Code>deplo login</Code>; in CI, set the <Code>DEPLO_TOKEN</Code> secret (see{" "}
        <A href="/docs/cli/ci">CI Usage</A>). Interactive <Code>deplo</Code> offers to sign you in inline.
      </P>

      <CodeBlock language="text" code={`✗ token expired or revoked — run deplo login`} />
      <P>
        <strong>Cause:</strong> the API returned 401 — the stored token was revoked at Settings → CLI tokens, or it
        was minted by a different deplo instance than the one <Code>DEPLO_API_URL</Code> now points at.
        <br />
        <strong>Fix:</strong> <Code>deplo login</Code> again. If you use <Code>DEPLO_API_URL</Code>, make sure the
        token and the API belong to the same instance (<A href="/docs/cli/configuration">Configuration</A>).
      </P>

      <CodeBlock
        language="text"
        code={`✗ that token was not accepted — create a new one at deplo.in → Settings → CLI tokens`}
      />
      <P>
        <strong>Cause:</strong> the token pasted to <Code>deplo login --token</Code> failed verification —
        truncated on copy, already revoked, or not a <Code>dpl_</Code> CLI token (a JWT from browser dev tools will
        not work).
        <br />
        <strong>Fix:</strong> create a fresh token at deplo.in → Settings → CLI tokens and paste it whole. The
        masked prompt (running <Code>--token</Code> without a value) avoids shell-history and quoting accidents.
      </P>

      <H2>Login hand-off</H2>

      <CodeBlock
        language="text"
        code={`✗ Timed out waiting for the browser (5 minutes). Try \`deplo login --token\` instead.`}
      />
      <P>
        <strong>Cause:</strong> the CLI&apos;s loopback listener never received the authorization callback — the
        authorize click never happened, or the browser runs somewhere that cannot reach the terminal&apos;s{" "}
        <Code>127.0.0.1</Code> (SSH session, container, remote dev box).
        <br />
        <strong>Fix:</strong> on the same machine, re-run and complete the authorization within five minutes. On
        remote machines the hand-off cannot work by design (the token is only ever delivered to loopback) — use{" "}
        <Code>deplo login --token</Code> (<A href="/docs/cli/authentication">Authentication</A>).
      </P>

      <P>
        <strong>The browser never opened.</strong> Opening is best-effort (<Code>open</Code> /{" "}
        <Code>xdg-open</Code> / <Code>start</Code>); on minimal Linux boxes there may be nothing to open with. The
        CLI prints the authorization URL first — <Code>→ opening https://www.deplo.in/cli-auth?…</Code> — so you
        can copy it into any local browser. If the browser is on a different machine, use{" "}
        <Code>deplo login --token</Code>, and <Code>deplo connect vercel --print-url</Code> for the Vercel
        authorization.
      </P>

      <H2>Repository matching</H2>

      <CodeBlock
        language="text"
        code={`✗ this directory has no GitHub remote — run inside a cloned repo, or deploy from the dashboard`}
      />
      <P>
        <strong>Cause:</strong> the current directory is not a git repository, or its <Code>origin</Code> remote
        does not point at <Code>github.com</Code>. The CLI resolves the repo from{" "}
        <Code>git remote get-url origin</Code>.
        <br />
        <strong>Fix:</strong> <Code>cd</Code> into the cloned repo, or add the remote:{" "}
        <Code>git remote add origin git@github.com:you/your-repo.git</Code>. Both SSH and HTTPS remote URLs work.
      </P>

      <CodeBlock
        language="text"
        code={`✗ acme/storefront is not visible to deplo
  private repo? install the GitHub App: deplo.in → dashboard → repositories → configure access`}
      />
      <P>
        <strong>Cause:</strong> the remote resolved to a repository the platform cannot see, even after the CLI
        auto-synced your repo list from GitHub. Usually a private repository not covered by the deplo GitHub App,
        or a repo owned by an organization you have not granted access for.
        <br />
        <strong>Fix:</strong> install or reconfigure the GitHub App from the dashboard&apos;s Repositories page so
        it covers the repo, then re-run <Code>deplo</Code>. Details in{" "}
        <A href="/docs/integrations/github">Integrations → GitHub</A>.
      </P>

      <H2>Provider connections</H2>

      <CodeBlock
        language="text"
        code={`✗ vercel is not connected — run deplo connect vercel
✗ render is not connected — run deplo connect render`}
      />
      <P>
        <strong>Cause:</strong> a non-interactive deploy (<Code>--yes</Code> or no TTY) found a provider missing.
        Interactively, <Code>deplo</Code> would have offered to connect it inline.
        <br />
        <strong>Fix:</strong> run the named command once from any terminal; connections are stored server-side, so
        CI picks them up immediately. <Code>deplo whoami</Code> shows the checklist.
      </P>

      <CodeBlock language="text" code={`✗ timed out waiting for the connection (5 minutes)`} />
      <P>
        <strong>Cause:</strong> <Code>deplo connect vercel</Code> polls until the integration appears; the
        authorization was never completed in the browser.
        <br />
        <strong>Fix:</strong> re-run and finish the OAuth flow. On a browserless machine, use{" "}
        <Code>deplo connect vercel --print-url</Code>, open the link anywhere, authorize, then confirm with{" "}
        <Code>deplo whoami</Code>.
      </P>

      <H2>Deployment failed</H2>

      <CodeBlock
        language="text"
        code={`✗ Deployment failed — build failed
  full log + AI diagnosis: deplo.in/dashboard/deployments/dep_8f31a2`}
      />
      <P>
        <strong>Cause:</strong> the deployment itself failed — the CLI already streamed the failing log lines (in
        red) above this message.
        <br />
        <strong>Fix:</strong> open the printed dashboard URL. The deployment page holds the full log plus the{" "}
        <strong>AI diagnosis</strong> — likely cause, affected file, suggested fix — and a copy-paste prompt for
        your AI coding tool. Fix, push, deploy again; services are reused idempotently. See{" "}
        <A href="/docs/guides/deployments">Deployments</A>.
      </P>

      <H2>Connectivity and base URL</H2>

      <CodeBlock
        language="text"
        code={`✗ fetch failed
✗ Request failed (404)`}
      />
      <P>
        <strong>Cause:</strong> the CLI could not reach the API, or reached the wrong one. Nine times out of ten a
        leftover <Code>DEPLO_API_URL</Code> (or an <Code>apiUrl</Code> in{" "}
        <Code>~/.config/deplo/config.json</Code>) points at a stopped local instance or omits the{" "}
        <Code>/api/v1</Code> path.
        <br />
        <strong>Fix:</strong> check <Code>echo $DEPLO_API_URL</Code> and the config file; unset the override or
        correct it to a full base like <Code>https://www.deplo.in/api/v1</Code>. Corporate proxies and captive
        networks can also block the request — try another network. Precedence rules are in{" "}
        <A href="/docs/cli/configuration">Configuration</A>.
      </P>

      <Callout type="tip" title="Still stuck?">
        <Code>deplo whoami</Code> is the fastest health check: it exercises the token, the API base URL, and both
        provider connections in one command.
      </Callout>
    </>
  );
}

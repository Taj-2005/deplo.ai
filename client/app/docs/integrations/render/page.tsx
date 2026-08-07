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
  title: "Render",
  description: "Connecting Render with a Personal API key and how backend services are created.",
};

export default function RenderIntegration() {
  return (
    <>
      <PageTitle lead="Backends deploy as web services in a Render workspace you own. Render has no third-party OAuth, so you connect it with a Personal API key — validated live against the Render API before it is ever stored.">
        Render
      </PageTitle>

      <H2>Why an API key instead of OAuth</H2>
      <P>
        Unlike Vercel, Render offers no third-party OAuth flow — there is no &ldquo;Authorize deplo.ai&rdquo; button
        to build on. The supported way for a tool to act on your behalf is a <strong>Personal API key</strong> created
        in your Render dashboard. deplo.ai treats that key with the same care as an OAuth token: validated before
        storage, encrypted at rest, and never shown again.
      </P>

      <H2>Connecting</H2>
      <Steps>
        <Step title="Create an API key on Render">
          <P>
            Open <A href="https://dashboard.render.com/settings#api-keys">dashboard.render.com → Account Settings →
            API Keys</A> and click <strong>Create API Key</strong>. Keys start with <Code>rnd_</Code>. Copy it now —
            Render only shows it once.
          </P>
        </Step>
        <Step title="Paste it into deplo.ai">
          <P>
            Go to <A href="https://www.deplo.in/dashboard/integrations">Dashboard → Integrations</A>, open the Render
            card&apos;s guided connect panel, and paste the key. From the terminal, the same flow is:
          </P>
          <CodeBlock
            language="bash"
            title="terminal"
            code={`$ deplo connect render
# prompts for the key, or pass it directly:
$ deplo connect render --key rnd_xxxxxxxxxxxx`}
          />
        </Step>
        <Step title="Live validation before storage">
          <P>
            The key is checked for the <Code>rnd_</Code> format, then validated with a live call to Render&apos;s{" "}
            <Code>GET /v1/owners</Code> endpoint. A key Render rejects — or one with no accessible workspaces — is
            refused and <strong>never persisted</strong>. On success, deplo.ai records your workspace (preferring
            your personal workspace over teams), encrypts the key with AES-256-GCM, and stores it in your per-user
            provider connection.
          </P>
        </Step>
      </Steps>

      <H2>What deplo.ai does with the key</H2>
      <P>The key is used only by the deployment pipeline and monitoring, always inside your own workspace:</P>
      <Ul>
        <Li>
          <strong>Creates or reuses web services</strong> — a redeploy finds the existing service by name instead of
          creating a duplicate, and monorepo backends get the correct root directory.
        </Li>
        <Li>
          <strong>Sets environment variables</strong> on the service — your values plus wiring like{" "}
          <Code>FRONTEND_URL</Code> for CORS.
        </Li>
        <Li>
          <strong>Triggers deploys and polls their status</strong> until the service is live (or fails, with logs).
        </Li>
        <Li>
          <strong>Reads CPU and memory metrics</strong> for the service to power{" "}
          <A href="/docs/guides/monitoring">per-project monitoring</A>.
        </Li>
      </Ul>
      <P>
        Services created by deplo.ai default to Render&apos;s <strong>free plan</strong> — you can upgrade any
        service from your own Render dashboard at any time, and deplo.ai will keep deploying to it. Like Vercel
        projects, these are ordinary services in your workspace: logs, scaling, custom domains, and billing all stay
        under your control on Render&apos;s side.
      </P>
      <Callout type="note">
        Free-plan services spin down when idle and cold-start on the next request. That&apos;s a Render plan
        behavior, not a deplo.ai limitation.
      </Callout>

      <H2>Key rotation</H2>
      <P>
        Rotation is just reconnecting: create a new key on Render, then connect again from the dashboard&apos;s
        Render card (Rotate) or with <Code>deplo connect render --key rnd_&lt;new&gt;</Code>. The new key goes
        through the same live validation and replaces the old one in place. Delete the old key on Render afterwards.
      </P>

      <H2>Security posture</H2>
      <Ul>
        <Li>Validated against the live Render API <strong>before</strong> anything is stored — invalid keys never touch the database.</Li>
        <Li>Encrypted at rest with AES-256-GCM in the per-user provider connection table.</Li>
        <Li>Never logged, and never echoed back by any API — <Code>GET /api/v1/integrations</Code> returns status and workspace name only.</Li>
        <Li>Shown in the dashboard forever after as a masked <Code>rnd_••••</Code>.</Li>
        <Li>Deployments run exclusively in your workspace — there are no platform-owned Render credentials.</Li>
      </Ul>

      <H2>Disconnecting</H2>
      <P>
        Disconnect from <A href="https://www.deplo.in/dashboard/integrations">Dashboard → Integrations</A> (with a
        confirmation step), which calls:
      </P>
      <CodeBlock
        language="http"
        title="disconnect Render"
        code={`DELETE /api/v1/integrations/render
Authorization: Bearer <token>

{ "disconnected": true }`}
      />
      <P>After disconnecting:</P>
      <Ul>
        <Li>
          New backend deployments fail fast with <em>&ldquo;Render account not connected&rdquo;</em> until you
          reconnect.
        </Li>
        <Li>Existing services keep running in your workspace, untouched.</Li>
        <Li>
          The connection is marked disconnected on deplo.ai&apos;s side — to revoke the key itself, delete it in{" "}
          <A href="https://dashboard.render.com/settings#api-keys">Render → Account Settings → API Keys</A>.
        </Li>
      </Ul>
      <Callout type="tip">
        Vercel-only repos (static sites, pure frontends) don&apos;t need Render — it&apos;s only required when a
        backend is detected. See <A href="/docs/guides/deployments">Deployments</A> for how the pipeline decides.
      </Callout>
    </>
  );
}

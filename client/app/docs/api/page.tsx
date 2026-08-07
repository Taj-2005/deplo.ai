import type { Metadata } from "next";
import {
  PageTitle,
  H2,
  P,
  A,
  Code,
  Callout,
  DocTable,
  Tr,
  Td,
  CardGrid,
  DocCard,
} from "@/components/docs/primitives";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ApiEndpoint } from "@/components/docs/ApiEndpoint";

export const metadata: Metadata = {
  title: "Overview",
  description: "Base URL, authentication, versioning, rate limits, and error format.",
};

export default function ApiOverview() {
  return (
    <>
      <PageTitle lead="Everything deplo.ai does — syncing repositories, starting deployments, streaming status, monitoring live apps — is exposed as a versioned REST API. The browser dashboard and the deplo CLI are both clients of the exact same endpoints documented here.">
        API Reference
      </PageTitle>

      <H2>Base URL</H2>
      <CodeBlock language="text" title="base url" code={`https://www.deplo.in/api/v1`} />
      <P>
        The version is part of the path (<Code>/api/v1</Code>). Breaking changes ship as a new version segment;{" "}
        <Code>v1</Code> is the current and only version. Requests to <Code>www.deplo.in</Code> are proxied same-origin
        to the backend, which is how the browser dashboard talks to this API without CORS — your integration hits the
        same URL.
      </P>

      <H2>Authentication</H2>
      <P>
        Every authenticated endpoint accepts a bearer token in the <Code>Authorization</Code> header. Two token types
        work interchangeably on every route:
      </P>
      <DocTable head={["Token", "Format", "Intended for"]}>
        <Tr>
          <Td mono>CLI token</Td>
          <Td mono>dpl_…</Td>
          <Td>
            API consumers, the CLI, and CI. Long-lived and revocable — create one in{" "}
            <A href="/docs/api/cli-tokens">Settings → CLI Tokens</A>.
          </Td>
        </Tr>
        <Tr>
          <Td mono>JWT</Td>
          <Td mono>eyJ…</Td>
          <Td>The browser dashboard. Issued by GitHub OAuth sign-in, expires after 7 days.</Td>
        </Tr>
      </DocTable>
      <P>
        If you are scripting against the API, use a CLI token — JWTs are session tokens for the dashboard. Your first
        request:
      </P>
      <CodeBlock
        language="bash"
        title="request"
        code={`curl https://www.deplo.in/api/v1/auth/me \\
  -H "Authorization: Bearer $DEPLO_TOKEN"`}
      />
      <CodeBlock
        language="json"
        title="response · 200"
        code={`{
  "userId": "cm5xa1b2c0001njk8w9d2f3g4",
  "email": "ada@example.com",
  "name": "Ada Lovelace",
  "githubLogin": "adalovelace",
  "avatarUrl": "https://avatars.githubusercontent.com/u/9919?v=4"
}`}
      />
      <P>
        See <A href="/docs/api/authentication">Authentication</A> for the OAuth endpoints and{" "}
        <A href="/docs/api/cli-tokens">CLI Tokens</A> for token management.
      </P>

      <H2>Errors</H2>
      <P>
        Errors return a JSON envelope with a machine-readable <Code>code</Code> and a human-readable{" "}
        <Code>message</Code>:
      </P>
      <CodeBlock
        language="json"
        title="error · 404"
        code={`{
  "error": {
    "code": "NOT_FOUND",
    "message": "Deployment not found"
  }
}`}
      />
      <P>
        Request-body validation failures (400) additionally include a <Code>details</Code> object with per-field
        issues, and a few inline guard errors return only <Code>message</Code>. Always branch on the HTTP status
        first, then on <Code>error.code</Code> when present.
      </P>
      <DocTable head={["Status", "Code", "Meaning"]}>
        <Tr>
          <Td mono>200 / 201 / 204</Td>
          <Td mono>—</Td>
          <Td>Success. 201 on resource creation, 204 on deletion with no body.</Td>
        </Tr>
        <Tr>
          <Td mono>400</Td>
          <Td mono>VALIDATION_ERROR</Td>
          <Td>Malformed request body or parameters.</Td>
        </Tr>
        <Tr>
          <Td mono>401</Td>
          <Td mono>UNAUTHORIZED</Td>
          <Td>Missing, malformed, expired, or revoked bearer token.</Td>
        </Tr>
        <Tr>
          <Td mono>403</Td>
          <Td mono>FORBIDDEN</Td>
          <Td>Authenticated, but the resource belongs to another user.</Td>
        </Tr>
        <Tr>
          <Td mono>404</Td>
          <Td mono>NOT_FOUND</Td>
          <Td>Resource does not exist (or is not visible to you).</Td>
        </Tr>
        <Tr>
          <Td mono>409</Td>
          <Td mono>CONFLICT</Td>
          <Td>The operation conflicts with current state (e.g. cancelling a completed deployment).</Td>
        </Tr>
        <Tr>
          <Td mono>429</Td>
          <Td mono>—</Td>
          <Td>Rate limit exceeded. Back off and retry after the window resets.</Td>
        </Tr>
        <Tr>
          <Td mono>500</Td>
          <Td mono>INTERNAL_ERROR</Td>
          <Td>Unexpected server error.</Td>
        </Tr>
        <Tr>
          <Td mono>502</Td>
          <Td mono>EXTERNAL_SERVICE_ERROR</Td>
          <Td>An upstream provider (GitHub, Vercel, Render) failed.</Td>
        </Tr>
      </DocTable>

      <H2>Rate limits</H2>
      <P>
        The API allows <strong>200 requests per 15 minutes per IP</strong> across all endpoints. Standard{" "}
        <Code>RateLimit-*</Code> response headers report your limit, remaining budget, and reset time. Exceeding the
        limit returns <Code>429</Code>. Polling a deployment every 2&ndash;3 seconds fits comfortably within the
        budget.
      </P>

      <H2>Health</H2>
      <ApiEndpoint
        method="GET"
        path="/api/v1/health"
        auth="public"
        description="Service health probe. Returns 200 when the database and Redis are reachable, 503 when degraded. No authentication required."
      >
        <CodeBlock
          language="bash"
          title="request"
          code={`curl https://www.deplo.in/api/v1/health`}
        />
        <CodeBlock
          language="json"
          title="response · 200"
          code={`{
  "status": "healthy",
  "version": "v1",
  "environment": "production",
  "checks": {
    "database": "ok",
    "redis": "ok"
  },
  "timestamp": "2026-08-07T09:15:04.512Z"
}`}
        />
      </ApiEndpoint>

      <H2>System endpoints</H2>
      <P>
        A few routes exist for machines, not API consumers: <Code>POST /webhooks/github</Code> and{" "}
        <Code>POST /webhooks/vercel</Code> receive signed provider webhooks, and{" "}
        <Code>GET /integrations/vercel/callback</Code> completes the browser-driven Vercel OAuth flow. They validate
        their own signatures or state tokens and are not meant to be called directly.
      </P>

      <Callout type="note">
        Public (unauthenticated) routes are <Code>/health</Code>, the GitHub OAuth pair under <Code>/auth</Code>, and
        the analytics beacon under <Code>/public</Code>. Everything else requires a bearer token.
      </Callout>

      <H2>Resources</H2>
      <CardGrid>
        <DocCard
          href="/docs/api/authentication"
          title="Authentication"
          description="GitHub OAuth endpoints, JWTs, CLI tokens, and the current-user endpoint."
        />
        <DocCard
          href="/docs/api/repositories"
          title="Repositories"
          description="List, sync, and analyze repositories."
        />
        <DocCard
          href="/docs/api/deployments"
          title="Deployments"
          description="Start deployments, poll status and logs, provide env vars, cancel."
        />
        <DocCard
          href="/docs/api/integrations"
          title="Integrations"
          description="Connection status, Vercel install URL, Render key connect/disconnect."
        />
        <DocCard
          href="/docs/api/monitoring"
          title="Monitoring & Analytics"
          description="Per-project health, uptime, server metrics, analytics, and the insights beacon."
        />
        <DocCard
          href="/docs/api/cli-tokens"
          title="CLI Tokens"
          description="Create, list, and revoke long-lived CLI tokens."
        />
      </CardGrid>
    </>
  );
}

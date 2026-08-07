import type { Metadata } from "next";
import { PageTitle, P, A, Code, Callout, DocTable, Tr, Td } from "@/components/docs/primitives";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ApiEndpoint } from "@/components/docs/ApiEndpoint";

export const metadata: Metadata = {
  title: "Integrations",
  description: "Connection status, Vercel install URL, Render key connect/disconnect.",
};

export default function ApiIntegrations() {
  return (
    <>
      <PageTitle lead="Integrations link your own Vercel and Render accounts to deplo.ai. Vercel connects via a browser OAuth flow; Render connects with a Personal API key. These endpoints report connection status and manage both — provider tokens and keys are stored encrypted and never returned by any endpoint.">
        Integrations
      </PageTitle>

      <ApiEndpoint
        method="GET"
        path="/api/v1/integrations"
        auth="bearer"
        description="Lists the connection status of every supported provider for the authenticated user. Always returns one entry per provider (VERCEL and RENDER); the metadata fields are null when a provider is not connected."
      >
        <DocTable head={["Field", "Type", "Description"]}>
          <Tr>
            <Td mono>provider</Td>
            <Td mono>string</Td>
            <Td>
              <Code>VERCEL</Code> or <Code>RENDER</Code>.
            </Td>
          </Tr>
          <Tr>
            <Td mono>connected</Td>
            <Td mono>boolean</Td>
            <Td>Whether the connection is active.</Td>
          </Tr>
          <Tr>
            <Td mono>accountName</Td>
            <Td mono>string | null</Td>
            <Td>Account name on the provider.</Td>
          </Tr>
          <Tr>
            <Td mono>teamName</Td>
            <Td mono>string | null</Td>
            <Td>Team/workspace name, if the connection is team-scoped.</Td>
          </Tr>
          <Tr>
            <Td mono>teamId</Td>
            <Td mono>string | null</Td>
            <Td>Provider team id; null for personal accounts.</Td>
          </Tr>
          <Tr>
            <Td mono>connectedAt</Td>
            <Td mono>string | null</Td>
            <Td>ISO timestamp of when the connection was created.</Td>
          </Tr>
        </DocTable>
        <CodeBlock
          language="bash"
          title="request"
          code={`curl https://www.deplo.in/api/v1/integrations \\
  -H "Authorization: Bearer $DEPLO_TOKEN"`}
        />
        <CodeBlock
          language="json"
          title="response · 200"
          code={`{
  "integrations": [
    {
      "provider": "VERCEL",
      "connected": true,
      "accountName": "adalovelace",
      "teamName": "acme-team",
      "teamId": "team_Fx3kP9qLm2Rv8sT1",
      "connectedAt": "2026-07-30T11:02:55.000Z"
    },
    {
      "provider": "RENDER",
      "connected": false,
      "accountName": null,
      "teamName": null,
      "teamId": null,
      "connectedAt": null
    }
  ]
}`}
        />
      </ApiEndpoint>

      <ApiEndpoint
        method="GET"
        path="/api/v1/integrations/vercel/install-url"
        auth="bearer"
        description="Returns the URL that starts the Vercel integration install flow for this user. Open the returned URL in a browser — Vercel handles authorization there. The optional returnTo query parameter controls where the browser lands afterwards: pass onboarding to return to onboarding; anything else returns to the integrations page. Returns 503 if the deployment has no public HTTPS URL configured."
      >
        <DocTable head={["Query param", "Type", "Description"]}>
          <Tr>
            <Td mono>returnTo</Td>
            <Td mono>string</Td>
            <Td>
              Optional. <Code>onboarding</Code> or <Code>integrations</Code> (default).
            </Td>
          </Tr>
        </DocTable>
        <CodeBlock
          language="bash"
          title="request"
          code={`curl "https://www.deplo.in/api/v1/integrations/vercel/install-url?returnTo=integrations" \\
  -H "Authorization: Bearer $DEPLO_TOKEN"`}
        />
        <CodeBlock
          language="json"
          title="response · 200"
          code={`{
  "url": "https://vercel.com/integrations/deplo-ai/new?state=eyJhbGciOiJIUzI1NiIs…"
}`}
        />
      </ApiEndpoint>

      <Callout type="note" title="Vercel OAuth callback">
        After the user authorizes on Vercel, Vercel redirects the browser to{" "}
        <Code>GET /api/v1/integrations/vercel/callback</Code> — a public system endpoint that identifies the user via
        a signed JWT in the <Code>state</Code> parameter, stores the connection, and redirects back to the dashboard.
        It is browser-driven and never called directly.
      </Callout>

      <ApiEndpoint
        method="DELETE"
        path="/api/v1/integrations/vercel"
        auth="bearer"
        description="Disconnects the user's Vercel integration."
      >
        <CodeBlock
          language="bash"
          title="request"
          code={`curl -X DELETE https://www.deplo.in/api/v1/integrations/vercel \\
  -H "Authorization: Bearer $DEPLO_TOKEN"`}
        />
        <CodeBlock
          language="json"
          title="response · 200"
          code={`{
  "disconnected": true
}`}
        />
      </ApiEndpoint>

      <ApiEndpoint
        method="POST"
        path="/api/v1/integrations/render"
        auth="bearer"
        description="Connects Render using a Personal API key (rnd_…). The key is validated live against the Render API before being stored encrypted — invalid keys are rejected and never persisted. The raw key is never logged and never echoed back."
      >
        <DocTable head={["Field", "Type", "Description"]}>
          <Tr>
            <Td mono>apiKey</Td>
            <Td mono>string</Td>
            <Td>
              Required. A Render Personal API key — see the{" "}
              <A href="/docs/integrations/render">Render integration guide</A>.
            </Td>
          </Tr>
        </DocTable>
        <CodeBlock
          language="bash"
          title="request"
          code={`curl -X POST https://www.deplo.in/api/v1/integrations/render \\
  -H "Authorization: Bearer $DEPLO_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"apiKey":"rnd_xxxxxxxxxxxxxxxxxxxx"}'`}
        />
        <CodeBlock
          language="json"
          title="response · 200"
          code={`{
  "connected": true,
  "accountName": "ada@example.com",
  "teamName": "Ada's Workspace",
  "connectedAt": "2026-08-07T09:20:13.000Z"
}`}
        />
        <CodeBlock
          language="json"
          title="response · 400"
          code={`{
  "error": {
    "message": "apiKey is required."
  }
}`}
        />
      </ApiEndpoint>

      <ApiEndpoint
        method="DELETE"
        path="/api/v1/integrations/render"
        auth="bearer"
        description="Disconnects the user's Render integration."
      >
        <CodeBlock
          language="bash"
          title="request"
          code={`curl -X DELETE https://www.deplo.in/api/v1/integrations/render \\
  -H "Authorization: Bearer $DEPLO_TOKEN"`}
        />
        <CodeBlock
          language="json"
          title="response · 200"
          code={`{
  "disconnected": true
}`}
        />
      </ApiEndpoint>

      <P>
        Deployments require both providers to be connected — the backend deploys to Render, the frontend to Vercel.
        See the <A href="/docs/integrations/vercel">Vercel</A> and <A href="/docs/integrations/render">Render</A>{" "}
        guides for the dashboard flows behind these endpoints.
      </P>
    </>
  );
}

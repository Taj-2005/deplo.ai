import type { Metadata } from "next";
import { PageTitle, P, A, Code, Callout, DocTable, Tr, Td } from "@/components/docs/primitives";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ApiEndpoint } from "@/components/docs/ApiEndpoint";

export const metadata: Metadata = {
  title: "CLI Tokens",
  description: "Create, list, and revoke long-lived CLI tokens.",
};

export default function ApiCliTokens() {
  return (
    <>
      <PageTitle lead="CLI tokens (dpl_…) are long-lived, revocable credentials for the deplo CLI, CI pipelines, and any script talking to this API. A token created here authenticates every endpoint in this reference, exactly like a dashboard JWT.">
        CLI Tokens
      </PageTitle>

      <P>
        Tokens never expire — they work until revoked. Only a SHA-256 hash is stored server-side, so the raw token is
        shown exactly once, at creation. The auth middleware recognises the <Code>dpl_</Code> prefix and resolves the
        owner by hash lookup instead of verifying a JWT; see{" "}
        <A href="/docs/api/authentication">Authentication</A> and the{" "}
        <A href="/docs/cli/authentication">CLI authentication guide</A>.
      </P>

      <ApiEndpoint
        method="POST"
        path="/api/v1/cli-tokens"
        auth="bearer"
        description="Creates a new CLI token. The response is the only time the raw token is ever returned — store it immediately. The name is trimmed and capped at 64 characters; an empty name returns 400 VALIDATION_ERROR."
      >
        <DocTable head={["Field", "Type", "Description"]}>
          <Tr>
            <Td mono>name</Td>
            <Td mono>string</Td>
            <Td>Required. A label to recognise the token by, e.g. the machine or pipeline it lives on.</Td>
          </Tr>
        </DocTable>
        <CodeBlock
          language="bash"
          title="request"
          code={`curl -X POST https://www.deplo.in/api/v1/cli-tokens \\
  -H "Authorization: Bearer $DEPLO_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"github-actions"}'`}
        />
        <CodeBlock
          language="json"
          title="response · 201"
          code={`{
  "id": "cm5xd6e7f0004njk8x2y3z4a5",
  "name": "github-actions",
  "token": "dpl_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "createdAt": "2026-08-07T09:24:37.000Z"
}`}
        />
        <CodeBlock
          language="json"
          title="response · 400"
          code={`{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Token name is required"
  }
}`}
        />
      </ApiEndpoint>

      <Callout type="warning" title="Shown once">
        The <Code>token</Code> value cannot be retrieved again — only its SHA-256 hash is persisted, so even a
        database leak never exposes usable credentials. If a token is lost, revoke it and create a new one.
      </Callout>

      <ApiEndpoint
        method="GET"
        path="/api/v1/cli-tokens"
        auth="bearer"
        description="Lists the authenticated user's tokens, newest first — names and usage metadata only, never the token value."
      >
        <DocTable head={["Field", "Type", "Description"]}>
          <Tr>
            <Td mono>id</Td>
            <Td mono>string</Td>
            <Td>Token id (cuid) — used to revoke.</Td>
          </Tr>
          <Tr>
            <Td mono>name</Td>
            <Td mono>string</Td>
            <Td>The label given at creation.</Td>
          </Tr>
          <Tr>
            <Td mono>lastUsedAt</Td>
            <Td mono>string | null</Td>
            <Td>When the token last authenticated a request; null if never used.</Td>
          </Tr>
          <Tr>
            <Td mono>createdAt</Td>
            <Td mono>string</Td>
            <Td>ISO creation timestamp.</Td>
          </Tr>
        </DocTable>
        <CodeBlock
          language="bash"
          title="request"
          code={`curl https://www.deplo.in/api/v1/cli-tokens \\
  -H "Authorization: Bearer $DEPLO_TOKEN"`}
        />
        <CodeBlock
          language="json"
          title="response · 200"
          code={`{
  "tokens": [
    {
      "id": "cm5xd6e7f0004njk8x2y3z4a5",
      "name": "github-actions",
      "lastUsedAt": "2026-08-07T08:59:02.000Z",
      "createdAt": "2026-08-07T09:24:37.000Z"
    },
    {
      "id": "cm5xd0a1b0003njk8m6n7o8p9",
      "name": "work-laptop",
      "lastUsedAt": null,
      "createdAt": "2026-08-01T14:12:20.000Z"
    }
  ]
}`}
        />
      </ApiEndpoint>

      <ApiEndpoint
        method="DELETE"
        path="/api/v1/cli-tokens/:id"
        auth="bearer"
        description="Revokes a token immediately — requests using it fail with 401 from the next call on. Returns 204 with no body, or 404 if the id does not exist or belongs to another user."
      >
        <CodeBlock
          language="bash"
          title="request"
          code={`curl -X DELETE https://www.deplo.in/api/v1/cli-tokens/cm5xd0a1b0003njk8m6n7o8p9 \\
  -H "Authorization: Bearer $DEPLO_TOKEN"`}
        />
        <CodeBlock language="http" title="response · 204" code={`HTTP/1.1 204 No Content`} />
      </ApiEndpoint>
    </>
  );
}

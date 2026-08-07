import type { Metadata } from "next";
import { PageTitle, H2, P, A, Code, Callout, DocTable, Tr, Td } from "@/components/docs/primitives";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ApiEndpoint } from "@/components/docs/ApiEndpoint";

export const metadata: Metadata = {
  title: "Deployments",
  description: "Start deployments, poll status and logs, provide env vars, cancel.",
};

export default function ApiDeployments() {
  return (
    <>
      <PageTitle lead="Deployments are asynchronous: starting one enqueues a background job and returns immediately with an id. You then poll the detail endpoint for status transitions, logs, and — on success — the live frontend and backend URLs.">
        Deployments
      </PageTitle>

      <H2>Deployment statuses</H2>
      <P>
        The <Code>status</Code> field on every deployment moves through this state machine (see the{" "}
        <A href="/docs/concepts/deployment-lifecycle">deployment lifecycle</A> for the full walkthrough):
      </P>
      <DocTable head={["Status", "Meaning"]}>
        <Tr>
          <Td mono>PENDING</Td>
          <Td>Queued, waiting for a worker.</Td>
        </Tr>
        <Tr>
          <Td mono>ANALYZING</Td>
          <Td>Reading the repo tree and detecting the stack.</Td>
        </Tr>
        <Tr>
          <Td mono>WAITING_FOR_ENV</Td>
          <Td>
            Paused — required env vars are missing. Provide them via{" "}
            <Code>POST /deployments/:id/env</Code> to resume.
          </Td>
        </Tr>
        <Tr>
          <Td mono>DEPLOYING_BACKEND</Td>
          <Td>Creating/deploying the Render web service.</Td>
        </Tr>
        <Tr>
          <Td mono>BACKEND_READY</Td>
          <Td>Backend is live; its URL is being wired into the frontend build.</Td>
        </Tr>
        <Tr>
          <Td mono>DEPLOYING_FRONTEND</Td>
          <Td>Building and deploying the frontend to Vercel.</Td>
        </Tr>
        <Tr>
          <Td mono>COMPLETED</Td>
          <Td>
            Success — <Code>frontendUrl</Code> / <Code>backendUrl</Code> are live.
          </Td>
        </Tr>
        <Tr>
          <Td mono>FAILED</Td>
          <Td>
            Terminal failure — <Code>error</Code> is set and the log tail includes an AI diagnosis.
          </Td>
        </Tr>
        <Tr>
          <Td mono>CANCELLED</Td>
          <Td>Cancelled by the user.</Td>
        </Tr>
      </DocTable>

      <Callout type="tip" title="Polling">
        Poll <Code>GET /deployments/:id</Code> until <Code>status</Code> is <Code>COMPLETED</Code>,{" "}
        <Code>FAILED</Code>, or <Code>CANCELLED</Code> — or until it parks at <Code>WAITING_FOR_ENV</Code>, which
        needs your input. The deplo CLI polls every 2.5 seconds; that cadence fits well within the{" "}
        <A href="/docs/api">rate limit</A>.
      </Callout>

      <ApiEndpoint
        method="GET"
        path="/api/v1/deployments"
        auth="bearer"
        description="Lists all deployments for the authenticated user as a JSON array, newest first. Logs and env metadata are omitted here — fetch the detail endpoint for those."
      >
        <DocTable head={["Field", "Type", "Description"]}>
          <Tr>
            <Td mono>id</Td>
            <Td mono>string</Td>
            <Td>Deployment id (cuid).</Td>
          </Tr>
          <Tr>
            <Td mono>repositoryId</Td>
            <Td mono>string</Td>
            <Td>The deployed repository&apos;s id.</Td>
          </Tr>
          <Tr>
            <Td mono>repositoryName</Td>
            <Td mono>string</Td>
            <Td>Repository name.</Td>
          </Tr>
          <Tr>
            <Td mono>repositoryFullName</Td>
            <Td mono>string</Td>
            <Td>
              <Code>owner/name</Code>.
            </Td>
          </Tr>
          <Tr>
            <Td mono>status</Td>
            <Td mono>string</Td>
            <Td>One of the statuses above.</Td>
          </Tr>
          <Tr>
            <Td mono>branch</Td>
            <Td mono>string</Td>
            <Td>Deployed branch.</Td>
          </Tr>
          <Tr>
            <Td mono>frontendUrl</Td>
            <Td mono>string | null</Td>
            <Td>Live Vercel URL once the frontend is deployed.</Td>
          </Tr>
          <Tr>
            <Td mono>backendUrl</Td>
            <Td mono>string | null</Td>
            <Td>Live Render URL once the backend is deployed.</Td>
          </Tr>
          <Tr>
            <Td mono>detectedStack</Td>
            <Td mono>object | null</Td>
            <Td>
              <Code>{"{ frontend, backend }"}</Code> as human-readable labels (e.g. &ldquo;Next.js&rdquo;,
              &ldquo;Express.js&rdquo;), each nullable. Null until analysis completes.
            </Td>
          </Tr>
          <Tr>
            <Td mono>createdAt / updatedAt</Td>
            <Td mono>string</Td>
            <Td>ISO timestamps.</Td>
          </Tr>
          <Tr>
            <Td mono>duration</Td>
            <Td mono>number | null</Td>
            <Td>Total seconds from creation to completion; null while in progress.</Td>
          </Tr>
        </DocTable>
        <CodeBlock
          language="bash"
          title="request"
          code={`curl https://www.deplo.in/api/v1/deployments \\
  -H "Authorization: Bearer $DEPLO_TOKEN"`}
        />
        <CodeBlock
          language="json"
          title="response · 200"
          code={`[
  {
    "id": "cm5xc4d5e0003njk8t8u9v0w1",
    "repositoryId": "cm5xb2c3d0002njk8p4q5r6s7",
    "repositoryName": "acme-shop",
    "repositoryFullName": "adalovelace/acme-shop",
    "status": "COMPLETED",
    "branch": "main",
    "frontendUrl": "https://deplo-acme-shop-web.vercel.app",
    "backendUrl": "https://deplo-acme-shop-api.onrender.com",
    "detectedStack": { "frontend": "Next.js", "backend": "Express.js" },
    "createdAt": "2026-08-06T18:30:02.000Z",
    "updatedAt": "2026-08-06T18:33:11.000Z",
    "duration": 189
  }
]`}
        />
      </ApiEndpoint>

      <ApiEndpoint
        method="POST"
        path="/api/v1/deployments"
        auth="bearer"
        description="Starts a deployment for a repository: creates the deployment record, enqueues the orchestration job, and returns 201 immediately. Pass envVars up front to avoid a WAITING_FOR_ENV pause when you already know the values."
      >
        <DocTable head={["Field", "Type", "Description"]}>
          <Tr>
            <Td mono>repositoryId</Td>
            <Td mono>string</Td>
            <Td>
              Required. A repository id from <A href="/docs/api/repositories">GET /repos</A>.
            </Td>
          </Tr>
          <Tr>
            <Td mono>envVars</Td>
            <Td mono>array</Td>
            <Td>
              Optional. Pre-filled variables as <Code>{"[{ key, value }]"}</Code>.
            </Td>
          </Tr>
        </DocTable>
        <CodeBlock
          language="bash"
          title="request"
          code={`curl -X POST https://www.deplo.in/api/v1/deployments \\
  -H "Authorization: Bearer $DEPLO_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"repositoryId":"cm5xb2c3d0002njk8p4q5r6s7","envVars":[{"key":"DATABASE_URL","value":"postgres://…"}]}'`}
        />
        <CodeBlock
          language="json"
          title="response · 201"
          code={`{
  "deploymentId": "cm5xc4d5e0003njk8t8u9v0w1",
  "status": "PENDING"
}`}
        />
        <CodeBlock
          language="json"
          title="response · 400"
          code={`{
  "error": {
    "message": "Invalid request body",
    "details": {
      "formErrors": [],
      "fieldErrors": { "repositoryId": ["String must contain at least 1 character(s)"] }
    }
  }
}`}
        />
      </ApiEndpoint>

      <ApiEndpoint
        method="GET"
        path="/api/v1/deployments/:id"
        auth="bearer"
        description="Fetches a single deployment with its full log stream, error (if any), and detected env variable metadata. This is the endpoint to poll while a deployment runs."
      >
        <DocTable head={["Field", "Type", "Description"]}>
          <Tr>
            <Td mono>envVariables[]</Td>
            <Td mono>array</Td>
            <Td>
              Detected variables as <Code>{"[{ key, isRequired }]"}</Code> — values are never returned.
            </Td>
          </Tr>
          <Tr>
            <Td mono>logs</Td>
            <Td mono>string[]</Td>
            <Td>Ordered log lines, appended live as the deployment progresses.</Td>
          </Tr>
          <Tr>
            <Td mono>error</Td>
            <Td mono>string | null</Td>
            <Td>
              Failure summary when <Code>status</Code> is <Code>FAILED</Code>.
            </Td>
          </Tr>
        </DocTable>
        <P>All other fields match the list shape above.</P>
        <CodeBlock
          language="bash"
          title="request"
          code={`curl https://www.deplo.in/api/v1/deployments/cm5xc4d5e0003njk8t8u9v0w1 \\
  -H "Authorization: Bearer $DEPLO_TOKEN"`}
        />
        <CodeBlock
          language="json"
          title="response · 200"
          code={`{
  "id": "cm5xc4d5e0003njk8t8u9v0w1",
  "repositoryId": "cm5xb2c3d0002njk8p4q5r6s7",
  "repositoryName": "acme-shop",
  "repositoryFullName": "adalovelace/acme-shop",
  "status": "WAITING_FOR_ENV",
  "branch": "main",
  "frontendUrl": null,
  "backendUrl": null,
  "detectedStack": { "frontend": "Next.js", "backend": "Express.js" },
  "envVariables": [
    { "key": "DATABASE_URL", "isRequired": true },
    { "key": "STRIPE_SECRET_KEY", "isRequired": true }
  ],
  "logs": [
    "Analyzing repository…",
    "Detected: frontend=Next.js (client/) · backend=Express (server/)",
    "Waiting for required environment variables: DATABASE_URL, STRIPE_SECRET_KEY"
  ],
  "error": null,
  "createdAt": "2026-08-06T18:30:02.000Z",
  "updatedAt": "2026-08-06T18:30:19.000Z",
  "duration": null
}`}
        />
      </ApiEndpoint>

      <ApiEndpoint
        method="POST"
        path="/api/v1/deployments/:id/env"
        auth="bearer"
        description="Provides environment variable values for a deployment paused in WAITING_FOR_ENV, then resumes it. Returns the deployment id and its new status."
      >
        <DocTable head={["Field", "Type", "Description"]}>
          <Tr>
            <Td mono>envVars</Td>
            <Td mono>array</Td>
            <Td>
              Required. <Code>{"[{ key, value }]"}</Code> for the missing variables.
            </Td>
          </Tr>
        </DocTable>
        <CodeBlock
          language="bash"
          title="request"
          code={`curl -X POST https://www.deplo.in/api/v1/deployments/cm5xc4d5e0003njk8t8u9v0w1/env \\
  -H "Authorization: Bearer $DEPLO_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"envVars":[{"key":"DATABASE_URL","value":"postgres://…"},{"key":"STRIPE_SECRET_KEY","value":"sk_live_…"}]}'`}
        />
        <CodeBlock
          language="json"
          title="response · 200"
          code={`{
  "deploymentId": "cm5xc4d5e0003njk8t8u9v0w1",
  "status": "PENDING"
}`}
        />
      </ApiEndpoint>

      <ApiEndpoint
        method="DELETE"
        path="/api/v1/deployments/:id"
        auth="bearer"
        description="Cancels an in-progress deployment. Returns the deployment id and its resulting status. Cancelling a deployment that already reached a terminal state returns 409 CONFLICT."
      >
        <CodeBlock
          language="bash"
          title="request"
          code={`curl -X DELETE https://www.deplo.in/api/v1/deployments/cm5xc4d5e0003njk8t8u9v0w1 \\
  -H "Authorization: Bearer $DEPLO_TOKEN"`}
        />
        <CodeBlock
          language="json"
          title="response · 200"
          code={`{
  "deploymentId": "cm5xc4d5e0003njk8t8u9v0w1",
  "status": "CANCELLED"
}`}
        />
      </ApiEndpoint>
    </>
  );
}

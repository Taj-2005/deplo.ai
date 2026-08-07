import type { Metadata } from "next";
import { PageTitle, A, Code, Callout, DocTable, Tr, Td } from "@/components/docs/primitives";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ApiEndpoint } from "@/components/docs/ApiEndpoint";

export const metadata: Metadata = {
  title: "Repositories",
  description: "List, sync, and analyze repositories.",
};

export default function ApiRepositories() {
  return (
    <>
      <PageTitle lead="Repositories are synced from your GitHub account and are the unit everything else hangs off: deployments target a repository id, and monitoring is grouped per repository. These endpoints list them, force a fresh sync, and run stack analysis without deploying.">
        Repositories
      </PageTitle>

      <ApiEndpoint
        method="GET"
        path="/api/v1/repos"
        auth="bearer"
        description="Lists the authenticated user's synced repositories as a JSON array, most recently updated first."
      >
        <DocTable head={["Field", "Type", "Description"]}>
          <Tr>
            <Td mono>id</Td>
            <Td mono>string</Td>
            <Td>Repository id (cuid) — use this for deployments and analysis.</Td>
          </Tr>
          <Tr>
            <Td mono>name</Td>
            <Td mono>string</Td>
            <Td>Repository name.</Td>
          </Tr>
          <Tr>
            <Td mono>fullName</Td>
            <Td mono>string</Td>
            <Td>
              <Code>owner/name</Code> as on GitHub.
            </Td>
          </Tr>
          <Tr>
            <Td mono>isPrivate</Td>
            <Td mono>boolean</Td>
            <Td>Whether the repo is private on GitHub.</Td>
          </Tr>
          <Tr>
            <Td mono>defaultBranch</Td>
            <Td mono>string</Td>
            <Td>Branch that gets analyzed and deployed.</Td>
          </Tr>
          <Tr>
            <Td mono>updatedAt</Td>
            <Td mono>string</Td>
            <Td>ISO timestamp of the last update.</Td>
          </Tr>
          <Tr>
            <Td mono>language</Td>
            <Td mono>string | null</Td>
            <Td>Primary language reported by GitHub.</Td>
          </Tr>
          <Tr>
            <Td mono>description</Td>
            <Td mono>string | null</Td>
            <Td>GitHub repository description.</Td>
          </Tr>
          <Tr>
            <Td mono>url</Td>
            <Td mono>string</Td>
            <Td>The repository&apos;s GitHub page.</Td>
          </Tr>
        </DocTable>
        <CodeBlock
          language="bash"
          title="request"
          code={`curl https://www.deplo.in/api/v1/repos \\
  -H "Authorization: Bearer $DEPLO_TOKEN"`}
        />
        <CodeBlock
          language="json"
          title="response · 200"
          code={`[
  {
    "id": "cm5xb2c3d0002njk8p4q5r6s7",
    "name": "acme-shop",
    "fullName": "adalovelace/acme-shop",
    "isPrivate": true,
    "defaultBranch": "main",
    "updatedAt": "2026-08-06T18:22:41.000Z",
    "language": "TypeScript",
    "description": "Full-stack storefront (Next.js + Express)",
    "url": "https://github.com/adalovelace/acme-shop"
  }
]`}
        />
      </ApiEndpoint>

      <ApiEndpoint
        method="POST"
        path="/api/v1/repos/sync"
        auth="bearer"
        description="Forces a fresh repository sync from GitHub, bypassing the cache, and returns how many repositories are now synced. Use this when a newly created repo has not appeared yet. No request body."
      >
        <CodeBlock
          language="bash"
          title="request"
          code={`curl -X POST https://www.deplo.in/api/v1/repos/sync \\
  -H "Authorization: Bearer $DEPLO_TOKEN"`}
        />
        <CodeBlock
          language="json"
          title="response · 200"
          code={`{
  "synced": 42
}`}
        />
      </ApiEndpoint>

      <ApiEndpoint
        method="GET"
        path="/api/v1/repos/:id/analyze"
        auth="bearer"
        description="Runs stack analysis on the repository's default branch and returns the detected stack, rich per-component analysis, and the environment variables the code actually reads. Purely read-only — no deployment is created. Returns 403 if the repo belongs to another user, 404 if it does not exist."
      >
        <DocTable head={["Field", "Type", "Description"]}>
          <Tr>
            <Td mono>stack.frontend</Td>
            <Td mono>string | null</Td>
            <Td>
              Detected frontend framework (e.g. <Code>NEXTJS</Code>, <Code>REACT_VITE</Code>).
            </Td>
          </Tr>
          <Tr>
            <Td mono>stack.backend</Td>
            <Td mono>string | null</Td>
            <Td>
              Detected backend framework (e.g. <Code>EXPRESS</Code>, <Code>FASTIFY</Code>).
            </Td>
          </Tr>
          <Tr>
            <Td mono>stack.frontendPath</Td>
            <Td mono>string | null</Td>
            <Td>Path of the frontend within the repo.</Td>
          </Tr>
          <Tr>
            <Td mono>stack.backendPath</Td>
            <Td mono>string | null</Td>
            <Td>Path of the backend within the repo.</Td>
          </Tr>
          <Tr>
            <Td mono>stack.buildCommand</Td>
            <Td mono>string | null</Td>
            <Td>Build command resolved from the repo&apos;s own scripts.</Td>
          </Tr>
          <Tr>
            <Td mono>stack.packageManager</Td>
            <Td mono>string | null</Td>
            <Td>
              <Code>npm</Code>, <Code>pnpm</Code>, <Code>yarn</Code>, or <Code>bun</Code>.
            </Td>
          </Tr>
          <Tr>
            <Td mono>analysis</Td>
            <Td mono>object</Td>
            <Td>
              Rich detection detail: repo <Code>structure</Code>, <Code>primaryLanguage</Code>,{" "}
              <Code>overallConfidence</Code> (0&ndash;1), <Code>needsAiFallback</Code>, and a{" "}
              <Code>components</Code> array with per-component framework, confidence, and deploy strategy.
            </Td>
          </Tr>
          <Tr>
            <Td mono>envVars[]</Td>
            <Td mono>array</Td>
            <Td>
              Detected variables: <Code>key</Code>, <Code>value</Code> (default or empty), <Code>isRequired</Code>,
              and <Code>source</Code> (where it was found).
            </Td>
          </Tr>
          <Tr>
            <Td mono>defaultBranch</Td>
            <Td mono>string</Td>
            <Td>The branch that was analyzed.</Td>
          </Tr>
        </DocTable>
        <CodeBlock
          language="bash"
          title="request"
          code={`curl https://www.deplo.in/api/v1/repos/cm5xb2c3d0002njk8p4q5r6s7/analyze \\
  -H "Authorization: Bearer $DEPLO_TOKEN"`}
        />
        <CodeBlock
          language="json"
          title="response · 200"
          code={`{
  "stack": {
    "frontend": "NEXTJS",
    "backend": "EXPRESS",
    "frontendPath": "client",
    "backendPath": "server",
    "buildCommand": "npm run build",
    "packageManager": "npm"
  },
  "analysis": {
    "structure": "frontend-backend",
    "primaryLanguage": "typescript",
    "overallConfidence": 0.92,
    "needsAiFallback": false,
    "components": [
      {
        "path": "client",
        "role": "frontend",
        "framework": "nextjs",
        "language": "typescript",
        "confidence": 0.95,
        "deployable": true,
        "provider": "vercel",
        "buildCommand": "npm run build",
        "outputDirectory": ".next",
        "startCommand": null
      },
      {
        "path": "server",
        "role": "backend",
        "framework": "express",
        "language": "typescript",
        "confidence": 0.89,
        "deployable": true,
        "provider": "render",
        "buildCommand": "npm run build",
        "outputDirectory": null,
        "startCommand": "npm run start"
      }
    ]
  },
  "envVars": [
    { "key": "DATABASE_URL", "value": "", "isRequired": true, "source": "code" },
    { "key": "STRIPE_SECRET_KEY", "value": "", "isRequired": true, "source": "code" },
    { "key": "NEXT_PUBLIC_API_URL", "value": "", "isRequired": false, "source": "dotenv-example" }
  ],
  "defaultBranch": "main"
}`}
        />
      </ApiEndpoint>

      <Callout type="tip">
        Analysis runs automatically when you <A href="/docs/api/deployments">start a deployment</A> — call this
        endpoint only when you want to preview the detected stack and env vars first, e.g. to build a configure step
        like the dashboard&apos;s. See the{" "}
        <A href="/docs/guides/environment-variables">environment variables guide</A> for how <Code>source</Code> and{" "}
        <Code>isRequired</Code> are derived.
      </Callout>
    </>
  );
}

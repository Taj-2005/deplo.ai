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
  DocTable,
  Tr,
  Td,
  Pill,
  FlowDiagram,
} from "@/components/docs/primitives";
import { CodeBlock } from "@/components/docs/CodeBlock";

export const metadata: Metadata = {
  title: "Deployments",
  description: "What happens between clicking Deploy and getting a production URL.",
};

export default function Deployments() {
  return (
    <>
      <PageTitle lead="Clicking Deploy kicks off a queued pipeline: analyze the repository, collect environment variables, deploy the backend to your Render workspace, wire its live URL into the frontend, deploy the frontend to your Vercel account. This page explains each stage in detail.">
        Deployments
      </PageTitle>

      <FlowDiagram
        steps={[
          { label: "analyze", detail: "detect stack, structure, env vars from the repo tree" },
          { label: "environment", detail: "required values collected — skipped if none are missing" },
          { label: "backend → Render", detail: "web service in your Render workspace" },
          { label: "wire URLs", detail: "backend URL → frontend build env, FRONTEND_URL → backend" },
          { label: "frontend → Vercel", detail: "project in your Vercel account" },
          { label: "live", detail: "two production URLs", accent: true },
        ]}
      />

      <H2>Stage 1: Repository analysis</H2>
      <P>
        Analysis is <strong>deterministic first</strong>. deplo.ai fetches your repository&apos;s full recursive git
        tree once, then runs a layered, evidence-scored pipeline over it — it is tree-driven, not
        filename-guessing, so monorepos, nested apps, and Python/Go repos are all seen correctly:
      </P>
      <Ul>
        <Li>
          <strong>Structure analysis</strong> classifies the repo as <Code>single</Code>,{" "}
          <Code>frontend-backend</Code> (e.g. <Code>client/</Code> + <Code>server/</Code> folders), or{" "}
          <Code>monorepo</Code> — Turborepo, Nx, and pnpm/npm/yarn workspaces are all recognized.
        </Li>
        <Li>
          <strong>Framework detection</strong> scores each candidate against weighted signatures: dependencies,
          config files, content patterns, and package scripts, each with its own weight. No single indicator is
          ever trusted on its own, and a meta-framework (Next.js) outranks its base library (React) via priority.
        </Li>
        <Li>
          <strong>Language and runtime detection</strong> identifies JavaScript/TypeScript, Python, Go, Java, or
          static HTML, plus the language version and package manager.
        </Li>
        <Li>
          <strong>Environment variable scanning</strong> reads your source for the variables the code actually
          uses — see <A href="/docs/guides/environment-variables">Environment Variables</A>.
        </Li>
      </Ul>
      <P>
        The result is shown before anything deploys: the detected frontend and backend, where each lives in the
        repo, and the commands that will run.
      </P>

      <H3>Confidence and the AI fallback</H3>
      <P>
        The signature scores are normalised to a 0–1 <strong>confidence</strong> value per component. High
        confidence means several independent signals agree — a <Code>next.config.ts</Code>, a{" "}
        <Code>next</Code> dependency, and a <Code>next build</Code> script all pointing the same way.
      </P>
      <Callout type="ai" title="AI fallback">
        When deterministic confidence falls below 0.5, the pipeline escalates to a bounded AI reasoning step
        (Groq). It receives the folder tree (≤200 paths), key config files and small top-level source files, and
        the deterministic evidence — never the whole repository. Its answer is constrained to a strict JSON schema
        with framework enums, and its corrections are merged only when they are more confident than the
        deterministic result. AI is capped at <strong>two calls per deployment</strong> — this one, plus one
        failure diagnosis if the deployment fails — and if AI is unavailable the deterministic result is used
        as-is, never an error.
      </Callout>

      <H2>Stage 2: Build command resolution</H2>
      <P>Commands are read from your repository&apos;s real files — never guessed:</P>
      <DocTable head={["Runtime", "How commands are resolved"]}>
        <Tr>
          <Td mono>Node.js</Td>
          <Td>
            Build and start come from the backend&apos;s <strong>own</strong> <Code>package.json</Code> scripts,
            read at deploy time. The package manager is detected from lockfiles (<Code>bun.lockb</Code>,{" "}
            <Code>pnpm-lock.yaml</Code>, <Code>yarn.lock</Code>, else npm). A <Code>build</Code> script becomes{" "}
            <Code>install &amp;&amp; run build</Code>; a <Code>start</Code> script is used verbatim. If no start
            script exists, the entry point is located from <Code>main</Code> and the actual file tree.
          </Td>
        </Tr>
        <Tr>
          <Td mono>Python</Td>
          <Td>
            Install from <Code>requirements.txt</Code> / <Code>pyproject</Code>. The app module is detected from
            source: <Code>uvicorn module:var</Code> from an <Code>X = FastAPI()</Code> assignment,{" "}
            <Code>gunicorn --bind 0.0.0.0:$PORT module:var</Code> for Flask, and{" "}
            <Code>pkg.wsgi:application</Code> for Django. <Code>PYTHON_VERSION</Code> is set when a
            fully-qualified version is detected.
          </Td>
        </Tr>
        <Tr>
          <Td mono>Go</Td>
          <Td>
            Build target from the repo layout: a root <Code>main.go</Code> becomes{" "}
            <Code>go build -o app .</Code>; the <Code>cmd/&lt;name&gt;/main.go</Code> convention builds that
            package. Start is <Code>./app</Code>; the Go version in <Code>go.mod</Code> is honoured by Render.
          </Td>
        </Tr>
      </DocTable>

      <H2>Stage 3: Environment variables</H2>
      <P>
        If any required variable has no value, the deployment parks in <Code>WAITING_FOR_ENV</Code> and you get
        an email listing exactly which keys are missing. Provide values in the dashboard (or pre-fill them on the
        Configure step to skip this state entirely) and the pipeline resumes.{" "}
        <A href="/docs/guides/environment-variables">Environment Variables</A> covers detection, scoping, and the
        auto-injected wiring keys in depth.
      </P>

      <H2>Stage 4: Deploy order — backend first</H2>
      <P>
        The backend always deploys first, because the frontend build needs its live URL. There is one clever
        exception to the ordering: the frontend&apos;s Vercel domain is <em>predictable</em> (
        <Code>deplo-&lt;repo&gt;-web.vercel.app</Code>), so the backend can be configured with{" "}
        <Code>FRONTEND_URL</Code> for CORS before the frontend exists — no chicken-and-egg problem.
      </P>
      <Ul>
        <Li>
          A Render web service (<Code>deplo-&lt;repo&gt;-api</Code>, free plan) is created in{" "}
          <strong>your</strong> Render workspace using your own API key, with the resolved build/start commands,
          the correct <Code>rootDir</Code> for monorepos, and backend-scoped env vars.
        </Li>
        <Li>
          deplo.ai waits for the Render build; when the service is live, the deployment moves to{" "}
          <Code>BACKEND_READY</Code> and the backend URL is recorded.
        </Li>
        <Li>
          Frontend files are fetched from GitHub and deployed to a project in <strong>your</strong> Vercel
          account. The live backend URL is injected into every frontend key that references it (
          <Code>NEXT_PUBLIC_API_URL</Code>, <Code>VITE_API_URL</Code>, and friends).
        </Li>
        <Li>
          After the frontend is live, deplo.ai verifies the domain Vercel <em>actually</em> assigned. If it
          differs from the predicted one, the backend&apos;s <Code>FRONTEND_URL</Code> is corrected and a backend
          redeploy is triggered automatically so CORS stays right.
        </Li>
      </Ul>
      <Callout type="note">
        Vercel credentials are only required when a frontend exists — backend-only repositories deploy with
        Render alone.
      </Callout>

      <H2>Live logs</H2>
      <P>
        Every stage appends to a live log you can watch on the deployment page, fetch via{" "}
        <Code>GET /api/v1/deployments/:id</Code>, or stream with <Code>deplo logs</Code> from the{" "}
        <A href="/docs/cli/commands">CLI</A>:
      </P>
      <CodeBlock
        language="text"
        title="deployment log"
        code={`Analyzing repository structure…
Stack detected: frontend=Next.js, backend=Express.js (client/) (server/)
Deploying backend to Render…
Using package.json scripts — build: "npm install && npm run build", start: "npm start"
Reusing existing Render service (srv-abc123) — updating configuration and redeploying…
Backend live at https://deplo-my-app-api.onrender.com
Wiring frontend → backend: NEXT_PUBLIC_API_URL = https://deplo-my-app-api.onrender.com
Deploying frontend to Vercel (214 files)…
Frontend live at https://deplo-my-app-web.vercel.app
Deployment completed successfully.`}
      />

      <H2>Status meanings</H2>
      <P>
        A deployment moves through <Code>PENDING</Code> → <Code>ANALYZING</Code> →{" "}
        <Code>WAITING_FOR_ENV</Code> (only if values are missing) → <Code>DEPLOYING_BACKEND</Code> →{" "}
        <Code>BACKEND_READY</Code> → <Code>DEPLOYING_FRONTEND</Code> → <Code>COMPLETED</Code>, with{" "}
        <Code>FAILED</Code> and <Code>CANCELLED</Code> as the other terminal states. Every state is defined in{" "}
        <A href="/docs/concepts/deployment-lifecycle">Deployment Lifecycle</A>.
      </P>

      <H2>Redeploys</H2>
      <P>
        Redeploys are <strong>idempotent</strong>. Deploying the same repository again reuses the existing Render
        service (found by stored ID, or by name in your workspace) and the existing Vercel project — services are
        never duplicated. On reuse, the service configuration is repaired if an earlier attempt left it wrong
        (e.g. a missing <Code>rootDir</Code>), and env vars are re-applied as the full intended set, so values
        you provided earlier carry forward.
      </P>
      <P>
        After the first successful deployment, deplo.ai also registers a GitHub push webhook (best-effort — a
        registration failure never fails the deploy). From then on, pushes to the deployed branch trigger an
        automatic redeploy that reuses the previous configuration and skips straight to the deploy phase.
      </P>

      <H2>
        Rollbacks <Pill variant="planned" />
      </H2>
      <P>
        Rollbacks are not implemented yet. Today the way back is forward: revert the commit and redeploy, or use
        your provider dashboards directly — both Vercel and Render keep their own deployment history, and since
        the services live in your accounts you have full access to their native rollback tools.
      </P>

      <H2>Cancelling a deployment</H2>
      <P>
        Cancel from the deployment page or with <Code>DELETE /api/v1/deployments/:id</Code>. Cancellation is only
        valid while the deployment is active — a <Code>COMPLETED</Code>, <Code>FAILED</Code>, or already{" "}
        <Code>CANCELLED</Code> deployment returns a conflict error. The deployment is marked{" "}
        <Code>CANCELLED</Code> and the pipeline stops progressing it; note that a build already handed to Vercel
        or Render may still finish on the provider&apos;s side.
      </P>

      <H2>If it fails</H2>
      <P>
        A failure sets the deployment to <Code>FAILED</Code>, runs the one bounded AI failure diagnosis (likely
        cause, suggested corrected commands) which is appended to the log, and emails you the diagnosis together
        with a copy-paste fix prompt for Cursor, Claude Code, or Copilot. See{" "}
        <A href="/docs/guides/troubleshooting">Troubleshooting</A> for the common failure modes and their fixes.
      </P>
    </>
  );
}

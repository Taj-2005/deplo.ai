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
  title: "Deployment Lifecycle",
  description: "Every state a deployment moves through, from repository to production URL.",
};

export default function DeploymentLifecycle() {
  return (
    <>
      <PageTitle lead="A deployment is a state machine driven by a background worker. This page walks every status in order — what it means, what triggers the transition, and what happens when things go wrong.">
        Deployment Lifecycle
      </PageTitle>

      <P>
        Starting a deployment (dashboard <strong>Deploy</strong> button, <Code>deplo</Code> in the CLI, or{" "}
        <Code>POST /deployments</Code> directly) creates a deployment record and enqueues an analysis job. From there a
        worker drives the record through the pipeline while the dashboard and CLI poll for status and logs:
      </P>

      <FlowDiagram
        steps={[
          { label: "GitHub repository", detail: "you pick a repo and branch" },
          { label: "PENDING", detail: "record created, analysis job enqueued" },
          { label: "ANALYZING", detail: "detection engine reads the repo tree" },
          { label: "WAITING_FOR_ENV", detail: "only if required variables are missing — parked until you provide them" },
          { label: "DEPLOYING_BACKEND", detail: "Render web service in your workspace" },
          { label: "BACKEND_READY", detail: "backend live — its URL is now known" },
          { label: "DEPLOYING_FRONTEND", detail: "Vercel build with the backend URL injected" },
          { label: "COMPLETED", detail: "both URLs recorded, success email sent" },
          { label: "Production URLs", detail: "…-web.vercel.app + …-api.onrender.com", accent: true },
        ]}
      />

      <Callout type="note">
        The backend always deploys <strong>first</strong>. Its live URL is wired into the frontend build (so the
        frontend never ships pointing at a URL that does not exist), and the backend receives{" "}
        <Code>FRONTEND_URL</Code> for CORS. Frontend-only and backend-only repos simply skip the phases they do not
        need.
      </Callout>

      <H2>Status reference</H2>
      <DocTable head={["Status", "Meaning", "Leaves when"]}>
        <Tr>
          <Td mono>PENDING</Td>
          <Td>Deployment record created; the analysis job is queued but not yet picked up.</Td>
          <Td>The worker starts analysis.</Td>
        </Tr>
        <Tr>
          <Td mono>ANALYZING</Td>
          <Td>The detection engine is reading the repository tree, detecting the stack, and scanning env vars.</Td>
          <Td>Analysis finishes — to <Code>WAITING_FOR_ENV</Code> or <Code>DEPLOYING_BACKEND</Code>.</Td>
        </Tr>
        <Tr>
          <Td mono>WAITING_FOR_ENV</Td>
          <Td>Required environment variables have no value. The deployment is parked; nothing deploys.</Td>
          <Td>You provide the missing values (dashboard or <Code>POST /deployments/:id/env</Code>).</Td>
        </Tr>
        <Tr>
          <Td mono>DEPLOYING_BACKEND</Td>
          <Td>Creating or reusing the Render web service in your workspace and waiting for its build.</Td>
          <Td>Render reports the service live.</Td>
        </Tr>
        <Tr>
          <Td mono>BACKEND_READY</Td>
          <Td>The backend is live and its URL is recorded — the value to wire into the frontend is now known.</Td>
          <Td>The frontend phase begins.</Td>
        </Tr>
        <Tr>
          <Td mono>DEPLOYING_FRONTEND</Td>
          <Td>Repository files are uploaded to Vercel and the frontend build runs in your account.</Td>
          <Td>Vercel reports the deployment ready.</Td>
        </Tr>
        <Tr>
          <Td mono>COMPLETED</Td>
          <Td>Terminal. Production URLs recorded; success email sent; monitoring picks the project up.</Td>
          <Td>—</Td>
        </Tr>
        <Tr>
          <Td mono>FAILED</Td>
          <Td>Terminal. The error and an AI diagnosis are in the logs; a failure email was sent.</Td>
          <Td>— (start a new deployment to retry)</Td>
        </Tr>
        <Tr>
          <Td mono>CANCELLED</Td>
          <Td>Terminal. You cancelled the deployment (<Code>DELETE /deployments/:id</Code>) before it finished.</Td>
          <Td>—</Td>
        </Tr>
      </DocTable>

      <H2>Phase 1 — analysis</H2>
      <P>
        The worker sets <Code>ANALYZING</Code> and runs the{" "}
        <A href="/docs/concepts/architecture">detection engine</A> over one snapshot of the repo tree: frameworks,
        monorepo paths, runtimes, build commands, and the environment variables your code actually reads. Values you
        pre-filled on the configure step are merged into the detected list.
      </P>
      <P>
        If any <em>required</em> variable is still empty, the status becomes <Code>WAITING_FOR_ENV</Code>: the log
        lists exactly which keys are missing, an email nudge goes out, and the deployment waits — indefinitely, at no
        cost — until you provide values. If everything required is satisfied, the deploy job is enqueued immediately
        and analysis flows straight into <Code>DEPLOYING_BACKEND</Code>.
      </P>

      <H2>Phase 2 — backend to Render</H2>
      <P>
        The orchestrator resolves <em>your</em> Render API key (decrypted just-in-time), then creates — or, on a retry
        or redeploy, finds and reuses — a web service named after your repo, e.g. <Code>deplo-my-app-api</Code>, in
        your own workspace on the free plan:
      </P>
      <Ul>
        <Li>
          <strong>Node backends:</strong> build and start commands come from the repo&apos;s own{" "}
          <Code>package.json</Code> scripts and detected package manager (npm, yarn, pnpm, or bun) — never guessed.
        </Li>
        <Li>
          <strong>Python and Go backends:</strong> commands were resolved during analysis from real files
          (requirements, app modules, <Code>go.mod</Code> layout).
        </Li>
        <Li>
          <strong>Env vars:</strong> the service receives backend-scoped and shared variables — never frontend-only
          ones — plus <Code>FRONTEND_URL</Code> pointing at the frontend&apos;s predicted stable domain, so CORS works
          without a chicken-and-egg problem.
        </Li>
      </Ul>
      <P>
        When Render reports the deploy live, the URL (e.g. <Code>https://deplo-my-app-api.onrender.com</Code>) is
        stored and the status becomes <Code>BACKEND_READY</Code>.
      </P>

      <H2>Phase 3 — frontend to Vercel</H2>
      <P>
        The orchestrator downloads the frontend&apos;s files from GitHub (only the frontend directory in a monorepo)
        and deploys them file-based to a Vercel project in your account, e.g. <Code>deplo-my-app-web</Code>, using
        Vercel&apos;s framework preset where one exists. The live backend URL is injected into every frontend key your
        code references — <Code>NEXT_PUBLIC_API_URL</Code>, <Code>VITE_API_URL</Code>,{" "}
        <Code>REACT_APP_API_URL</Code>, whichever were detected:
      </P>
      <CodeBlock
        language="text"
        title="deployment log (excerpt)"
        code={`Backend live at https://deplo-my-app-api.onrender.com
Deploying frontend to Vercel (214 files)…
Wiring frontend → backend: NEXT_PUBLIC_API_URL = https://deplo-my-app-api.onrender.com
Vercel deployment triggered (dpl_4Yx…). Waiting for build…
Frontend live at https://deplo-my-app-web.vercel.app
Deployment completed successfully.`}
      />
      <P>
        Vercel project names are globally unique, so after the build the orchestrator verifies the{" "}
        <em>actually assigned</em> production domain rather than trusting the prediction. If it differs, the
        backend&apos;s <Code>FRONTEND_URL</Code> is corrected automatically and a backend redeploy is triggered so CORS
        stays right.
      </P>
      <P>
        On <Code>COMPLETED</Code>, both URLs are final, a success email goes out with the links, uptime monitoring
        starts probing the project every five minutes, and — where configured — a GitHub webhook is registered
        (best-effort, never fails the deployment).
      </P>

      <H2>When a deployment fails</H2>
      <P>
        Any error in any phase moves the deployment to <Code>FAILED</Code> with the error message recorded and{" "}
        <Code>FAILED: …</Code> appended to the log. Then two things happen:
      </P>
      <Ul>
        <Li>
          <strong>AI diagnosis.</strong> One bounded AI call analyzes the detected stack, the error, and the log tail,
          and appends its findings to the deployment log: the likely cause, whether the stack looks misidentified,
          corrected build/start/output suggestions where applicable, and a recommendation. If AI is unavailable, the
          raw error and logs are still all there.
        </Li>
        <Li>
          <strong>Failure email.</strong> You get an email with the explanation and a copy-paste fix prompt for your AI
          coding tool.
        </Li>
      </Ul>
      <P>
        Transient infrastructure errors never reach <Code>FAILED</Code> on the first hiccup — queue jobs retry up to
        three times with exponential backoff. Only permanent errors (provider 4xx responses, missing configuration)
        fail immediately. To retry after a failure, fix and push, then deploy again: existing Render services and
        Vercel projects are reused idempotently, phases that already completed are skipped (recorded URLs are
        preserved), and env vars are kept.
      </P>

      <H3>Cancellation and rollbacks</H3>
      <P>
        You can cancel a deployment that has not finished (<Code>DELETE /deployments/:id</Code> or the dashboard) —
        it moves to <Code>CANCELLED</Code> and terminal states are never overwritten. Rollbacks to a previous
        deployment <Pill variant="planned" /> are not implemented yet; today the way back is deploying the previous
        commit, or using Vercel&apos;s and Render&apos;s own rollback tools directly — the deployments are in your
        accounts, so their native tooling always works.
      </P>

      <H2>Related pages</H2>
      <Ul>
        <Li>
          <A href="/docs/guides/deployments">Deployments guide</A> — the same pipeline from a user&apos;s point of
          view.
        </Li>
        <Li>
          <A href="/docs/guides/environment-variables">Environment Variables</A> — scopes, detection, and the{" "}
          <Code>WAITING_FOR_ENV</Code> flow in detail.
        </Li>
        <Li>
          <A href="/docs/api/deployments">Deployments API</A> — start, poll, provide env, cancel.
        </Li>
        <Li>
          <A href="/docs/guides/troubleshooting">Troubleshooting</A> — common failure causes and fixes.
        </Li>
      </Ul>
    </>
  );
}

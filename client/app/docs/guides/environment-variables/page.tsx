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
} from "@/components/docs/primitives";
import { CodeBlock } from "@/components/docs/CodeBlock";

export const metadata: Metadata = {
  title: "Environment Variables",
  description: "How env vars are detected, scoped, wired between frontend and backend, and provided.",
};

export default function EnvironmentVariables() {
  return (
    <>
      <PageTitle lead="deplo.ai discovers environment variables by reading your code, not just your .env.example. Detected variables are scoped to the frontend or backend, connection-wiring keys are injected automatically, and everything ends up as real env vars on your own Vercel project and Render service.">
        Environment Variables
      </PageTitle>

      <H2>Detection is code-driven</H2>
      <P>
        During <A href="/docs/guides/deployments">analysis</A>, the scanner walks your repository&apos;s actual
        tree — it works regardless of how the project is structured. Two sources feed the variable list:
      </P>
      <Ul>
        <Li>
          <strong>Every</strong> <Code>.env*</Code> <strong>file anywhere in the repo.</strong> Example and
          template files (<Code>.env.example</Code>, <Code>.env.sample</Code>, …) contribute keys <em>and</em>{" "}
          safe default values. Real env files (<Code>.env</Code>, <Code>.env.local</Code>, …) contribute keys
          only — their values are never reused, since they may be actual secrets.
        </Li>
        <Li>
          <strong>Source files</strong>, scanned for the references your code actually makes:{" "}
          <Code>process.env.X</Code>, <Code>process.env[&quot;X&quot;]</Code>, destructuring from{" "}
          <Code>process.env</Code>, <Code>import.meta.env.X</Code>, and Python&apos;s <Code>os.getenv</Code> /{" "}
          <Code>os.environ</Code>. The scan is bounded (up to 60 files, config/entry-point files prioritised) and
          skips <Code>node_modules</Code>, build output, and test files.
        </Li>
      </Ul>
      <P>
        A variable referenced in code is marked <strong>required</strong> by default. A default value from an
        example file makes it optional (pre-filled); an empty or <Code>REQUIRED</Code> value in an example file
        keeps it required.
      </P>

      <H2>Scopes: frontend, backend, shared</H2>
      <P>Each variable is scoped so it only reaches the side that needs it:</P>
      <Ul>
        <Li>
          Keys with a client-side prefix (<Code>NEXT_PUBLIC_</Code>, <Code>VITE_</Code>,{" "}
          <Code>REACT_APP_</Code>, <Code>NUXT_PUBLIC_</Code>, <Code>GATSBY_</Code>, <Code>PUBLIC_</Code>) are
          always <strong>frontend</strong>.
        </Li>
        <Li>
          Otherwise, scope follows the file where the reference was found: a key read under{" "}
          <Code>server/</Code> is <strong>backend</strong>, one read under <Code>client/</Code> is{" "}
          <strong>frontend</strong>.
        </Li>
        <Li>
          A key seen on both sides becomes <strong>shared</strong> and is delivered to both.
        </Li>
      </Ul>
      <P>
        At deploy time the backend receives backend-scoped and shared variables (never frontend-only ones), and
        the frontend receives frontend-scoped and shared variables (never backend-only ones) — so a backend
        secret can never leak into a client-side build.
      </P>

      <H2>Variable categories</H2>
      <H3>Asked of you</H3>
      <DocTable head={["Category", "Example", "Behavior"]}>
        <Tr>
          <Td>Required, no value</Td>
          <Td mono>DATABASE_URL</Td>
          <Td>Deployment parks in <Code>WAITING_FOR_ENV</Code> until you provide a value.</Td>
        </Tr>
        <Tr>
          <Td>Optional / pre-filled</Td>
          <Td mono>LOG_LEVEL=info</Td>
          <Td>Default taken from your example env file; override it or leave it as-is.</Td>
        </Tr>
      </DocTable>

      <H3>Never asked of you</H3>
      <DocTable head={["Category", "Keys", "Behavior"]}>
        <Tr>
          <Td>Frontend wiring keys</Td>
          <Td mono>NEXT_PUBLIC_API_URL, VITE_API_URL, …</Td>
          <Td>Auto-injected with the live backend URL at deploy time.</Td>
        </Tr>
        <Tr>
          <Td>Backend wiring keys</Td>
          <Td mono>FRONTEND_URL, CLIENT_URL, CORS_ORIGIN</Td>
          <Td>
            Recognized as platform-wired; <Code>FRONTEND_URL</Code> is set on every backend service.
          </Td>
        </Tr>
        <Tr>
          <Td>Platform-managed</Td>
          <Td mono>PORT, NODE_ENV, VERCEL_*, RENDER_*</Td>
          <Td>Managed by the hosting providers (or by deplo.ai) — never surfaced.</Td>
        </Tr>
      </DocTable>

      <H2>Auto-injected wiring keys</H2>
      <P>
        The frontend needs the backend&apos;s URL, but that URL does not exist until the backend deploys — so
        deplo.ai injects it for you. Any frontend key matching the pattern{" "}
        <em>client prefix</em> + <Code>API</Code>/<Code>BACKEND</Code>/<Code>SERVER</Code> +{" "}
        <Code>URL</Code>/<Code>URI</Code>/<Code>HOST</Code>/<Code>ENDPOINT</Code> is detected as a wiring key —{" "}
        <Code>NEXT_PUBLIC_API_URL</Code>, <Code>VITE_API_URL</Code>, <Code>REACT_APP_BACKEND_URL</Code>,{" "}
        <Code>PUBLIC_API_BASE_URL</Code>, and so on. On top of what your code references, a framework default is
        always injected:
      </P>
      <DocTable head={["Frontend framework", "Default injected key"]}>
        <Tr>
          <Td>Next.js</Td>
          <Td mono>NEXT_PUBLIC_API_URL</Td>
        </Tr>
        <Tr>
          <Td>Vite (React), Vue, Svelte</Td>
          <Td mono>VITE_API_URL</Td>
        </Tr>
        <Tr>
          <Td>Nuxt</Td>
          <Td mono>NUXT_PUBLIC_API_URL</Td>
        </Tr>
        <Tr>
          <Td>Astro, SvelteKit</Td>
          <Td mono>PUBLIC_API_URL</Td>
        </Tr>
        <Tr>
          <Td>Gatsby</Td>
          <Td mono>GATSBY_API_URL</Td>
        </Tr>
        <Tr>
          <Td>Remix (server-side env)</Td>
          <Td mono>API_URL</Td>
        </Tr>
      </DocTable>
      <P>
        In the other direction, the backend service always receives <Code>FRONTEND_URL</Code> — the
        frontend&apos;s production origin — so your CORS configuration can read it instead of hardcoding a
        domain. Render also sets <Code>PORT</Code>; your backend should listen on it. See{" "}
        <A href="/docs/guides/best-practices">Best Practices</A>.
      </P>
      <CodeBlock
        language="ts"
        title="server/src/index.ts — CORS wired by deplo.ai"
        code={`app.use(cors({ origin: process.env.FRONTEND_URL }));
app.listen(Number(process.env.PORT) || 4000, "0.0.0.0");`}
      />

      <H2>Providing values</H2>
      <P>
        If any required variable is still empty after analysis, the deployment enters{" "}
        <Code>WAITING_FOR_ENV</Code> and you receive an email listing the missing keys. You can provide values
        three ways:
      </P>
      <Ul>
        <Li>
          <strong>Dashboard</strong> — the deployment page shows the detected list with required keys first;
          fill them in and the deployment resumes immediately (it transitions straight to{" "}
          <Code>DEPLOYING_BACKEND</Code>).
        </Li>
        <Li>
          <strong>CLI</strong> — <Code>deplo</Code> prompts for missing values during a deploy. See the{" "}
          <A href="/docs/cli/commands">command reference</A>.
        </Li>
        <Li>
          <strong>API</strong> — <Code>POST /api/v1/deployments/:id/env</Code> with a list of{" "}
          <Code>{"{ key, value }"}</Code> pairs. See <A href="/docs/api/deployments">Deployments API</A>.
        </Li>
      </Ul>
      <Callout type="tip">
        You can pre-fill values on the Configure step (or pass <Code>envVars</Code> when starting a deployment
        via the API) — if every required variable already has a value, <Code>WAITING_FOR_ENV</Code> is skipped
        entirely.
      </Callout>

      <H2>How values reach the providers</H2>
      <P>
        Values become plain environment variables on infrastructure <strong>you</strong> own: frontend-scoped
        and shared variables are upserted onto the Vercel project in your account (production target), and
        backend-scoped and shared variables are applied to the Render service in your workspace. On redeploys,
        the backend env set is replaced wholesale with the full intended set, so the service always matches what
        the deployment record says. You can inspect everything in your own Vercel and Render dashboards at any
        time.
      </P>

      <H2>Security notes</H2>
      <Ul>
        <Li>
          Values you provide are stored on the deployment record (per-deployment, in Postgres) so redeploys and
          retries can reuse them.
        </Li>
        <Li>
          The API never echoes values back: <Code>GET /api/v1/deployments/:id</Code> returns each variable&apos;s{" "}
          <Code>key</Code> and <Code>isRequired</Code> flag only.
        </Li>
        <Li>Values are never written to deployment logs or server logs.</Li>
        <Li>
          Values found in a committed real <Code>.env</Code> file are never reused as defaults — only the keys
          are read. (Don&apos;t commit real <Code>.env</Code> files anyway.)
        </Li>
      </Ul>
      <Callout type="warning">
        Anything prefixed <Code>NEXT_PUBLIC_</Code>, <Code>VITE_</Code>, or another client prefix is compiled
        into the browser bundle and is public by definition. Never put secrets in client-prefixed variables.
      </Callout>
    </>
  );
}

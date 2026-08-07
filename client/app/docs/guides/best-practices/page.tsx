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
  title: "Best Practices",
  description: "Repository layout, env management, secrets, and production readiness.",
};

export default function BestPractices() {
  return (
    <>
      <PageTitle lead="deplo.ai works hardest when your repository follows a few boring conventions. Every recommendation here maps directly to how the platform detects, builds, and wires your app — nothing is style preference.">
        Best Practices
      </PageTitle>

      <H2>Repository layout that detects cleanly</H2>
      <P>
        The <A href="/docs/guides/deployments">detection engine</A> reads your full repo tree and classifies it
        as a single app, a frontend + backend pair, or a monorepo. All three work — the key is keeping the
        boundaries obvious:
      </P>
      <Ul>
        <Li>
          <strong>One app per folder.</strong> A <Code>client/</Code> (or <Code>frontend/</Code>) folder and a{" "}
          <Code>server/</Code> (or <Code>backend/</Code>, <Code>api/</Code>) folder is the clearest layout. Env
          scoping also follows these folders — a variable read under <Code>server/</Code> is backend-scoped.
        </Li>
        <Li>
          <strong>Standard monorepo tooling is recognized</strong> — Turborepo, Nx, and pnpm/npm/yarn workspaces
          (e.g. <Code>apps/web</Code> + <Code>apps/api</Code>). Declare workspaces properly rather than inventing
          a custom layout.
        </Li>
        <Li>
          <strong>Don&apos;t mix two apps in one folder.</strong> A React app and an Express server sharing one{" "}
          <Code>package.json</Code> forces the detector to pick one framework and confuses build resolution.
        </Li>
        <Li>
          Keep framework config files (<Code>next.config.ts</Code>, <Code>vite.config.ts</Code>, …) at their
          app&apos;s root — they are strong, heavily-weighted detection signals.
        </Li>
      </Ul>

      <H2>package.json scripts are the source of truth</H2>
      <P>
        For Node backends, deplo.ai runs your repo&apos;s <strong>own</strong> <Code>build</Code> and{" "}
        <Code>start</Code> scripts — it never invents commands. That makes the contract simple:
      </P>
      <Ul>
        <Li>
          Both scripts must exist and work from a clean clone: <Code>npm ci &amp;&amp; npm run build &amp;&amp;
          npm start</Code> is exactly what production does.
        </Li>
        <Li>
          <Code>start</Code> must run the <em>built</em> output (e.g. <Code>node dist/index.js</Code>), not a dev
          watcher like <Code>nodemon</Code> or <Code>ts-node-dev</Code>.
        </Li>
        <Li>
          Build-time tools (TypeScript, bundlers) belong in <Code>devDependencies</Code>; runtime deps in{" "}
          <Code>dependencies</Code>.
        </Li>
        <Li>
          Commit your lockfile — the package manager (npm, yarn, pnpm, bun) is detected from it, so the same
          manager installs in production as on your machine.
        </Li>
      </Ul>

      <H2>Environment variable hygiene</H2>
      <P>
        The <A href="/docs/guides/environment-variables">scanner</A> finds variables by reading your code, and
        uses example env files for safe defaults:
      </P>
      <Ul>
        <Li>
          <strong>Commit a</strong> <Code>.env.example</Code> <strong>with every key</strong> — a value makes the
          variable optional with that default; leaving it empty keeps it required. It also documents your app for
          humans.
        </Li>
        <Li>
          <strong>Never commit a real</strong> <Code>.env</Code>. deplo.ai deliberately ignores values in real
          env files, but git history does not forgive — treat a committed secret as leaked and rotate it.
        </Li>
        <Li>
          <strong>Reference variables directly</strong> (<Code>process.env.STRIPE_KEY</Code>,{" "}
          <Code>import.meta.env.VITE_MAPS_KEY</Code>, <Code>os.getenv(&quot;DATABASE_URL&quot;)</Code>) so the
          scanner sees them. Dynamic access like <Code>process.env[name]</Code> with a computed name is invisible
          to static scanning.
        </Li>
        <Li>
          Never put secrets in client-prefixed keys (<Code>NEXT_PUBLIC_*</Code>, <Code>VITE_*</Code>) — they are
          compiled into the public browser bundle.
        </Li>
      </Ul>

      <H2>Backend server conventions</H2>
      <P>Two lines of server code prevent the majority of avoidable backend failures:</P>
      <CodeBlock
        language="ts"
        title="server/src/index.ts"
        code={`// 1. Listen on the platform's port, bound to all interfaces.
app.listen(Number(process.env.PORT) || 4000, "0.0.0.0");

// 2. CORS from the injected frontend origin — never a hardcoded domain.
app.use(cors({ origin: process.env.FRONTEND_URL }));`}
      />
      <Ul>
        <Li>
          <strong>Listen on</strong> <Code>process.env.PORT</Code> — Render assigns the port. A hardcoded port
          means the platform never sees your server come up.
        </Li>
        <Li>
          <strong>Bind</strong> <Code>0.0.0.0</Code>, not <Code>localhost</Code> — containerized traffic arrives
          on the external interface.
        </Li>
        <Li>
          <strong>Read CORS origins from</strong> <Code>FRONTEND_URL</Code> — deplo.ai injects your
          frontend&apos;s real production origin into the backend, and even corrects it automatically if Vercel
          assigns a different domain than predicted.
        </Li>
      </Ul>

      <H2>Secrets management</H2>
      <Ul>
        <Li>
          <strong>Rotate provider keys deliberately.</strong> Your Render API key is rotated by reconnecting with
          a new key in <A href="https://www.deplo.in/dashboard/integrations">Dashboard → Integrations</A> — the
          new key is validated live before it replaces the old one. Keys are stored encrypted (AES-256-GCM),
          masked in the UI, and never logged.
        </Li>
        <Li>
          <strong>Revoke CLI tokens you no longer use</strong> — from{" "}
          <A href="https://www.deplo.in/dashboard/settings">Dashboard → Settings</A>. Give each machine and CI
          pipeline its own token so one revocation never breaks another environment. See{" "}
          <A href="/docs/cli/authentication">CLI Authentication</A>.
        </Li>
        <Li>
          <strong>Keep app secrets in env vars</strong>, provided through the deployment flow — they land as
          native env vars on your own Vercel project and Render service, where you can audit them any time.
        </Li>
      </Ul>

      <H2>Production readiness checklist</H2>
      <DocTable head={["Check", "Why it matters"]}>
        <Tr>
          <Td>
            <Code>npm run build</Code> and <Code>npm start</Code> work from a clean clone
          </Td>
          <Td>These exact scripts run in production — no local-only tooling.</Td>
        </Tr>
        <Tr>
          <Td>
            Backend listens on <Code>process.env.PORT</Code>, bound to <Code>0.0.0.0</Code>
          </Td>
          <Td>Render assigns the port; wrong binding looks like a hung deploy.</Td>
        </Tr>
        <Tr>
          <Td>
            CORS reads <Code>process.env.FRONTEND_URL</Code>
          </Td>
          <Td>The injected origin survives domain changes without a code edit.</Td>
        </Tr>
        <Tr>
          <Td>
            <Code>.env.example</Code> lists every key; no real <Code>.env</Code> committed
          </Td>
          <Td>Drives detection, defaults, and required-ness — and keeps secrets out of git.</Td>
        </Tr>
        <Tr>
          <Td>Lockfile committed</Td>
          <Td>Production installs with the same package manager and versions as your machine.</Td>
        </Tr>
        <Tr>
          <Td>Frontend API calls use the injected key (e.g. <Code>NEXT_PUBLIC_API_URL</Code>)</Td>
          <Td>The live backend URL is wired in at build time — no hardcoded localhost.</Td>
        </Tr>
        <Tr>
          <Td>First deploy verified end-to-end, monitoring checked</Td>
          <Td>
            Uptime probes and the latest-attempt banner (<A href="/docs/guides/monitoring">Monitoring</A>) catch
            regressions early.
          </Td>
        </Tr>
      </DocTable>
      <Callout type="tip">
        Free-tier Render services sleep when idle, so the first request after a quiet period is slow. This is
        normal — monitoring counts cold starts as up — but upgrade the service plan in your Render dashboard if
        cold starts hurt your users.
      </Callout>

      <H2>Dashboard, CLI, or CI?</H2>
      <H3>Dashboard</H3>
      <P>
        Best for first-time setup (provider connections, GitHub App install), filling in environment variables
        with the detected list in front of you, and reading logs, AI diagnoses, and{" "}
        <A href="/docs/guides/monitoring">monitoring</A>.
      </P>
      <H3>CLI</H3>
      <P>
        Best for day-to-day redeploys without leaving the terminal — <Code>deplo</Code> deploys the repo
        you&apos;re standing in, and <Code>deplo logs</Code> follows the pipeline. See the{" "}
        <A href="/docs/cli">CLI overview</A>.
      </P>
      <H3>CI / hands-off</H3>
      <P>
        After your first successful deployment, a GitHub push webhook is registered automatically — pushes to the
        deployed branch redeploy with the previous configuration, no CI setup required. For explicit pipeline
        control (deploy only after tests pass, custom gates), run the CLI in CI with a{" "}
        <Code>DEPLO_TOKEN</Code> — see <A href="/docs/cli/ci">CI Usage</A>.
      </P>
    </>
  );
}

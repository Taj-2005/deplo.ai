import type { Metadata } from "next";
import {
  PageTitle,
  H2,
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
  title: "Command Reference",
  description: "Every command: purpose, syntax, flags, examples, and expected output.",
};

export default function CliCommands() {
  return (
    <>
      <PageTitle lead="Every deplo command, in the order the CLI defines them — purpose, flags, and the exact output you should expect. All commands exit 0 on success and 1 on any failure.">
        Command Reference
      </PageTitle>

      <P>
        Conventions in the output samples: <Code>✓</Code> success, <Code>✗</Code> failure, <Code>→</Code> progress
        step, <Code>●</Code> live. Output is colored (green = live, red = failed, cyan = URLs and actions, violet =
        AI content); set <Code>NO_COLOR</Code> to disable. <Code>deplo --help</Code> and{" "}
        <Code>deplo &lt;command&gt; --help</Code> print usage; <Code>deplo --version</Code> prints{" "}
        <Code>0.1.0</Code>.
      </P>

      <H2>deplo</H2>
      <P>
        Bare <Code>deplo</Code> with no arguments is the same as <Code>deplo deploy</Code>: deploy the repository
        in the current directory and follow the live log. See <A href="#deplo-deploy">deplo deploy</A> below for
        flags and output.
      </P>
      <CodeBlock language="bash" code={`deplo`} />

      <H2>deplo login</H2>
      <P>
        Sign in with GitHub in the browser. Starts a loopback listener, opens the authorization page, and stores
        the resulting token at <Code>~/.config/deplo/config.json</Code> (mode <Code>0600</Code>). Full mechanics in{" "}
        <A href="/docs/cli/authentication">Authentication</A>.
      </P>
      <CodeBlock language="bash" code={`deplo login [--token [token]]`} />
      <DocTable head={["Flag", "Description"]}>
        <Tr>
          <Td mono>--token [token]</Td>
          <Td>
            Paste a CLI token from deplo.in → Settings instead of using the browser. Without a value, opens a
            masked prompt (recommended — keeps the token out of shell history).
          </Td>
        </Tr>
      </DocTable>
      <CodeBlock
        language="text"
        title="expected output"
        code={`$ deplo login
→ opening https://www.deplo.in/cli-auth?port=52814&state=9f2c…&host=mbp.local
  (no browser? run \`deplo login --token\` and paste one instead)
✓ signed in patrickdev · token saved to /Users/patrick/.config/deplo/config.json`}
      />

      <H2>deplo logout</H2>
      <P>
        Remove the stored token from this machine. The token itself stays valid until revoked at deplo.in →
        Settings → CLI tokens. Running it while signed out just prints <Code>→ not signed in</Code>.
      </P>
      <CodeBlock language="bash" code={`deplo logout`} />
      <CodeBlock
        language="text"
        title="expected output"
        code={`$ deplo logout
✓ signed out — token removed from this machine
  revoke it fully at deplo.in → Settings → CLI tokens`}
      />

      <H2>deplo connect vercel</H2>
      <P>
        Authorize the deplo Vercel integration in the browser. The CLI opens the authorization URL and polls every
        few seconds until the connection appears (up to 5 minutes). If Vercel is already connected, it says so and
        exits.
      </P>
      <CodeBlock language="bash" code={`deplo connect vercel [--print-url]`} />
      <DocTable head={["Flag", "Description"]}>
        <Tr>
          <Td mono>--print-url</Td>
          <Td>Print the authorization URL instead of opening a browser — for SSH sessions and headless machines.</Td>
        </Tr>
      </DocTable>
      <CodeBlock
        language="text"
        title="expected output"
        code={`$ deplo connect vercel
→ opening Vercel authorization…  waiting
  (no browser here? deplo connect vercel --print-url)
✓ connected vercel: patrickdev`}
      />
      <P>
        With <Code>--print-url</Code>, open the printed link in any browser, authorize, then re-run{" "}
        <Code>deplo whoami</Code> to confirm. If nothing arrives within five minutes the CLI prints{" "}
        <Code>✗ timed out waiting for the connection (5 minutes)</Code> and exits 1.
      </P>

      <H2>deplo connect render</H2>
      <P>
        Connect Render with a Personal API key. Render has no third-party OAuth, so the CLI asks for a key (starts
        with <Code>rnd_</Code>) in a masked prompt and the platform validates it live against the Render API before
        storing it encrypted — an invalid key is never saved.
      </P>
      <CodeBlock language="bash" code={`deplo connect render [--key <key>]`} />
      <DocTable head={["Flag", "Description"]}>
        <Tr>
          <Td mono>--key &lt;key&gt;</Td>
          <Td>
            Provide the key non-interactively (scripts). Also the way to rotate the key when Render is already
            connected.
          </Td>
        </Tr>
      </DocTable>
      <CodeBlock
        language="text"
        title="expected output"
        code={`$ deplo connect render
  create one at https://dashboard.render.com/settings#api-keys
? Render API key (rnd_…) › ********
✓ connected render: patrickdev`}
      />
      <P>
        If Render is already connected and no <Code>--key</Code> is given, the CLI prints{" "}
        <Code>✓ render already connected (patrickdev)</Code> and hints{" "}
        <Code>pass --key to rotate the API key</Code>.
      </P>

      <H2>deplo whoami</H2>
      <P>Show the signed-in account and the provider connection checklist — the fastest way to see what is missing.</P>
      <CodeBlock language="bash" code={`deplo whoami`} />
      <CodeBlock
        language="text"
        title="expected output"
        code={`$ deplo whoami
✓ account              patrickdev
✓ vercel               patrickdev
✗ render               not connected  → deplo connect render`}
      />

      <H2 id="deplo-deploy">deplo deploy</H2>
      <P>
        Deploy the repository in the current directory and follow the live log. This is the full dashboard deploy
        loop: the CLI resolves your <Code>origin</Code> git remote to a repo the platform knows (syncing your repo
        list from GitHub on first sight), confirms, starts the deployment, and polls the log every 2.5 seconds
        until it reaches a terminal state.
      </P>
      <CodeBlock language="bash" code={`deplo deploy [-y|--yes]`} />
      <DocTable head={["Flag", "Description"]}>
        <Tr>
          <Td mono>-y, --yes</Td>
          <Td>
            Skip confirmation prompts. Also switches the run to non-interactive mode: missing login or provider
            connections become errors instead of inline prompts. Prompts are likewise skipped automatically when
            stdout is not a TTY (CI).
          </Td>
        </Tr>
      </DocTable>
      <P>Interactive niceties, in order:</P>
      <Ul>
        <Li>
          Not signed in? It asks <em>&ldquo;You&apos;re not signed in. Sign in now?&rdquo;</em> and runs login
          inline. Same for Vercel and Render: <em>&ldquo;Vercel isn&apos;t connected yet. Connect now?&rdquo;</em>
        </Li>
        <Li>
          If the deployment pauses on <Code>WAITING_FOR_ENV</Code>, the CLI prompts for each required environment
          variable (input masked), sends them, and the deployment resumes. See{" "}
          <A href="/docs/guides/environment-variables">Environment Variables</A>.
        </Li>
        <Li>
          Log lines containing errors are shown in red; AI diagnosis lines in violet — the same content as the
          dashboard log.
        </Li>
      </Ul>
      <CodeBlock
        language="text"
        title="expected output"
        code={`$ deplo deploy
→ repo detected github.com/patrickdev/my-app (main)
? Deploy patrickdev/my-app? … yes

  Analyzing repository…
  Detected: frontend=Next.js (client/) · backend=Express (server/)
  Deploying backend to Render…
  Backend live: https://deplo-my-app-api.onrender.com
  Injecting NEXT_PUBLIC_API_URL into frontend build
  Deploying frontend to Vercel…
  Frontend live: https://deplo-my-app-web.vercel.app
  Deployment completed

✓ backend live   https://deplo-my-app-api.onrender.com
✓ frontend live  https://deplo-my-app-web.vercel.app
● Deployed in 2:41 — code went in, production URLs came out.`}
      />
      <CodeBlock
        language="text"
        title="env prompt (when required variables are missing)"
        code={`→ this deployment needs 2 environment variables:
? DATABASE_URL › ********
? JWT_SECRET › ********
✓ env variables sent — resuming deployment`}
      />
      <P>
        On failure the CLI prints <Code>✗ Deployment failed — &lt;error&gt;</Code>, points at{" "}
        <Code>deplo.in/dashboard/deployments/&lt;id&gt;</Code> for the full log and AI diagnosis, and exits 1 — see{" "}
        <A href="/docs/cli/troubleshooting">Troubleshooting</A>.
      </P>

      <H2>deplo status</H2>
      <P>
        Latest deployment state for the repository in the current directory. Run outside a repo with a GitHub
        remote, it falls back to your most recent deployment overall.
      </P>
      <CodeBlock language="bash" code={`deplo status [--all]`} />
      <DocTable head={["Flag", "Description"]}>
        <Tr>
          <Td mono>--all</Td>
          <Td>Show the latest deployment for every project, not just this repo.</Td>
        </Tr>
      </DocTable>
      <CodeBlock
        language="text"
        title="expected output"
        code={`$ deplo status
● live  patrickdev/my-app (main)  Next.js + Express
   frontend  https://deplo-my-app-web.vercel.app
   backend   https://deplo-my-app-api.onrender.com`}
      />
      <P>
        Status labels: <Code>● live</Code>, <Code>✗ failed</Code>, <Code>○ cancelled</Code>,{" "}
        <Code>◐ waiting for env</Code>, and <Code>◌ deploying backend</Code>-style labels for in-flight states —
        see <A href="/docs/concepts/deployment-lifecycle">Deployment Lifecycle</A>. If the repo has never been
        deployed: <Code>→ no deployments yet for patrickdev/my-app — run deplo deploy</Code>.
      </P>

      <H2>deplo list</H2>
      <P>All projects with status, stack, and URLs — the latest deployment per repository, newest first.</P>
      <CodeBlock language="bash" code={`deplo list`} />
      <CodeBlock
        language="text"
        title="expected output"
        code={`$ deplo list
● live  patrickdev/my-app (main)  Next.js + Express
   frontend  https://deplo-my-app-web.vercel.app
   backend   https://deplo-my-app-api.onrender.com
✗ failed  patrickdev/side-project (main)  Vite + FastAPI
◐ waiting for env  patrickdev/api-service (develop)  Express`}
      />

      <H2>deplo logs</H2>
      <P>
        Print a deployment log. With no argument, uses the latest deployment for the current repo. For a finished
        deployment the log prints and exits; while a deployment is active, <Code>logs</Code> follows it live
        exactly like <Code>deplo deploy</Code> does — including env prompts and the final URL summary.
      </P>
      <CodeBlock language="bash" code={`deplo logs [id]`} />
      <DocTable head={["Argument", "Description"]}>
        <Tr>
          <Td mono>[id]</Td>
          <Td>A deployment id (shown in the dashboard URL). Defaults to the current repo&apos;s latest deployment.</Td>
        </Tr>
      </DocTable>
      <CodeBlock
        language="text"
        title="expected output (finished deployment)"
        code={`$ deplo logs
  Analyzing repository…
  Detected: frontend=Next.js (client/) · backend=Express (server/)
  Deploying backend to Render…
  Backend live: https://deplo-my-app-api.onrender.com
  Deploying frontend to Vercel…
  Frontend live: https://deplo-my-app-web.vercel.app
  Deployment completed`}
      />

      <H2>deplo open</H2>
      <P>Open the deployed frontend URL in your browser — or the backend, or the monitoring dashboard.</P>
      <CodeBlock language="bash" code={`deplo open [--api] [--dash]`} />
      <DocTable head={["Flag", "Description"]}>
        <Tr>
          <Td mono>--api</Td>
          <Td>Open the backend URL instead of the frontend.</Td>
        </Tr>
        <Tr>
          <Td mono>--dash</Td>
          <Td>
            Open the deplo <A href="/docs/guides/monitoring">monitoring dashboard</A> for this project.
          </Td>
        </Tr>
      </DocTable>
      <CodeBlock
        language="text"
        title="expected output"
        code={`$ deplo open
→ opening https://deplo-my-app-web.vercel.app`}
      />
      <P>
        <Code>--api</Code> and the default need a completed deployment; without one the CLI prints{" "}
        <Code>✗ nothing to open yet — run deplo deploy first</Code> and exits 1.
      </P>

      <Callout type="note" title="Planned for v0.2">
        <Code>deplo env set</Code> / <Code>deplo env ls</Code>, <Code>deplo monitor</Code>,{" "}
        <Code>deplo analytics</Code>, and a <Code>--json</Code> output mode are on the roadmap — they do not exist
        in v0.1.
      </Callout>
    </>
  );
}

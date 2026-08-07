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
  Pill,
  CardGrid,
  DocCard,
} from "@/components/docs/primitives";
import { CodeBlock } from "@/components/docs/CodeBlock";

export const metadata: Metadata = {
  title: "Overview & Installation",
  description: "The deplo CLI: install with npm, run with npx, requirements, and what it can do.",
};

export default function CliOverview() {
  return (
    <>
      <PageTitle lead="The deplo CLI brings the entire dashboard deploy loop to your terminal: sign in, connect your providers once, then run one command inside any repository to get live production URLs — frontend in your Vercel account, backend in your Render workspace.">
        Overview &amp; Installation
      </PageTitle>

      <P>
        The CLI is a thin, honest client for the same{" "}
        <A href="/docs/api">REST API</A> the dashboard uses. Nothing builds on your machine — <Code>deplo</Code>{" "}
        detects the repository from your git remote, asks the platform to deploy it, and streams the live log
        (including env-variable prompts and the AI failure diagnosis) back to your terminal.
      </P>

      <H2>Install</H2>
      <P>
        The package is <Code>@deplo.ai/cli</Code> and the binary it installs is <Code>deplo</Code>. Run it one-off
        with npx, or install globally:
      </P>
      <CodeBlock
        language="bash"
        title="one-off (always latest)"
        code={`npx @deplo.ai/cli login
npx @deplo.ai/cli`}
      />
      <CodeBlock
        language="bash"
        title="global install"
        code={`npm i -g @deplo.ai/cli
deplo login
deplo`}
      />
      <Callout type="warning" title="Package name">
        Always <Code>npx @deplo.ai/cli</Code> — the bare <Code>deplo</Code> package on npm is a different,
        unrelated package. Once installed globally, the command itself is <Code>deplo</Code>.
      </Callout>

      <H2>Requirements</H2>
      <Ul>
        <Li>
          <strong>Node.js 20 or newer</strong> — check with <Code>node --version</Code>.
        </Li>
        <Li>
          <strong>git</strong> on your <Code>PATH</Code> — the CLI reads the current directory&apos;s{" "}
          <Code>origin</Code> remote to identify the repository.
        </Li>
        <Li>
          <strong>A GitHub repository with a remote</strong> — deployments always start from the repo on GitHub,
          not from your local files.
        </Li>
        <Li>
          A deplo.ai account with <A href="/docs/integrations/vercel">Vercel</A> and{" "}
          <A href="/docs/integrations/render">Render</A> connected — the CLI offers both connections inline the
          first time you deploy.
        </Li>
      </Ul>

      <H2>Two commands to production</H2>
      <CodeBlock
        language="text"
        title="terminal"
        code={`$ deplo login
→ opening https://www.deplo.in/cli-auth?port=52814&state=9f2c…&host=mbp.local
  (no browser? run \`deplo login --token\` and paste one instead)
✓ signed in patrickdev · token saved to /Users/patrick/.config/deplo/config.json

$ cd my-app
$ deplo
→ repo detected github.com/patrickdev/my-app (main)
? Deploy patrickdev/my-app? … yes

  Analyzing repository…
  Detected: frontend=Next.js (client/) · backend=Express (server/)
  Deploying backend to Render…
  Backend live: https://deplo-my-app-api.onrender.com
  Deploying frontend to Vercel…
  Frontend live: https://deplo-my-app-web.vercel.app
  Deployment completed

✓ backend live   https://deplo-my-app-api.onrender.com
✓ frontend live  https://deplo-my-app-web.vercel.app
● Deployed in 2:41 — code went in, production URLs came out.`}
      />
      <P>
        Bare <Code>deplo</Code> is an alias for <Code>deplo deploy</Code> — running the command with no arguments
        deploys the repository in the current directory and follows the live log.
      </P>

      <H2>What ships in v0.1</H2>
      <DocTable head={["Area", "Status", "Details"]}>
        <Tr>
          <Td>Login, logout, whoami</Td>
          <Td>
            <Pill variant="live" />
          </Td>
          <Td>Browser hand-off or pasted token; provider connection checklist</Td>
        </Tr>
        <Tr>
          <Td>Connect Vercel / Render</Td>
          <Td>
            <Pill variant="live" />
          </Td>
          <Td>Vercel OAuth in the browser; Render via masked API-key prompt</Td>
        </Tr>
        <Tr>
          <Td>Deploy with live log</Td>
          <Td>
            <Pill variant="live" />
          </Td>
          <Td>Stack detection, env prompts, AI diagnosis on failure, exit code gates CI</Td>
        </Tr>
        <Tr>
          <Td>Status, list, logs, open</Td>
          <Td>
            <Pill variant="live" />
          </Td>
          <Td>Deployment state per repo or across all projects; open URLs from the terminal</Td>
        </Tr>
        <Tr>
          <Td>
            <Code>env set</Code> / <Code>env ls</Code>, <Code>monitor</Code>, <Code>analytics</Code>,{" "}
            <Code>--json</Code> output
          </Td>
          <Td>
            <Pill variant="planned">v0.2</Pill>
          </Td>
          <Td>Manage env vars and read monitoring data without the dashboard</Td>
        </Tr>
        <Tr>
          <Td>Standalone binaries, Homebrew</Td>
          <Td>
            <Pill variant="planned">v0.3</Pill>
          </Td>
          <Td>Install without Node</Td>
        </Tr>
      </DocTable>

      <H2>Dive in</H2>
      <CardGrid>
        <DocCard
          href="/docs/cli/setup"
          title="Setup Guide"
          description="Complete first-run setup on a new machine: prerequisites through first deploy."
        />
        <DocCard
          href="/docs/cli/authentication"
          title="Authentication"
          description="Browser hand-off login, CLI tokens, headless machines, and CI."
        />
        <DocCard
          href="/docs/cli/commands"
          title="Command Reference"
          description="Every command: purpose, syntax, flags, examples, and expected output."
        />
        <DocCard
          href="/docs/cli/configuration"
          title="Configuration"
          description="The config file, environment variables, and pointing the CLI at another API."
        />
        <DocCard
          href="/docs/cli/ci"
          title="CI Usage"
          description="Running deplo in GitHub Actions and other CI systems with DEPLO_TOKEN."
        />
        <DocCard
          href="/docs/cli/troubleshooting"
          title="Troubleshooting"
          description="CLI-specific issues: login loops, token errors, repo matching, and connectivity."
        />
      </CardGrid>
    </>
  );
}

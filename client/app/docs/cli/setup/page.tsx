import type { Metadata } from "next";
import {
  PageTitle,
  H2,
  P,
  A,
  Code,
  Callout,
  Steps,
  Step,
  Ul,
  Li,
} from "@/components/docs/primitives";
import { CodeBlock } from "@/components/docs/CodeBlock";

export const metadata: Metadata = {
  title: "Setup Guide",
  description: "Complete first-run setup on a new machine: prerequisites through first deploy.",
};

export default function CliSetup() {
  return (
    <>
      <PageTitle lead="Everything needed to go from a fresh machine to a live deployment with the deplo CLI — install, authenticate, connect Vercel and Render, deploy. Five minutes if your accounts already exist.">
        Setup Guide
      </PageTitle>

      <H2>Prerequisites</H2>
      <Ul>
        <Li>
          <strong>Node.js 20+</strong> and <strong>npm</strong> — <Code>node --version</Code> should print{" "}
          <Code>v20</Code> or higher.
        </Li>
        <Li>
          <strong>git</strong> — the CLI identifies your project from its <Code>origin</Code> remote.
        </Li>
        <Li>
          A <A href="https://github.com">GitHub</A> account with a repository that has a GitHub remote.
        </Li>
        <Li>
          A free <A href="https://vercel.com">Vercel</A> account (frontend hosting) and a free{" "}
          <A href="https://render.com">Render</A> account (backend hosting). deplo.ai deploys into accounts{" "}
          <em>you</em> own.
        </Li>
      </Ul>

      <Steps>
        <Step title="Install the CLI">
          <P>
            Install globally to get the <Code>deplo</Code> command, or skip installation entirely and prefix every
            command with <Code>npx @deplo.ai/cli</Code>:
          </P>
          <CodeBlock language="bash" code={`npm i -g @deplo.ai/cli`} />
        </Step>

        <Step title="Verify the installation">
          <CodeBlock language="bash" code={`deplo --help`} />
          <P>
            You should see the command list and the tagline &ldquo;Deploy full-stack apps into your own Vercel +
            Render accounts.&rdquo; <Code>deplo --version</Code> prints <Code>0.1.0</Code>.
          </P>
        </Step>

        <Step title="Sign in">
          <CodeBlock language="bash" code={`deplo login`} />
          <P>
            This opens your browser to an authorization page; click <strong>Authorize</strong> and return to the
            terminal. On a machine without a browser (SSH, containers), use <Code>deplo login --token</Code> and
            paste a token created at deplo.in → Settings → CLI tokens. Details in{" "}
            <A href="/docs/cli/authentication">Authentication</A>.
          </P>
          <CodeBlock
            language="text"
            title="expected output"
            code={`→ opening https://www.deplo.in/cli-auth?port=52814&state=9f2c…&host=mbp.local
  (no browser? run \`deplo login --token\` and paste one instead)
✓ signed in patrickdev · token saved to /Users/patrick/.config/deplo/config.json`}
          />
        </Step>

        <Step title="Connect Vercel and Render">
          <P>Check what is connected, then connect whatever is missing:</P>
          <CodeBlock
            language="bash"
            code={`deplo whoami
deplo connect vercel
deplo connect render`}
          />
          <P>
            <Code>connect vercel</Code> opens a one-click OAuth authorization in the browser.{" "}
            <Code>connect render</Code> asks for a Render Personal API key (starts with <Code>rnd_</Code>) in a
            masked prompt — create one at{" "}
            <A href="https://dashboard.render.com/settings#api-keys">Render → Account Settings → API Keys</A>.
          </P>
          <Callout type="tip">
            You can skip this step. If a provider is missing when you run <Code>deplo</Code> interactively, the CLI
            asks &ldquo;Vercel isn&apos;t connected yet. Connect now?&rdquo; and runs the connection inline.
          </Callout>
        </Step>

        <Step title="Deploy">
          <P>From inside any cloned repository with a GitHub remote:</P>
          <CodeBlock
            language="bash"
            code={`cd my-app
deplo`}
          />
          <P>
            The CLI detects the repo from your git remote, confirms, then follows the live deployment log. If the
            deployment needs environment variables, you are prompted for each one (input is masked) and the
            deployment resumes automatically. It ends with your production URLs and{" "}
            <Code>● Deployed in 2:41</Code> — or, on failure, a pointer to the full log and AI diagnosis. See the{" "}
            <A href="/docs/cli/commands">Command Reference</A> for the full output.
          </P>
        </Step>
      </Steps>

      <H2>Updating</H2>
      <P>
        <Code>npx @deplo.ai/cli</Code> always runs the latest published version. A global install is updated
        explicitly:
      </P>
      <CodeBlock language="bash" code={`npm i -g @deplo.ai/cli@latest`} />

      <H2>Uninstalling</H2>
      <CodeBlock
        language="bash"
        code={`npm uninstall -g @deplo.ai/cli
rm -rf ~/.config/deplo`}
      />
      <P>
        Removing <Code>~/.config/deplo</Code> deletes the stored token from the machine, but the token itself
        remains valid server-side — revoke it at deplo.in → Settings → CLI tokens. Your projects, deployments, and
        provider connections live on the platform and are untouched by uninstalling the CLI.
      </P>
    </>
  );
}

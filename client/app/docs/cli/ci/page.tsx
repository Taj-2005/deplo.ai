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
  DocTable,
  Tr,
  Td,
  Pill,
} from "@/components/docs/primitives";
import { CodeBlock } from "@/components/docs/CodeBlock";

export const metadata: Metadata = {
  title: "CI Usage",
  description: "Running deplo in GitHub Actions and other CI systems with DEPLO_TOKEN.",
};

export default function CliCi() {
  return (
    <>
      <PageTitle lead="Run deplo deploy --yes in a pipeline with a DEPLO_TOKEN secret and the exit code gates the rest of your workflow — the full deployment log, including the AI diagnosis on failure, lands in your CI output.">
        CI Usage
      </PageTitle>

      <Callout type="note" title="Do you need the CLI in CI?">
        Once a repository has deployed, the platform&apos;s GitHub webhook redeploys it automatically on every push
        — no CI required. Use the CLI in CI when you want more than fire-and-forget: run tests first, make the
        pipeline <em>wait</em> for the deployment and fail when it fails, and keep the deploy log next to your
        build log. The two compose fine; a CLI-triggered deploy is just a deploy.
      </Callout>

      <H2>Setup</H2>
      <Steps>
        <Step title="Create a dedicated CLI token">
          <P>
            At <strong>deplo.in → Settings → CLI tokens</strong>, create a token named for the pipeline (for
            example <Code>github-actions</Code>). A dedicated token can be revoked without signing your laptop out,
            and its <Code>lastUsedAt</Code> in Settings tells you the pipeline is actually using it. The token is
            shown once — copy it now.
          </P>
        </Step>
        <Step title="Store it as a CI secret">
          <P>
            In GitHub: repository → Settings → Secrets and variables → Actions → <strong>New repository
            secret</strong>, named <Code>DEPLO_TOKEN</Code>. Never commit the token; the{" "}
            <Code>DEPLO_TOKEN</Code> environment variable overrides the config file precisely so nothing needs to
            be written to disk in CI (see <A href="/docs/cli/configuration">Configuration</A>).
          </P>
        </Step>
        <Step title="Run the deploy">
          <CodeBlock language="bash" code={`npx @deplo.ai/cli deploy --yes`} />
          <P>
            <Code>--yes</Code> skips the confirmation prompt. In CI there is no TTY, so the CLI never prompts
            anyway — missing prerequisites become errors with clear messages instead of interactive questions, for
            example <Code>✗ not signed in — run deplo login (or set DEPLO_TOKEN)</Code> or{" "}
            <Code>✗ vercel is not connected — run deplo connect vercel</Code>.
          </P>
        </Step>
      </Steps>

      <H2>Environment variables must exist before CI deploys</H2>
      <P>
        Interactively, <Code>deplo</Code> prompts for required environment variables when a deployment pauses on{" "}
        <Code>WAITING_FOR_ENV</Code>. In CI it cannot prompt — the run fails pointing at the dashboard URL where
        the variables can be provided. Do the first deploy of a repository from the dashboard or your terminal so
        all required variables are captured; CI redeploys reuse them. See{" "}
        <A href="/docs/guides/environment-variables">Environment Variables</A>.
      </P>

      <H2>GitHub Actions workflow</H2>
      <CodeBlock
        language="yaml"
        title=".github/workflows/deploy.yml"
        code={`name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Run tests
        run: npm ci && npm test

      - name: Deploy with deplo
        run: npx @deplo.ai/cli deploy --yes
        env:
          DEPLO_TOKEN: \${{ secrets.DEPLO_TOKEN }}`}
      />
      <P>
        The checkout step is only there for your tests — deplo deploys from the repository on GitHub, not from the
        runner&apos;s working copy, using the <Code>origin</Code> remote that <Code>actions/checkout</Code> sets
        up. Make sure unpushed commits are not what you expect to ship.
      </P>

      <H2>Exit codes gate the pipeline</H2>
      <DocTable head={["Exit code", "Meaning"]}>
        <Tr>
          <Td mono>0</Td>
          <Td>Deployment completed — both URLs live.</Td>
        </Tr>
        <Tr>
          <Td mono>1</Td>
          <Td>
            Anything else: deployment failed or was cancelled, missing token or provider connection, repo not
            visible, network error.
          </Td>
        </Tr>
      </DocTable>
      <P>
        Because <Code>deploy</Code> follows the deployment to a terminal state before exiting, any step placed
        after it (smoke tests, notifications) runs against the live URLs — or not at all. The full log streams into
        the CI output as it happens, and on failure the last lines include the error plus a pointer to the
        dashboard&apos;s full log and AI diagnosis:
      </P>
      <CodeBlock
        language="text"
        title="failed run (CI log)"
        code={`  Deploying backend to Render…
  error: build failed — Cannot find module 'express'
  AI diagnosis: express is imported in server/src/index.ts but missing from dependencies

✗ Deployment failed — build failed
  full log + AI diagnosis: deplo.in/dashboard/deployments/dep_8f31a2`}
      />

      <H2>Roadmap</H2>
      <P>
        <Pill variant="planned">v0.2</Pill> A <Code>--json</Code> output mode for machine-readable results (URLs,
        deployment id, status) so pipelines can stop parsing human-oriented text.
      </P>
    </>
  );
}

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
  title: "GitHub",
  description: "OAuth sign-in, repository access, the GitHub App for private repos, and webhooks.",
};

export default function GitHubIntegration() {
  return (
    <>
      <PageTitle lead="GitHub is both your identity on deplo.ai and the source of everything it deploys. This page covers exactly what access sign-in grants, how repositories sync, what private repos additionally need, and how push-triggered redeploys work.">
        GitHub
      </PageTitle>

      <H2>Sign-in and OAuth scopes</H2>
      <P>
        There is no email/password registration — <strong>Sign in with GitHub</strong> is the only way in, and the
        first sign-in creates your account. The OAuth authorization screen requests four scopes:
      </P>
      <DocTable head={["Scope", "Grants", "Why deplo.ai needs it"]}>
        <Tr>
          <Td mono>read:user</Td>
          <Td>Your public profile</Td>
          <Td>Account identity — name, username, avatar.</Td>
        </Tr>
        <Tr>
          <Td mono>user:email</Td>
          <Td>Your email addresses</Td>
          <Td>Account email, used for deployment notification emails.</Td>
        </Tr>
        <Tr>
          <Td mono>repo</Td>
          <Td>Repository access</Td>
          <Td>
            Reading your repo&apos;s file tree and individual files during stack analysis, and repo-based backend
            deploys to Render.
          </Td>
        </Tr>
        <Tr>
          <Td mono>admin:repo_hook</Td>
          <Td>Repository webhooks</Td>
          <Td>Registering the push webhook that powers automatic redeploys (see below).</Td>
        </Tr>
      </DocTable>
      <P>
        After the OAuth exchange, the GitHub access token is stored AES-256-GCM encrypted and a deplo.ai JWT is
        issued for your session. Neither is ever returned by the API. See{" "}
        <A href="/docs/concepts/authentication">Authentication &amp; Security</A> for the full trust model.
      </P>

      <H2>Repository syncing</H2>
      <P>
        deplo.ai keeps its own lightweight index of your repositories — name, default branch, visibility, language —
        so the dashboard and CLI can list and match them without hitting GitHub on every request. Syncing happens:
      </P>
      <Ul>
        <Li>
          <strong>Automatically on sign-in</strong> — every login refreshes the index from GitHub, paginated across
          all repos you own, collaborate on, or can access through an organization.
        </Li>
        <Li>
          <strong>On demand</strong> — the <strong>Sync</strong> button on{" "}
          <A href="https://www.deplo.in/dashboard/repositories">Dashboard → Repositories</A>, which calls{" "}
          <Code>POST /api/v1/repos/sync</Code>.
        </Li>
        <Li>
          <strong>On the CLI&apos;s first deploy</strong> — when <Code>deplo</Code> can&apos;t match your working
          directory&apos;s git remote to a known repo, it syncs from GitHub before matching again.
        </Li>
      </Ul>
      <CodeBlock
        language="http"
        title="force a fresh sync"
        code={`POST /api/v1/repos/sync
Authorization: Bearer <token>

{ "synced": 42 }`}
      />
      <P>
        The repo list is cached for five minutes, and a sync busts the cache — so a repository created seconds ago
        appears as soon as you hit Sync. See the <A href="/docs/api/repositories">Repositories API</A> for the
        endpoints.
      </P>

      <H2>Private repositories and the GitHub App</H2>
      <P>
        OAuth sign-in covers your identity and public repositories. For <strong>private repositories</strong> deplo.ai
        additionally uses the deplo GitHub App: installing it grants repository access explicitly, per account or
        organization, with a repo-by-repo selection — which is both more precise and required for organizations that
        restrict OAuth app access. The dashboard prompts you to install it when a deploy needs it, and the CLI prints
        a hint pointing at <strong>Dashboard → Repositories → Configure access</strong>.
      </P>
      <P>
        You can review or change the installation any time at{" "}
        <A href="https://github.com/settings/installations">github.com/settings/installations</A> — including
        widening or narrowing which repositories it can see.
      </P>
      <Callout type="tip">
        A repository missing from the dashboard list is almost always an access-grant issue, not a sync issue: check
        the GitHub App&apos;s repository selection first, then hit Sync. More in{" "}
        <A href="/docs/guides/troubleshooting">Troubleshooting</A>.
      </Callout>

      <H2>Webhooks and push-to-deploy</H2>
      <P>
        During a deployment, deplo.ai registers a <Code>push</Code> webhook on the repository (this is what{" "}
        <Code>admin:repo_hook</Code> is for). Registration is best-effort and idempotent — if it fails, the
        deployment still succeeds, and if the hook already exists it&apos;s skipped. Once the hook is in place,
        every push triggers an automatic redeploy:
      </P>
      <Ul>
        <Li>
          GitHub delivers the push event to deplo.ai&apos;s webhook endpoint; the payload signature is verified with
          an HMAC-SHA256 shared secret before anything else happens.
        </Li>
        <Li>
          deplo.ai looks up the repository and creates a new deployment for the <em>pushed branch</em>.
        </Li>
        <Li>
          If a previous deployment of that repo and branch already has a detected stack and environment variables,
          the configuration is <strong>reused</strong> and the push goes straight to deploy — no re-analysis, no env
          prompts. The log shows{" "}
          <em>&ldquo;Auto-redeployment triggered by GitHub push — reusing previous configuration.&rdquo;</em>
        </Li>
        <Li>
          Otherwise the push runs the full pipeline from analysis, which may pause at{" "}
          <Code>WAITING_FOR_ENV</Code> if required variables are missing — see{" "}
          <A href="/docs/guides/environment-variables">Environment Variables</A>.
        </Li>
      </Ul>
      <P>
        In practice: deploy once from the dashboard or CLI, and from then on <Code>git push</Code> is your deploy
        button. Existing Vercel projects and Render services are reused idempotently — see{" "}
        <A href="/docs/guides/deployments">Deployments</A> for the pipeline details.
      </P>

      <H2>Branch handling</H2>
      <P>
        Deployments started from the dashboard or CLI always use the repository&apos;s <strong>default branch</strong>{" "}
        (usually <Code>main</Code>). Webhook-triggered redeploys use whichever branch was pushed, reusing the last
        configuration recorded for that branch. There is no branch picker in the UI today — deploying a non-default
        branch as a first deploy is not yet supported.
      </P>

      <H2>Revoking access</H2>
      <P>Two things to revoke, both on GitHub&apos;s side:</P>
      <Ul>
        <Li>
          <strong>The OAuth authorization</strong> — GitHub → Settings → Applications →{" "}
          <A href="https://github.com/settings/applications">Authorized OAuth Apps</A> → deplo.ai → Revoke. This
          invalidates the stored access token; sign-in, repo syncing, and analysis stop working until you sign in
          again.
        </Li>
        <Li>
          <strong>The GitHub App installation</strong> —{" "}
          <A href="https://github.com/settings/installations">github.com/settings/installations</A> → deplo →
          Uninstall (or narrow its repository selection instead).
        </Li>
      </Ul>
      <Callout type="note">
        Webhooks that were registered on your repositories live in each repo&apos;s own settings
        (Settings → Webhooks) and are not removed by revoking the OAuth grant — delete them there if you want pushes
        to stop reaching deplo.ai entirely.
      </Callout>
    </>
  );
}

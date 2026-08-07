import type { Metadata } from "next";
import {
  PageTitle,
  H2,
  H3,
  P,
  A,
  Code,
  Steps,
  Step,
  Ul,
  Li,
  DocTable,
  Tr,
  Td,
} from "@/components/docs/primitives";
import { CodeBlock } from "@/components/docs/CodeBlock";

export const metadata: Metadata = {
  title: "Authentication & Security",
  description: "OAuth flows, JWTs, CLI tokens, credential encryption, and the trust model.",
};

export default function AuthenticationAndSecurity() {
  return (
    <>
      <PageTitle lead="How you authenticate with deplo.ai (GitHub OAuth → JWT, or a CLI token), how deplo.ai authenticates with your providers (encrypted per-user credentials), and why the trust model means you can walk away at any time.">
        Authentication &amp; Security
      </PageTitle>

      <H2>Signing in with GitHub</H2>
      <P>
        GitHub OAuth is the only sign-in method — signing in creates your account, so there is no separate
        registration. The flow runs entirely through the frontend domain (the{" "}
        <A href="/docs/concepts/architecture">rewrite proxy</A> forwards it to the backend):
      </P>
      <Steps>
        <Step title="Authorize">
          <P>
            The app sends you to <Code>GET /api/v1/auth/github</Code>, which redirects to GitHub&apos;s authorize page
            with deplo.ai&apos;s client ID and the scopes below.
          </P>
        </Step>
        <Step title="Callback">
          <P>
            GitHub redirects back to <Code>GET /api/v1/auth/github/callback</Code> with a one-time code. The backend
            exchanges it for a GitHub access token, upserts your user record, and stores the GitHub token AES-256-GCM
            encrypted — it is needed later to read repository trees and file contents during analysis.
          </P>
        </Step>
        <Step title="JWT issued">
          <P>
            The backend signs a JWT and redirects to the dashboard&apos;s <Code>/auth/callback</Code> page, which
            stores the token and takes you to your dashboard.
          </P>
        </Step>
      </Steps>

      <H3>Requested scopes</H3>
      <DocTable head={["Scope", "Why deplo.ai needs it"]}>
        <Tr>
          <Td mono>read:user</Td>
          <Td>Your profile (name, avatar) for the account.</Td>
        </Tr>
        <Tr>
          <Td mono>user:email</Td>
          <Td>Your email address, used for deployment lifecycle emails.</Td>
        </Tr>
        <Tr>
          <Td mono>repo</Td>
          <Td>Reading repository trees and file contents during analysis and deployment, including private repos.</Td>
        </Tr>
        <Tr>
          <Td mono>admin:repo_hook</Td>
          <Td>Registering deploy webhooks on repositories (covers organization repos too).</Td>
        </Tr>
      </DocTable>

      <H3>JWT properties</H3>
      <Ul>
        <Li>
          Signed with <strong>HS256</strong>, valid for <strong>7 days</strong> — after that you sign in again; there
          are no refresh tokens.
        </Li>
        <Li>
          Stored in <Code>localStorage</Code> (not a cookie) and sent as{" "}
          <Code>Authorization: Bearer &lt;jwt&gt;</Code> on every API call.
        </Li>
        <Li>
          Requests are same-origin (<Code>www.deplo.in/api/v1/…</Code>); the Vercel rewrite forwards the header to the
          backend verbatim. Because auth is header-based rather than cookie-based, CSRF and SameSite concerns do not
          apply.
        </Li>
      </Ul>

      <H2>CLI tokens</H2>
      <P>
        A 7-day browser JWT is wrong for a terminal, so the <A href="/docs/cli">CLI</A> uses long-lived, revocable
        tokens instead. They authenticate the exact same REST API — the auth middleware sees the <Code>dpl_</Code>{" "}
        prefix on the bearer token and resolves it as a CLI token instead of verifying a JWT.
      </P>
      <Ul>
        <Li>
          Format: <Code>dpl_</Code> followed by 40 hex characters, generated from cryptographically secure random
          bytes.
        </Li>
        <Li>
          The raw token is shown <strong>exactly once</strong>, at creation. Only its SHA-256 hash is stored, so a
          database leak never exposes usable credentials.
        </Li>
        <Li>
          Tokens are named (so you know which machine is which), record when they were last used, and are revocable
          individually in <strong>Settings → CLI tokens</strong> or via{" "}
          <A href="/docs/api/cli-tokens">the CLI tokens API</A>. Revocation is immediate.
        </Li>
      </Ul>

      <H3>How deplo login works</H3>
      <P>
        <Code>deplo login</Code> uses a browser hand-off so the token never transits anywhere except your own machine:
      </P>
      <Steps>
        <Step title="CLI opens the browser">
          <P>
            The CLI starts a loopback listener on <Code>127.0.0.1</Code> and opens{" "}
            <Code>www.deplo.in/cli-auth</Code> with the loopback port, a random state nonce, and your machine&apos;s
            hostname. If you are not signed in, the page bounces you through GitHub OAuth first and returns.
          </P>
        </Step>
        <Step title="You explicitly authorize">
          <P>
            The page shows exactly what will happen — &ldquo;This creates a CLI token for{" "}
            <Code>your-machine</Code>&rdquo; — and mints the token only when you click <strong>Authorize</strong>. The
            token is named after the machine (e.g. <Code>CLI · macbook-pro</Code>) so it is recognizable in Settings.
          </P>
        </Step>
        <Step title="Loopback delivery">
          <P>
            The browser redirects to <Code>http://127.0.0.1:&lt;port&gt;/callback</Code> with the token and the state
            nonce — a loopback address only, never a remote host. The CLI verifies the state and stores the token
            locally.
          </P>
        </Step>
      </Steps>
      <P>
        On headless machines (SSH, CI) there is no browser to hand off to: create a token in{" "}
        <strong>Settings → CLI tokens</strong> and pass it with <Code>deplo login --token</Code>. See{" "}
        <A href="/docs/cli/authentication">CLI Authentication</A>.
      </P>

      <H2>Provider credentials</H2>
      <P>
        deplo.ai deploys with credentials <em>you</em> connect, stored per user in a single{" "}
        <Code>ProviderConnection</Code> table with the credential AES-256-GCM encrypted at rest:
      </P>
      <DocTable head={["Provider", "Credential", "How it's obtained", "Validated"]}>
        <Tr>
          <Td>GitHub</Td>
          <Td>OAuth access token</Td>
          <Td>Sign-in flow above</Td>
          <Td>By the OAuth exchange itself</Td>
        </Tr>
        <Tr>
          <Td>Vercel</Td>
          <Td>Integration OAuth token</Td>
          <Td>One-click integration install (redirect secured with a signed JWT state parameter)</Td>
          <Td>Token exchange + account info check before storing</Td>
        </Tr>
        <Tr>
          <Td>Render</Td>
          <Td>
            Personal API key (<Code>rnd_…</Code>)
          </Td>
          <Td>You paste it in Dashboard → Integrations (Render has no third-party OAuth)</Td>
          <Td>
            Live call to Render&apos;s <Code>GET /v1/owners</Code> <em>before</em> storing — invalid keys are never
            saved
          </Td>
        </Tr>
      </DocTable>
      <Ul>
        <Li>
          Credentials are decrypted only inside the deployment orchestrator, at deploy time, and are never logged.
        </Li>
        <Li>
          No API ever returns a stored credential. <Code>GET /integrations</Code> returns connection status and
          workspace metadata only; the UI shows a masked key (<Code>rnd_••••</Code>) that is never revealed again.
        </Li>
        <Li>
          Rotation is just reconnecting with a new key; disconnecting deletes the connection. You can also revoke from
          the provider side at any time — the Vercel integration in your Vercel dashboard, the API key in Render.
        </Li>
      </Ul>

      <H2>Platform security posture</H2>
      <Ul>
        <Li>All API traffic is rate limited to 200 requests per 15 minutes per IP.</Li>
        <Li>
          Helmet security headers, a strict CORS allowlist, and JSON body limits on the backend; security headers on
          the frontend.
        </Li>
        <Li>SQL access goes exclusively through Prisma&apos;s parameterized queries.</Li>
        <Li>Secrets never appear in logs or in the repository; env vars are validated at boot.</Li>
      </Ul>

      <H2>The trust model, summarized</H2>
      <P>
        deplo.ai&apos;s job is to <em>act on your behalf, revocably</em> — never to hold your infrastructure:
      </P>
      <CodeBlock
        language="text"
        title="what deplo.ai holds vs. what you own"
        code={`deplo.ai holds            you own
────────────────          ─────────────────────────────
GitHub OAuth token         the repository
Vercel OAuth token         the Vercel account + projects
Render API key             the Render workspace + services
  (all AES-256-GCM         the domains, the traffic,
   encrypted, revocable)   the provider bill`}
      />
      <P>
        Your applications run in your Vercel and Render accounts; deplo.ai is not in the serving path and hosts
        nothing. Revoke the GitHub authorization, the Vercel integration, and the Render key, and deplo.ai can touch
        nothing of yours — while everything it ever deployed keeps running untouched. That is the point:{" "}
        <strong>the platform is useful because it can act for you, and safe because you can stop it at any time.</strong>
      </P>

      <H2>Related pages</H2>
      <Ul>
        <Li>
          <A href="/docs/api/authentication">Authentication API</A> — the endpoints behind these flows.
        </Li>
        <Li>
          <A href="/docs/cli/authentication">CLI Authentication</A> — login, tokens, headless machines, CI.
        </Li>
        <Li>
          <A href="/docs/integrations/vercel">Vercel</A> and <A href="/docs/integrations/render">Render</A> —
          connecting each provider step by step.
        </Li>
      </Ul>
    </>
  );
}

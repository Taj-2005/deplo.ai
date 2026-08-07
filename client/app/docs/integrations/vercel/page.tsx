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
  FlowDiagram,
} from "@/components/docs/primitives";
import { CodeBlock } from "@/components/docs/CodeBlock";

export const metadata: Metadata = {
  title: "Vercel",
  description: "Connecting your Vercel account and how frontend deployments land in it.",
};

export default function VercelIntegration() {
  return (
    <>
      <PageTitle lead="Frontends deploy into a Vercel account you own. Connecting it is a one-click integration OAuth flow; afterwards, every frontend deplo.ai ships shows up in your Vercel dashboard as a normal project you fully control.">
        Vercel
      </PageTitle>

      <H2>What the connection is</H2>
      <P>
        deplo.ai never hosts your frontend — it deploys into <em>your</em> Vercel account through the official
        deplo.ai Vercel integration. You&apos;re prompted to connect during onboarding, and can also connect from{" "}
        <A href="https://www.deplo.in/dashboard/integrations">Dashboard → Integrations</A> or the terminal with{" "}
        <Code>deplo connect vercel</Code>. Authorizing takes one click on Vercel&apos;s side; no keys to copy.
      </P>

      <H2>How the OAuth flow works</H2>
      <FlowDiagram
        steps={[
          { label: "GET /integrations/vercel/install-url", detail: "authenticated — returns the install link" },
          { label: "vercel.com/integrations/deplo/new", detail: "signed JWT state param identifies you (15 min expiry)" },
          { label: "You authorize on Vercel", detail: "pick your personal account or a team" },
          { label: "Callback → token exchange", detail: "state verified, code swapped for a long-lived token", accent: true },
          { label: "Account info fetched, token encrypted", detail: "AES-256-GCM, stored per-user" },
          { label: "Redirect back: ?vercel=connected", detail: "onboarding or Dashboard → Integrations" },
        ]}
      />
      <P>
        The <Code>state</Code> parameter is a short-lived signed JWT carrying your user id, so deplo.ai can identify
        you on the callback without a server-side session — and reject any callback whose state wasn&apos;t issued to
        you (CSRF protection). If anything fails, you&apos;re redirected back with the reason in the URL instead of a
        dead end.
      </P>

      <H2>What deplo.ai can do in your account</H2>
      <P>The stored token is used exclusively by the deployment pipeline and monitoring. Concretely, deplo.ai:</P>
      <Ul>
        <Li>
          <strong>Creates or reuses projects</strong> in your account (or the team you authorized), with the detected
          framework preset, root directory for monorepos, and build settings.
        </Li>
        <Li>
          <strong>Sets project environment variables</strong> — the values you provide, plus wiring like{" "}
          <Code>NEXT_PUBLIC_API_URL</Code> pointing at your freshly deployed backend.
        </Li>
        <Li>
          <strong>Uploads your build and triggers deployments</strong>, then polls until the deployment is ready.
        </Li>
        <Li>
          <strong>Reads the production domain</strong> — the <Code>*.vercel.app</Code> URL actually assigned to the
          project, which is what lands in your deployment log and monitoring.
        </Li>
      </Ul>

      <H2>Your projects stay yours</H2>
      <P>
        A frontend deployed by deplo.ai is indistinguishable from one you created by hand: it appears in your Vercel
        dashboard as a regular project. Custom domains, Vercel Analytics, preview settings, extra environment
        variables — all of it is managed on Vercel&apos;s side, by you, and none of it is touched by deplo.ai outside
        of a deploy. If you stop using deplo.ai tomorrow, every project keeps running untouched.
      </P>

      <H2>Framework presets</H2>
      <P>
        The <A href="/docs/guides/deployments">analysis engine</A> maps each detected frontend framework to the
        matching Vercel framework preset, so Vercel&apos;s own framework-aware build defaults apply instead of
        hand-rolled overrides:
      </P>
      <DocTable head={["Detected framework", "Vercel preset"]}>
        <Tr>
          <Td>Next.js</Td>
          <Td mono>nextjs</Td>
        </Tr>
        <Tr>
          <Td>Vite</Td>
          <Td mono>vite</Td>
        </Tr>
        <Tr>
          <Td>React (CRA)</Td>
          <Td mono>create-react-app</Td>
        </Tr>
        <Tr>
          <Td>Vue</Td>
          <Td mono>vue</Td>
        </Tr>
        <Tr>
          <Td>Nuxt</Td>
          <Td mono>nuxtjs</Td>
        </Tr>
        <Tr>
          <Td>Angular</Td>
          <Td mono>angular</Td>
        </Tr>
        <Tr>
          <Td>Astro</Td>
          <Td mono>astro</Td>
        </Tr>
        <Tr>
          <Td>Svelte / SvelteKit</Td>
          <Td mono>svelte / sveltekit-1</Td>
        </Tr>
        <Tr>
          <Td>Remix</Td>
          <Td mono>remix</Td>
        </Tr>
        <Tr>
          <Td>Gatsby</Td>
          <Td mono>gatsby</Td>
        </Tr>
        <Tr>
          <Td>Static HTML</Td>
          <Td>no preset — served as static files</Td>
        </Tr>
      </DocTable>

      <H2>Token storage and security</H2>
      <Ul>
        <Li>
          The OAuth token is encrypted with AES-256-GCM before it touches the database, in the per-user provider
          connection record.
        </Li>
        <Li>
          It is <strong>never returned by any API</strong> — <Code>GET /api/v1/integrations</Code> reports only the
          connection status and account/team names.
        </Li>
        <Li>Deployments always run in your account; there are no shared platform credentials.</Li>
      </Ul>
      <P>
        Full details in <A href="/docs/concepts/authentication">Authentication &amp; Security</A>.
      </P>

      <H2>Disconnecting</H2>
      <P>
        Disconnect from <A href="https://www.deplo.in/dashboard/integrations">Dashboard → Integrations</A>, which
        calls:
      </P>
      <CodeBlock
        language="http"
        title="disconnect Vercel"
        code={`DELETE /api/v1/integrations/vercel
Authorization: Bearer <token>

{ "disconnected": true }`}
      />
      <P>
        Uninstalling the deplo.ai integration from your Vercel dashboard works too — Vercel notifies deplo.ai via
        webhook and the connection is marked disconnected automatically. Either way:
      </P>
      <Ul>
        <Li>
          New frontend deployments fail fast with{" "}
          <em>&ldquo;Vercel account not connected&rdquo;</em> until you reconnect.
        </Li>
        <Li>Existing projects and live deployments in your Vercel account are unaffected.</Li>
        <Li>Reconnecting is the same one-click flow and simply replaces the stored token.</Li>
      </Ul>
      <Callout type="note">
        Backend-only repositories don&apos;t need Vercel at all — a Python or Node API deploys with just the{" "}
        <A href="/docs/integrations/render">Render connection</A>.
      </Callout>
    </>
  );
}

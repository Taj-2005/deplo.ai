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
  Pill,
} from "@/components/docs/primitives";

export const metadata: Metadata = {
  title: "Provider Roadmap",
  description: "Providers on the roadmap and how new providers plug into the platform.",
};

export default function ProviderRoadmap() {
  return (
    <>
      <PageTitle lead="Today deplo.ai deploys frontends to Vercel and backends to Render. The platform was built provider-agnostic from day one — this page explains how new providers slot in, and which ones are under consideration.">
        Provider Roadmap
      </PageTitle>

      <H2>How the provider abstraction works</H2>
      <P>
        Nothing in the platform is hard-wired to Vercel or Render. Credentials live in a provider-agnostic{" "}
        <Code>ProviderConnection</Code> table (one encrypted connection per user per provider); each provider is an
        adapter behind a small API-client interface; and the mapping from a detected framework to its deployment
        target is centralized in one place — the <Code>DeploymentStrategyResolver</Code>&apos;s{" "}
        <Code>PROVIDER_RULES</Code> table, which the analysis engine consults instead of scattering provider logic
        through the orchestrator. Adding a provider means one new adapter, one connect/disconnect flow, and new rows
        in that table — not a rewrite. See{" "}
        <A href="/docs/concepts/architecture">Architecture</A> for the deeper dive.
      </P>

      <H2>Providers under consideration</H2>
      <P>
        These are candidates we&apos;re evaluating — <strong>not commitments or dates</strong>. Order and inclusion
        will follow real demand.
      </P>
      <Ul>
        <Li>
          <strong>Railway</strong> <Pill variant="planned" /> — an alternative backend target alongside Render:
          Node and Python services would map to Railway services in your own Railway account.
        </Li>
        <Li>
          <strong>Cloudflare Pages / Workers</strong> <Pill variant="planned" /> — an alternative frontend target
          (Pages for static and framework builds) with Workers as a possible home for lightweight APIs at the edge.
        </Li>
        <Li>
          <strong>Fly.io</strong> <Pill variant="planned" /> — backend services as Fly Machines in your Fly
          organization, interesting for apps that want regions close to users.
        </Li>
        <Li>
          <strong>Netlify</strong> <Pill variant="planned" /> — an alternative frontend target mirroring the Vercel
          integration: framework-aware builds deployed into your own Netlify team.
        </Li>
      </Ul>

      <Callout type="note" title="Same trust model">
        Whatever ships, the rule stays the same: deployments run in accounts <em>you</em> own, connected per-user
        with encrypted credentials — never in platform-owned infrastructure. See{" "}
        <A href="/docs/concepts/authentication">Authentication &amp; Security</A>.
      </Callout>

      <P>
        Want one of these prioritized — or a provider that isn&apos;t listed? Tell us:{" "}
        <A href="mailto:deploai201@gmail.com">deploai201@gmail.com</A>. Provider requests directly shape this roadmap.
      </P>
    </>
  );
}

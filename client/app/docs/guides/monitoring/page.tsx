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
  title: "Monitoring & Analytics",
  description: "Uptime, latency, server metrics, and privacy-friendly product analytics per project.",
};

export default function Monitoring() {
  return (
    <>
      <PageTitle lead="Every deployed project gets built-in health monitoring — uptime probes, latency history, and live server metrics from your own Render service — plus optional, cookieless product analytics via a one-line snippet. No agents to install, nothing to configure.">
        Monitoring &amp; Analytics
      </PageTitle>

      <P>
        Find it in the dashboard: open a project&apos;s deployment page and go to{" "}
        <strong>Project monitoring &amp; analytics</strong>. The same data is available from the{" "}
        <A href="/docs/api/monitoring">Monitoring API</A>.
      </P>

      <H2>Uptime probes</H2>
      <P>
        A background worker probes the live URLs of every project <strong>every 5 minutes</strong>. The URLs come
        from the latest <Code>COMPLETED</Code> deployment per repository — frontend and backend are probed
        separately. Samples are retained for <strong>7 days</strong>.
      </P>
      <DocTable head={["Rule", "Value"]}>
        <Tr>
          <Td>Probe interval</Td>
          <Td>Every 5 minutes, per target (frontend + backend)</Td>
        </Tr>
        <Tr>
          <Td>Up (ok)</Td>
          <Td>
            Any HTTP status <Code>&lt; 500</Code> — redirects are followed
          </Td>
        </Tr>
        <Tr>
          <Td>Down</Td>
          <Td>HTTP 5xx, connection errors, or no response within the 15-second timeout</Td>
        </Tr>
        <Tr>
          <Td>Retention</Td>
          <Td>7 days of samples</Td>
        </Tr>
      </DocTable>
      <Callout type="note">
        Free-tier backends sleep when idle, so the first request after a quiet period is slow. A slow response
        still counts as <strong>up</strong> — only errors and timeouts count as down. Expect the latency chart to
        show cold-start spikes on free plans.
      </Callout>

      <H2>Uptime percentage and latency</H2>
      <P>For each target the monitoring view shows:</P>
      <Ul>
        <Li>
          <strong>Current status</strong> — the most recent probe&apos;s result, HTTP status, and latency.
        </Li>
        <Li>
          <strong>24-hour uptime %</strong> — the share of probes in the last 24 hours that were up, to one
          decimal place.
        </Li>
        <Li>
          <strong>Latency series</strong> — every sample from the last 24 hours, charted so you can spot
          degradation and cold starts.
        </Li>
      </Ul>

      <H2>Live server metrics (Render)</H2>
      <P>
        When the project has a backend, deplo.ai also fetches <strong>live CPU and memory series</strong> for the
        last hour directly from the Render service — using your own Render API key, since the service runs in
        your workspace. This is best-effort: if the key was disconnected or Render&apos;s metrics API is
        unavailable, the health and uptime data still load and the server panel is simply omitted.
      </P>

      <H2>Latest-attempt banner</H2>
      <P>
        Monitoring always distinguishes <em>what is live</em> from <em>what happened last</em>. Uptime probes
        track the latest successful deployment&apos;s URLs — but if a newer attempt failed (or is still in
        progress), a banner shows its status and error above the health data. So when a deploy fails, you see the
        failure immediately, while the charts confirm your previous version is still serving traffic. See{" "}
        <A href="/docs/guides/troubleshooting">Troubleshooting</A>.
      </P>

      <H2>Product analytics</H2>
      <P>
        Analytics is <strong>opt-in per project</strong>: copy the snippet from the dashboard&apos;s analytics
        panel and add it to your deployed site. It is one script tag — the <Code>data-deplo-key</Code> is your
        project&apos;s ID:
      </P>
      <CodeBlock
        language="text"
        title="index.html"
        code={`<script defer src="https://www.deplo.in/api/v1/public/insights.js" data-deplo-key="YOUR_PROJECT_ID"></script>`}
      />
      <P>
        The script is ~15 lines, cached for an hour, and sends a beacon on page load and on every SPA navigation
        (it hooks <Code>pushState</Code>, <Code>replaceState</Code>, and <Code>popstate</Code>), using{" "}
        <Code>navigator.sendBeacon</Code> with an image-request fallback. It never blocks your page.
      </P>

      <H2>What is collected</H2>
      <DocTable head={["Field", "Detail"]}>
        <Tr>
          <Td>Path</Td>
          <Td>
            The page path, e.g. <Code>/pricing</Code>
          </Td>
        </Tr>
        <Tr>
          <Td>Referrer</Td>
          <Td>
            The document referrer; empty referrers are reported as <Code>(direct)</Code>
          </Td>
        </Tr>
        <Tr>
          <Td>Visitor hash</Td>
          <Td>
            <Code>sha256(ip | user-agent | day | projectId)</Code>, truncated — a cookieless daily identifier
          </Td>
        </Tr>
      </DocTable>
      <Ul>
        <Li>Requests from bots and crawlers (user-agent match) are dropped.</Li>
        <Li>
          Visitors sending the <Code>DNT: 1</Code> (Do Not Track) header are not recorded.
        </Li>
      </Ul>
      <Callout type="note" title="Privacy">
        No cookies, no localStorage, no fingerprinting scripts. The raw IP address is never stored — it only
        passes through the hash, and because the current day is part of the input, the identifier rotates every
        24 hours and cannot track a visitor across days or across projects.
      </Callout>

      <H2>Reading the numbers</H2>
      <P>
        The analytics view covers a window of <strong>1 to 30 days</strong> (default 7) and shows:
      </P>
      <Ul>
        <Li>
          <strong>Views</strong> — total pageviews in the window, plus a per-day series.
        </Li>
        <Li>
          <strong>Visitors</strong> — unique daily visitor hashes.
        </Li>
        <Li>
          <strong>Top pages</strong> — the ten most-viewed paths.
        </Li>
        <Li>
          <strong>Top referrers</strong> — the ten most common traffic sources, with direct traffic grouped as{" "}
          <Code>(direct)</Code>.
        </Li>
      </Ul>

      <H2>Next steps</H2>
      <Ul>
        <Li>
          <A href="/docs/api/monitoring">Monitoring &amp; Analytics API</A> — fetch the same data
          programmatically.
        </Li>
        <Li>
          <A href="/docs/guides/troubleshooting">Troubleshooting</A> — what to do when the banner shows a failed
          attempt.
        </Li>
      </Ul>
    </>
  );
}

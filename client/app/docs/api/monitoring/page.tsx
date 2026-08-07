import type { Metadata } from "next";
import { PageTitle, H2, P, A, Code, Callout, DocTable, Tr, Td } from "@/components/docs/primitives";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ApiEndpoint } from "@/components/docs/ApiEndpoint";

export const metadata: Metadata = {
  title: "Monitoring & Analytics",
  description: "Per-project health, uptime, server metrics, analytics, and the insights beacon.",
};

export default function ApiMonitoring() {
  return (
    <>
      <PageTitle lead="Every deployed project gets uptime probes every five minutes, live server metrics from your own Render service, and optional privacy-friendly product analytics fed by a one-line beacon snippet. These endpoints expose all of it, plus the account-wide dashboard stats.">
        Monitoring &amp; Analytics
      </PageTitle>

      <P>
        Monitoring is keyed by <strong>repository id</strong> (from{" "}
        <A href="/docs/api/repositories">GET /repos</A>), not deployment id — a project&apos;s health outlives any
        single deployment. For the dashboard-level walkthrough, see the{" "}
        <A href="/docs/guides/monitoring">Monitoring &amp; Analytics guide</A>.
      </P>

      <H2>Project monitoring</H2>

      <ApiEndpoint
        method="GET"
        path="/api/v1/projects/:repoId/monitoring"
        auth="bearer"
        description="Returns the project's health snapshot: current status and 24-hour uptime series for the frontend and backend, live CPU/memory from the Render service (last hour), the last successful deployment, and the latest deployment attempt of any status. Returns 404 if the repository does not exist or belongs to another user."
      >
        <DocTable head={["Field", "Type", "Description"]}>
          <Tr>
            <Td mono>project</Td>
            <Td mono>object</Td>
            <Td>
              <Code>{"{ id, name, fullName }"}</Code> of the repository.
            </Td>
          </Tr>
          <Tr>
            <Td mono>frontend / backend</Td>
            <Td mono>object</Td>
            <Td>
              Per-target health: <Code>url</Code> (nullable), <Code>current</Code>{" "}
              <Code>{"{ ok, httpStatus, latencyMs, checkedAt }"}</Code> or null when no probe has run,{" "}
              <Code>uptime24h</Code> (percentage, one decimal, null without samples), and <Code>series</Code> of{" "}
              <Code>{"{ t, ok, latencyMs }"}</Code> probe points over the last 24 hours.
            </Td>
          </Tr>
          <Tr>
            <Td mono>server</Td>
            <Td mono>object | null</Td>
            <Td>
              Live Render metrics: <Code>state</Code>, plus <Code>cpu</Code> and <Code>memory</Code> arrays of{" "}
              <Code>{"{ timestamp, value }"}</Code> for the last hour. Null when there is no Render service or metrics
              are unavailable.
            </Td>
          </Tr>
          <Tr>
            <Td mono>lastDeployment</Td>
            <Td mono>object | null</Td>
            <Td>
              Latest <Code>COMPLETED</Code> deployment — <Code>{"{ id, at, branch }"}</Code>. Defines the URLs being
              monitored.
            </Td>
          </Tr>
          <Tr>
            <Td mono>latestAttempt</Td>
            <Td mono>object | null</Td>
            <Td>
              Latest deployment of any status — <Code>{"{ id, status, error, branch, at, isNewerThanLive }"}</Code>.{" "}
              <Code>isNewerThanLive</Code> is true when this attempt is not the live deployment (in progress or
              failed after the last success).
            </Td>
          </Tr>
        </DocTable>
        <CodeBlock
          language="bash"
          title="request"
          code={`curl https://www.deplo.in/api/v1/projects/cm5xb2c3d0002njk8p4q5r6s7/monitoring \\
  -H "Authorization: Bearer $DEPLO_TOKEN"`}
        />
        <CodeBlock
          language="json"
          title="response · 200"
          code={`{
  "project": {
    "id": "cm5xb2c3d0002njk8p4q5r6s7",
    "name": "acme-shop",
    "fullName": "adalovelace/acme-shop"
  },
  "frontend": {
    "url": "https://deplo-acme-shop-web.vercel.app",
    "current": { "ok": true, "httpStatus": 200, "latencyMs": 84, "checkedAt": "2026-08-07T09:10:00.000Z" },
    "uptime24h": 100,
    "series": [
      { "t": "2026-08-07T08:55:00.000Z", "ok": true, "latencyMs": 91 },
      { "t": "2026-08-07T09:00:00.000Z", "ok": true, "latencyMs": 88 },
      { "t": "2026-08-07T09:05:00.000Z", "ok": true, "latencyMs": 79 },
      { "t": "2026-08-07T09:10:00.000Z", "ok": true, "latencyMs": 84 }
    ]
  },
  "backend": {
    "url": "https://deplo-acme-shop-api.onrender.com",
    "current": { "ok": true, "httpStatus": 200, "latencyMs": 132, "checkedAt": "2026-08-07T09:10:00.000Z" },
    "uptime24h": 99.7,
    "series": [
      { "t": "2026-08-07T09:05:00.000Z", "ok": true, "latencyMs": 141 },
      { "t": "2026-08-07T09:10:00.000Z", "ok": true, "latencyMs": 132 }
    ]
  },
  "server": {
    "state": "deployed",
    "cpu": [{ "timestamp": "2026-08-07T09:10:00Z", "value": 0.02 }],
    "memory": [{ "timestamp": "2026-08-07T09:10:00Z", "value": 268435456 }]
  },
  "lastDeployment": {
    "id": "cm5xc4d5e0003njk8t8u9v0w1",
    "at": "2026-08-06T18:33:11.000Z",
    "branch": "main"
  },
  "latestAttempt": {
    "id": "cm5xc4d5e0003njk8t8u9v0w1",
    "status": "COMPLETED",
    "error": null,
    "branch": "main",
    "at": "2026-08-06T18:30:02.000Z",
    "isNewerThanLive": false
  }
}`}
        />
      </ApiEndpoint>

      <H2>Product analytics</H2>

      <ApiEndpoint
        method="GET"
        path="/api/v1/projects/:repoId/analytics"
        auth="bearer"
        description="Aggregated product analytics for the project over the requested window: totals, a daily views/visitors series, top pages, top referrers, and the ready-to-paste tracking snippet. Data comes from the public insights beacon below — no cookies, visitors are counted via a daily-rotating hash. Returns 404 for repositories you do not own."
      >
        <DocTable head={["Query param", "Type", "Description"]}>
          <Tr>
            <Td mono>days</Td>
            <Td mono>number</Td>
            <Td>Optional. Window size in days, 1&ndash;30. Defaults to 7; out-of-range values are clamped.</Td>
          </Tr>
        </DocTable>
        <CodeBlock
          language="bash"
          title="request"
          code={`curl "https://www.deplo.in/api/v1/projects/cm5xb2c3d0002njk8p4q5r6s7/analytics?days=7" \\
  -H "Authorization: Bearer $DEPLO_TOKEN"`}
        />
        <CodeBlock
          language="json"
          title="response · 200"
          code={`{
  "days": 7,
  "totals": { "views": 1284, "visitors": 342 },
  "daily": [
    { "day": "2026-08-01T00:00:00.000Z", "views": 158, "visitors": 49 },
    { "day": "2026-08-02T00:00:00.000Z", "views": 203, "visitors": 61 }
  ],
  "topPaths": [
    { "path": "/", "views": 612 },
    { "path": "/pricing", "views": 231 }
  ],
  "topReferrers": [
    { "referrer": "(direct)", "views": 540 },
    { "referrer": "https://news.ycombinator.com/", "views": 187 }
  ],
  "snippet": "<script defer src=\\"https://www.deplo.in/api/v1/public/insights.js\\" data-deplo-key=\\"cm5xb2c3d0002njk8p4q5r6s7\\"></script>"
}`}
        />
      </ApiEndpoint>

      <H2>The insights beacon</H2>
      <P>
        Analytics is opt-in: add the <Code>snippet</Code> from the analytics response to your deployed site and the
        two public endpoints below do the rest. Neither requires authentication.
      </P>

      <ApiEndpoint
        method="GET"
        path="/api/v1/public/insights.js"
        auth="public"
        description="The tracking script (~500 bytes of vanilla JS, cached for one hour). It reads the repository id from the script tag's data-deplo-key attribute, sends a beacon on load, and hooks pushState/replaceState/popstate so SPA navigations are counted too."
      >
        <CodeBlock
          language="text"
          title="embed"
          code={`<script defer src="https://www.deplo.in/api/v1/public/insights.js" data-deplo-key="cm5xb2c3d0002njk8p4q5r6s7"></script>`}
        />
      </ApiEndpoint>

      <ApiEndpoint
        method="POST"
        path="/api/v1/public/insights/:repoId"
        auth="public"
        description="Beacon ingest — the script calls this via navigator.sendBeacon (POST) or an image request (GET; both methods behave identically). Always responds 204 immediately, whatever happens: bot user agents and DNT: 1 requests are silently dropped, unknown repo ids are ignored, and ingest failures never surface. Visitors are deduplicated with a daily-rotating hash of IP + user agent + repo id — no cookies, no stored IPs."
      >
        <DocTable head={["Query param", "Type", "Description"]}>
          <Tr>
            <Td mono>path</Td>
            <Td mono>string</Td>
            <Td>
              Page path being viewed. Defaults to <Code>/</Code>; truncated to 512 chars.
            </Td>
          </Tr>
          <Tr>
            <Td mono>ref</Td>
            <Td mono>string</Td>
            <Td>Document referrer. Optional; truncated to 512 chars.</Td>
          </Tr>
        </DocTable>
        <CodeBlock
          language="bash"
          title="request"
          code={`curl -X POST "https://www.deplo.in/api/v1/public/insights/cm5xb2c3d0002njk8p4q5r6s7?path=%2Fpricing&ref=https%3A%2F%2Fnews.ycombinator.com%2F"`}
        />
        <CodeBlock language="http" title="response · 204" code={`HTTP/1.1 204 No Content
Access-Control-Allow-Origin: *`} />
      </ApiEndpoint>

      <Callout type="note">
        The beacon endpoints are rate-limited like everything else (200 requests / 15 min / IP), which is ample for
        real visitors — each pageview is a single request from the visitor&apos;s own IP.
      </Callout>

      <H2>Account stats</H2>

      <ApiEndpoint
        method="GET"
        path="/api/v1/stats"
        auth="bearer"
        description="Account-wide dashboard counters for the authenticated user. Active means any non-terminal status: PENDING, ANALYZING, WAITING_FOR_ENV, DEPLOYING_BACKEND, BACKEND_READY, or DEPLOYING_FRONTEND."
      >
        <CodeBlock
          language="bash"
          title="request"
          code={`curl https://www.deplo.in/api/v1/stats \\
  -H "Authorization: Bearer $DEPLO_TOKEN"`}
        />
        <CodeBlock
          language="json"
          title="response · 200"
          code={`{
  "totalDeployments": 27,
  "activeDeployments": 1,
  "failedDeployments": 3,
  "connectedRepos": 42
}`}
        />
      </ApiEndpoint>
    </>
  );
}

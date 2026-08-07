import type { Metadata } from "next";
import { ProsePage } from "@/components/landing/ProsePage";

export const metadata: Metadata = {
  title: "Security",
  description: "How deplo.ai protects credentials, code, and deployments — and how to report issues.",
};

export default function SecurityPage() {
  return (
    <ProsePage eyebrow="Legal" title="Security" meta="Last updated August 7, 2026">
      <p>
        deplo.ai&apos;s security model starts from an architectural decision: <strong>we hold credentials, never
        infrastructure</strong>. Your applications run in your own Vercel and Render accounts, so the blast radius of
        anything happening to deplo.ai is limited by design — and everything we do hold is revocable by you in one
        click.
      </p>

      <h2>Credential handling</h2>
      <ul>
        <li>
          <strong>Encrypted at rest.</strong> GitHub access tokens, Vercel OAuth tokens, and Render API keys are
          encrypted with AES-256-GCM before touching the database. They are never logged and never returned by any API
          after initial entry.
        </li>
        <li>
          <strong>Validated before stored.</strong> A Render key is checked live against the Render API before we keep
          it — invalid credentials are never persisted.
        </li>
        <li>
          <strong>CLI tokens are hashed.</strong> Only a SHA-256 hash is stored; the raw <code>dpl_</code> token is
          shown exactly once. Each token is named, tracks last use, and is individually revocable in Settings.
        </li>
        <li>
          <strong>Per-user isolation.</strong> There are no global deploy credentials. Every deployment runs with the
          credentials of the account that owns it, nothing more.
        </li>
      </ul>

      <h2>Transport and application security</h2>
      <ul>
        <li>All traffic is TLS. The browser only ever talks to the deplo.in origin; the backend origin is never exposed to it.</li>
        <li>API authentication uses short-lived signed JWTs (7-day expiry) or hashed CLI tokens.</li>
        <li>Rate limiting (200 requests / 15 minutes / IP), Helmet security headers, and strict CORS allowlisting on the API.</li>
        <li>GitHub webhooks are verified with HMAC-SHA256 signatures before any action is taken.</li>
        <li>The CLI&apos;s browser sign-in only ever delivers tokens to a loopback address (127.0.0.1) with a single-use nonce.</li>
        <li>SQL access goes exclusively through parameterized queries via Prisma.</li>
      </ul>

      <h2>What AI can and cannot see</h2>
      <p>
        AI analysis (Groq) receives bounded repository excerpts — file trees, small config files, dependency lists —
        and failure logs. It never receives environment variable values, provider credentials, or tokens. AI output
        can suggest, but deterministic checks decide.
      </p>

      <h2>Infrastructure</h2>
      <p>
        The platform runs on managed, SOC 2-audited infrastructure: Vercel (frontend), Render (API, workers, Redis),
        and Neon (PostgreSQL). We deliberately operate no servers of our own.
      </p>

      <h2>Your kill switches</h2>
      <p>Everything deplo.ai can do, you can revoke unilaterally:</p>
      <ul>
        <li>Uninstall the GitHub App / revoke OAuth — GitHub settings → Applications.</li>
        <li>Remove the Vercel integration — your Vercel dashboard, or Dashboard → Integrations here.</li>
        <li>Delete or rotate the Render API key — Render dashboard; the stored copy becomes useless instantly.</li>
        <li>Revoke CLI tokens — Settings → CLI tokens.</li>
        <li>Delete your account — Settings → Danger Zone; your deployed apps keep running.</li>
      </ul>

      <h2>Reporting a vulnerability</h2>
      <p>
        Found something? Email <a href="mailto:deploai201@gmail.com">deploai201@gmail.com</a> with
        &ldquo;SECURITY&rdquo; in the subject. Please include steps to reproduce and don&apos;t access other
        users&apos; data while testing. We&apos;ll acknowledge quickly, keep you informed, and credit you if you&apos;d
        like once it&apos;s fixed. Good-faith research conducted under these rules will never result in legal action
        from us.
      </p>
    </ProsePage>
  );
}

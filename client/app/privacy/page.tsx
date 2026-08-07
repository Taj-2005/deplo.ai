import type { Metadata } from "next";
import { ProsePage } from "@/components/landing/ProsePage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What deplo.ai collects, why, where it lives, and how to remove it.",
};

export default function PrivacyPage() {
  return (
    <ProsePage eyebrow="Legal" title="Privacy Policy" meta="Last updated August 7, 2026">
      <p>
        deplo.ai deploys applications from your GitHub repositories into cloud accounts you own. That design keeps our
        data footprint small: we orchestrate, we don&apos;t host. This policy explains exactly what we store, why, and
        how to get rid of it.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>GitHub account basics</strong> — your name, email address, avatar, and GitHub username, received when
          you sign in with GitHub OAuth. This is how your account exists.
        </li>
        <li>
          <strong>Repository data</strong> — repository metadata (names, branches, visibility) and, during stack
          analysis, the file tree plus a bounded set of small configuration and source files read through the GitHub
          API. We do not clone or retain full copies of your repositories.
        </li>
        <li>
          <strong>Provider credentials</strong> — your Vercel OAuth token and Render API key, stored encrypted with
          AES-256-GCM. They are validated before storage, never logged, never displayed again, and used only to run
          deployments in your accounts.
        </li>
        <li>
          <strong>Deployment records</strong> — status, logs, detected stack, environment variable keys and values you
          provide, timestamps, and resulting URLs. This is the product&apos;s core data.
        </li>
        <li>
          <strong>CLI tokens</strong> — stored as SHA-256 hashes only; the raw token exists once, on your screen.
        </li>
        <li>
          <strong>Uptime and monitoring samples</strong> — HTTP status and latency of your deployed URLs, retained for
          7 days.
        </li>
      </ul>

      <h2>Cookies</h2>
      <p>
        The deplo.ai site sets no tracking cookies. Authentication uses a token in your browser&apos;s localStorage;
        your theme preference is stored the same way. That&apos;s it.
      </p>

      <h2>Analytics on your deployed sites</h2>
      <p>
        If you add the optional insights snippet to a site you deploy, we collect page path, referrer, and a visitor
        hash that rotates daily and honors Do&nbsp;Not&nbsp;Track — no cookies, no personal data, no cross-site
        tracking. That analytics data belongs to you as the project owner, and only you can see it.
      </p>

      <h2>AI processing</h2>
      <p>
        When stack detection needs help or a deployment fails, we send a bounded excerpt of your repository (file tree,
        small config files, dependency lists) or the failure log to Groq for analysis. Environment variable values and
        provider credentials are never included. AI output is used to improve detection and explain failures — nothing
        else.
      </p>

      <h2>Who else touches the data</h2>
      <p>Infrastructure we run on, each processing data only to provide the service:</p>
      <ul>
        <li><strong>Vercel</strong> — hosts the deplo.ai frontend.</li>
        <li><strong>Render</strong> — hosts the deplo.ai API, workers, and Redis.</li>
        <li><strong>Neon</strong> — managed PostgreSQL database.</li>
        <li><strong>GitHub</strong> — repository access via the permissions you grant.</li>
        <li><strong>Groq</strong> — bounded AI analysis as described above.</li>
        <li><strong>Google (Gmail SMTP)</strong> — sends deployment lifecycle emails to you.</li>
      </ul>
      <p>We do not sell data, run ads, or share data with anyone beyond the list above.</p>

      <h2>Emails</h2>
      <p>
        We send transactional deployment emails — failure diagnoses, success confirmations, waiting-for-env notices.
        No marketing lists, no newsletters without your explicit opt-in.
      </p>

      <h2>Deleting your data</h2>
      <p>
        Deleting your account (Settings → Danger Zone) removes your account, provider credentials, deployment records,
        and monitoring data. Because your apps run in your own Vercel and Render accounts, deletion never touches your
        deployed sites. You can also revoke individual pieces at any time: the GitHub App from GitHub settings, the
        Vercel integration from your Vercel dashboard, the Render key from Render, and CLI tokens from Settings.
      </p>

      <h2>Contact</h2>
      <p>
        Questions or requests: <a href="mailto:deploai201@gmail.com">deploai201@gmail.com</a>. We&apos;ll answer within
        a few business days.
      </p>
    </ProsePage>
  );
}

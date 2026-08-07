import type { Metadata } from "next";
import { ProsePage } from "@/components/landing/ProsePage";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The agreement between you and deplo.ai — plain-language, beta-honest terms.",
};

export default function TermsPage() {
  return (
    <ProsePage eyebrow="Legal" title="Terms of Service" meta="Last updated August 7, 2026">
      <p>
        These terms govern your use of deplo.ai. They&apos;re written to be read, not skimmed past. Using deplo.ai
        means you agree to them.
      </p>

      <h2>The service</h2>
      <p>
        deplo.ai analyzes GitHub repositories and orchestrates deployments into cloud provider accounts that you own
        and control — frontends to your Vercel account, backends to your Render workspace. We are an orchestration
        layer: your code runs on the providers, under your accounts, and remains yours in every sense.
      </p>

      <h2>Beta status</h2>
      <p>
        deplo.ai is in beta and currently free. Things will occasionally break, change, or improve without notice.
        We&apos;ll communicate meaningful changes, and if we ever introduce paid plans, nothing will be charged without
        your explicit action.
      </p>

      <h2>Your responsibilities</h2>
      <ul>
        <li>
          <strong>Your providers, your bills.</strong> Deployments run in your Vercel and Render accounts under their
          terms of service. Any usage costs those providers charge are between you and them.
        </li>
        <li>
          <strong>Your code.</strong> You&apos;re responsible for what you deploy — including having the rights to
          deploy it and its compliance with applicable law.
        </li>
        <li>
          <strong>Your credentials.</strong> Keep your account, provider keys, and CLI tokens secure; revoke anything
          you suspect is compromised (Settings → CLI tokens, or at the provider).
        </li>
      </ul>

      <h2>Acceptable use</h2>
      <p>Don&apos;t use deplo.ai to deploy or operate:</p>
      <ul>
        <li>malware, phishing pages, or anything designed to harm others;</li>
        <li>content that is illegal where you or your users are;</li>
        <li>abuse of the free tiers of underlying providers (e.g. deployment farms, crypto mining);</li>
        <li>anything that attacks, probes, or degrades deplo.ai itself or other users.</li>
      </ul>
      <p>We may suspend or terminate accounts that violate these rules, with notice where reasonably possible.</p>

      <h2>Ownership</h2>
      <p>
        You keep all rights to your code and your deployed applications. We claim nothing over what you build. The
        deplo.ai software, brand, and service remain ours.
      </p>

      <h2>Warranties and liability</h2>
      <p>
        deplo.ai is provided <strong>as is</strong>, without warranties of any kind, express or implied — including
        availability, fitness for a particular purpose, and non-infringement. To the maximum extent permitted by law,
        deplo.ai and its operators are not liable for indirect, incidental, or consequential damages, lost profits, or
        lost data arising from use of the service. Because your applications live in your own provider accounts, they
        keep running even if deplo.ai does not.
      </p>

      <h2>Termination</h2>
      <p>
        You can stop using deplo.ai and delete your account at any time (Settings → Danger Zone) — your deployed apps
        are unaffected. We may suspend accounts for acceptable-use violations or to protect the service.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms as the product evolves. The &ldquo;last updated&rdquo; date above always reflects the
        current version; material changes will be announced on the site.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms: <a href="mailto:deploai201@gmail.com">deploai201@gmail.com</a>.
      </p>
    </ProsePage>
  );
}

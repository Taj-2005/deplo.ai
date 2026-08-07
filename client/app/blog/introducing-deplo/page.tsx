import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/landing/ProsePage";
import { formatPostDate } from "@/lib/blog/posts";

export const metadata: Metadata = {
  title: "Introducing deplo.ai — code goes in, production URL comes out",
  description:
    "Why we built a deployment platform that owns nothing: your repo deploys into your own Vercel and Render accounts, with stack detection, env wiring, and AI failure diagnosis doing the DevOps.",
};

export default function IntroducingDeplo() {
  return (
    <ProsePage
      eyebrow="Announcement"
      title="Introducing deplo.ai — code goes in, production URL comes out"
      meta={`${formatPostDate("2026-08-07")} · 6 min read · the deplo.ai team`}
    >
      <p>
        Every developer knows the moment: the app works locally, and now it needs to exist on the internet. What
        follows is rarely engineering. It&apos;s choosing a host for the frontend, another for the backend, learning
        two dashboards, guessing at build commands, copying environment variables between tabs, discovering CORS,
        and — an hour later — realizing the API URL baked into the frontend points at localhost.
      </p>
      <p>
        deplo.ai collapses all of that into one action. Connect a GitHub repository, click Deploy (or type{" "}
        <code>deplo</code>), and a few minutes later you have two production URLs: the frontend live on Vercel, the
        backend live on Render, wired to each other correctly.
      </p>

      <video
        src="https://res.cloudinary.com/doexqrehm/video/upload/v1786081938/WhatsApp_Video_2026-07-19_at_10.30.12_oqfjwj.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-label="deplo.ai demo — deploying a repository to live production URLs"
        className="w-full my-8 border border-[#E2E8F0] bg-black"
      />

      <h2>The unusual part: we own nothing</h2>
      <p>
        Most deployment platforms simplify hosting by <em>becoming</em> your host — and that convenience compounds into
        lock-in. deplo.ai makes the opposite bet. Deployments land in accounts <strong>you</strong> own: the frontend
        appears in your Vercel dashboard like any project you created by hand, the backend runs as a normal web service
        in your Render workspace. Your URLs, your logs, your billing relationship, your custom domains.
      </p>
      <p>
        The consequence we&apos;re proudest of: if deplo.ai vanished tomorrow, every app ever deployed with it would
        keep running, untouched. A platform should have to earn your continued use — not hold your infrastructure
        hostage.
      </p>

      <h2>What actually happens when you deploy</h2>
      <p>
        Under the single Deploy action is a pipeline that treats your repository as the source of truth rather than
        asking you to describe it:
      </p>
      <ul>
        <li>
          <strong>Detection is deterministic first.</strong> A weighted-signature engine reads your repo tree —
          dependencies, config files, scripts, structure — and identifies the stack: Next.js in <code>client/</code>,
          Express in <code>server/</code>, a Vite app at the root, a FastAPI service, a Go binary. Monorepos and
          workspaces included.
        </li>
        <li>
          <strong>Commands come from your code.</strong> Node backends run the scripts in your own{" "}
          <code>package.json</code>; Python apps get their start command from the actual app module we find; Go builds
          follow your layout. Nothing is guessed that can be read.
        </li>
        <li>
          <strong>Env vars are found, not requested blindly.</strong> The scanner reads your source for the variables
          the code actually consumes — not just <code>.env.example</code> — marks what&apos;s required, and asks for
          only that.
        </li>
        <li>
          <strong>Wiring is automatic.</strong> The backend deploys first; its live URL is injected into the frontend
          build under the keys your code really uses (<code>NEXT_PUBLIC_API_URL</code>, <code>VITE_API_URL</code>, …),
          and the backend receives your frontend origin for CORS. The localhost-in-production bug is structurally
          impossible.
        </li>
        <li>
          <strong>Pushes redeploy.</strong> After the first successful deployment, a webhook redeploys the branch on
          every push, reusing the proven configuration.
        </li>
      </ul>

      <h2>AI on a leash</h2>
      <p>
        There&apos;s AI in deplo.ai, but it&apos;s deliberately bounded: at most two model calls per deployment. One
        when deterministic detection isn&apos;t confident about an unusual repo layout; one when a deployment fails —
        producing a diagnosis with the likely cause, the affected file, the fix, and a prompt you can paste straight
        into Cursor, Claude Code, or Copilot. A failed deploy shouldn&apos;t be a wall of logs; it should be an
        explanation.
      </p>
      <p>
        A wrong AI answer can never override a working deterministic result. We think that&apos;s the only honest way
        to put a model inside infrastructure tooling.
      </p>

      <h2>The terminal is the product too</h2>
      <p>Everything above works without opening the dashboard at all:</p>
      <pre>
        <code>{`$ npx @deplo.ai/cli login
$ cd your-project
$ npx @deplo.ai/cli
→ repo detected   github.com/you/your-app (main)
→ stack detected  frontend=Next.js · backend=Express
✓ backend live    https://deplo-your-app-api.onrender.com
✓ frontend live   https://deplo-your-app-web.vercel.app
● Deployed in 2:41`}</code>
      </pre>
      <p>
        The CLI is a thin client over the same API as the dashboard — same deployments, same monitoring, same account.
        It runs in CI with a token and exit codes, so <code>deploy</code> can gate a pipeline. The{" "}
        <Link href="/docs/cli">CLI docs</Link> cover every command.
      </p>

      <h2>After the deploy</h2>
      <p>
        Shipping is the start, not the end. Every project gets uptime and latency monitoring, live CPU and memory from
        your Render service, and optional cookieless product analytics — views, visitors, top pages — via a one-line
        snippet. When something breaks, the failure email tells you what, where, and how to fix it.
      </p>

      <h2>Free while in beta</h2>
      <p>
        deplo.ai is free during beta. Your apps run on your providers&apos; free tiers unless you choose otherwise, so
        the realistic cost of shipping a full-stack side project today is zero.
      </p>
      <p>
        Start at <Link href="/docs/getting-started/quickstart">the quickstart</Link>, or just run{" "}
        <code>npx @deplo.ai/cli login</code>. Code goes in. Production URL comes out.
      </p>
    </ProsePage>
  );
}

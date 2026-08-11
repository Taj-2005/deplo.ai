"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Check, Copy, ArrowRight } from "lucide-react";

/**
 * CLI section — @deplo.ai/cli, published on npm.
 *
 * Every command and flag shown here exists in cli/src/commands/. When the CLI
 * gains or changes commands, update this section and /docs/cli together.
 */

const INSTALL = "npm i -g @deplo.ai/cli";

// Real v0.1 commands — mirrors cli/src/index.ts.
const commands: Array<{ cmd: string; desc: string }> = [
  { cmd: "deplo login", desc: "Sign in with GitHub in your browser" },
  { cmd: "deplo connect vercel", desc: "Authorize your Vercel account" },
  { cmd: "deplo connect render", desc: "Connect Render with an API key" },
  { cmd: "deplo", desc: "Deploy this repo, follow the live log" },
  { cmd: "deplo status", desc: "Latest deployment for this project" },
  { cmd: "deplo logs", desc: "Stream the deployment log" },
  { cmd: "deplo list", desc: "Every project, status and URLs" },
  { cmd: "deplo open", desc: "Open the live site (--api, --dash)" },
];

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — the command stays selectable.
    }
  };

  return (
    <button
      onClick={onCopy}
      aria-label={`Copy "${value}"`}
      className="flex items-center gap-1.5 shrink-0 text-[12px] text-[#64748B] hover:text-white transition-colors"
    >
      {copied ? (
        <>
          <Check size={13} strokeWidth={2} className="text-[#4ADE80]" />
          <span className="text-[#4ADE80]">copied</span>
        </>
      ) : (
        <>
          <Copy size={13} strokeWidth={2} />
          copy
        </>
      )}
    </button>
  );
}

export function Cli() {
  return (
    <section id="cli" className="bg-white py-24 sm:py-32 border-t border-[#E2E8F0]">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mb-12 sm:mb-16 max-w-2xl"
        >
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[2px] text-[#94A3B8] mb-5">
            <span className="w-[5px] h-[5px] bg-[#94A3B8] inline-block rounded-full" />
            Command line
          </span>
          <h2
            className="text-black font-semibold tracking-[-0.04em] leading-[1.05]"
            style={{ fontSize: "clamp(2rem, 4.5vw, 3rem)" }}
          >
            Never leave the terminal.
          </h2>
          <p className="mt-5 text-[16px] sm:text-[17px] leading-relaxed text-[#64748B]">
            The deplo CLI does everything the dashboard does — sign in, connect providers, deploy, follow
            logs — from the directory you&apos;re already in. Published on npm, free, and open to anyone.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 lg:gap-8">
          {/* Install */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col"
          >
            <div className="bg-[#0A0A0A] border border-[#1E2939] p-6 sm:p-7">
              <div className="text-[11px] font-bold uppercase tracking-[1.6px] text-[#475569] mb-4">
                Install
              </div>

              <div className="flex items-center justify-between gap-4 font-mono text-[13px] sm:text-[14px] border-b border-[#1E2939] pb-4">
                <code className="text-[#F1F5F9] truncate">
                  <span className="text-[#4ADE80]">$ </span>
                  {INSTALL}
                </code>
                <CopyButton value={INSTALL} />
              </div>

              <p className="mt-4 text-[12.5px] leading-relaxed text-[#64748B] font-mono">
                or run it once with{" "}
                <span className="text-[#94A3B8]">npx @deplo.ai/cli</span> — no install, always latest.
              </p>

              <div className="mt-6 pt-5 border-t border-[#1E2939] flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] font-mono text-[#64748B]">
                <span>Node 20+</span>
                <span className="text-[#334155]">·</span>
                <span>macOS · Linux · Windows</span>
                <span className="text-[#334155]">·</span>
                <a
                  href="https://www.npmjs.com/package/@deplo.ai/cli"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#00D2FF] hover:underline"
                >
                  npm ↗
                </a>
              </div>
            </div>

            {/* CI */}
            <div className="mt-6 border border-[#E2E8F0] bg-[#F9FAFB] p-6 sm:p-7 flex-1">
              <div className="text-[11px] font-bold uppercase tracking-[1.6px] text-[#94A3B8] mb-3">
                Works in CI
              </div>
              <p className="text-[13.5px] leading-relaxed text-[#64748B]">
                Deploy from GitHub Actions with a token — exit codes gate your pipeline, and a failed build
                prints the AI diagnosis straight into the CI log.
              </p>
              <code className="mt-4 block font-mono text-[12px] leading-relaxed text-[#334155] break-all">
                npx @deplo.ai/cli deploy --yes
              </code>
            </div>
          </motion.div>

          {/* Commands */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="border border-[#E2E8F0] bg-white"
          >
            <div className="px-6 sm:px-7 py-4 border-b border-[#E2E8F0]">
              <span className="text-[11px] font-bold uppercase tracking-[1.6px] text-[#94A3B8]">
                Commands
              </span>
            </div>

            <ul className="divide-y divide-[#F1F5F9]">
              {commands.map(({ cmd, desc }) => (
                <li
                  key={cmd}
                  className="px-6 sm:px-7 py-3.5 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 sm:gap-6"
                >
                  <code className="font-mono text-[13px] text-black whitespace-nowrap">{cmd}</code>
                  <span className="text-[13px] text-[#94A3B8] sm:text-right">{desc}</span>
                </li>
              ))}
            </ul>

            <div className="px-6 sm:px-7 py-5 border-t border-[#E2E8F0]">
              <Link
                href="/docs/cli"
                className="group inline-flex items-center gap-2 text-[13.5px] font-medium text-black hover:text-[#0070F3] transition-colors"
              >
                Full CLI documentation
                <ArrowRight
                  size={14}
                  strokeWidth={2}
                  className="group-hover:translate-x-0.5 transition-transform"
                />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

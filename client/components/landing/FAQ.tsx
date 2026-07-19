"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

/**
 * FAQ — targets brand-question queries ("what is deplo.ai") with accurate
 * answers + FAQPage structured data so search engines cite us, not the
 * lookalike "Deploy.AI" entities.
 */

const faqs = [
  {
    q: "What is deplo.ai?",
    a: "deplo.ai is an AI-powered deployment orchestration platform. You connect a GitHub repository, and deplo.ai detects the tech stack, provisions infrastructure, and returns production-ready URLs — frontend on Vercel, backend on Render — in under 3 minutes, with no DevOps knowledge required.",
  },
  {
    q: "How does deplo.ai work?",
    a: "deplo.ai analyzes your repository's actual files — package.json, config files, lock files, and folder structure — to identify your frameworks, build commands, and environment variables. An AI reasoning layer handles unusual project structures. It then deploys each part of your app to the right platform in your own accounts and wires the frontend to the backend automatically.",
  },
  {
    q: "Which frameworks does deplo.ai support?",
    a: "Frontend: Next.js, React (Vite), Vue, Nuxt, Astro, Svelte, SvelteKit, Remix, Gatsby, Angular, and static HTML sites. Backend: Express, Fastify, FastAPI, Flask, and Django. Detection covers even more frameworks, with new deployment targets added continuously.",
  },
  {
    q: "Where do my apps actually run?",
    a: "In your own accounts — not ours. Frontends deploy to your Vercel account and backends to your Render workspace, connected securely via OAuth or API keys that are encrypted at rest. You own every project, deployment, log, and domain.",
  },
  {
    q: "Do I need DevOps experience to use deplo.ai?",
    a: "No — that's the point. deplo.ai handles stack detection, build configuration, environment variables, and cross-service wiring automatically. If a deployment fails, an AI diagnosis explains what went wrong in plain language.",
  },
  {
    q: "Is deplo.ai free?",
    a: "deplo.ai is free during beta. Your apps deploy to the free tiers of your own Vercel and Render accounts, so you can ship a fullstack app to production without paying anything.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-white py-24 sm:py-32 border-t border-[#E2E8F0]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div className="max-w-3xl mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="mb-12"
        >
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[2px] text-[#94A3B8] mb-5">
            FAQ
          </span>
          <h2 className="text-[32px] sm:text-[40px] font-bold tracking-[-0.02em] text-black leading-tight">
            Frequently asked questions
          </h2>
        </motion.div>

        <div className="divide-y divide-[#E2E8F0] border-y border-[#E2E8F0]">
          {faqs.map((f, i) => (
            <div key={f.q}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
                className="w-full flex items-center justify-between gap-4 py-5 text-left group"
              >
                <span className="text-[15px] sm:text-[16px] font-semibold text-black group-hover:text-[#0070F3] transition-colors">
                  {f.q}
                </span>
                <Plus
                  size={16}
                  strokeWidth={2}
                  className={`shrink-0 text-[#94A3B8] transition-transform duration-200 ${open === i ? "rotate-45" : ""}`}
                />
              </button>
              <motion.div
                initial={false}
                animate={{ height: open === i ? "auto" : 0, opacity: open === i ? 1 : 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <p className="pb-6 pr-8 text-[14px] leading-relaxed text-[#64748B]">{f.a}</p>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

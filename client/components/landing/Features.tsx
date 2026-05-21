"use client";

import { motion } from "framer-motion";
import { Cpu, Zap, Link } from "lucide-react";
import Image from "next/image";

interface Feature {
  n: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  description: string;
  bullets: { title: string; desc: string }[];
  visual: React.ReactNode;
}

/* ── Visual: Stack detection diagram ── */
function StackDetectVisual() {
  const files = [
    { name: "package.json", img: "/npm.png", found: true },
    { name: "next.config.js", img: "/next.png", found: true },
    { name: "vite.config.ts", img: "/vite.png", found: false },
    { name: ".env.example", img: "/env.png", found: true },
    { name: "server.js", img: "/server.png", found: true },
  ];

  return (
    <div className="w-full max-w-sm bg-white border border-[#E2E8F0] shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
      <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#94A3B8]">
          Repo Analysis
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-green-500 font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Scanning
        </span>
      </div>
      <div className="p-4 flex flex-col gap-2">
        {files.map((file, i) => (
          <motion.div
            key={file.name}
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className="flex items-center gap-3 p-2.5 border border-[#E2E8F0] bg-gray-50/50"
          >
            <Image src={file.img} alt={file.name} width={18} height={18} className="object-contain shrink-0" />
            <span className="text-[12px] font-mono text-black flex-1">
              {file.name}
            </span>
            <span
              className={`text-[10px] font-semibold uppercase tracking-wide ${
                file.found ? "text-green-500" : "text-[#CBD5E1]"
              }`}
            >
              {file.found ? "✓" : "—"}
            </span>
          </motion.div>
        ))}
      </div>
      <div className="px-5 py-3.5 border-t border-[#E2E8F0] bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#94A3B8]">Detected:</span>
          <span className="text-[11px] font-semibold text-black">
            Next.js 14 + Express.js
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Visual: Deploy pipeline ── */
function DeployVisual() {
  return (
    <div className="w-full max-w-sm flex flex-col gap-3">
      {[
        { label: "Backend → Render", logo: "/render.png", logoAlt: "Render", status: "Deployed", time: "1m 23s" },
        { label: "Frontend → Vercel", logo: "/vercel.png", logoAlt: "Vercel", status: "Deployed", time: "0m 47s" },
      ].map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="border border-[#E2E8F0] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
        >
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center border border-[#E2E8F0] bg-white">
              <Image
                src={item.logo}
                alt={item.logoAlt}
                width={20}
                height={20}
                className="object-contain"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-black">
                {item.label}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="h-1 flex-1 bg-[#E2E8F0]">
                  <motion.div
                    className="h-full bg-green-400"
                    initial={{ width: "0%" }}
                    whileInView={{ width: "100%" }}
                    viewport={{ once: true }}
                    transition={{
                      delay: i * 0.15 + 0.3,
                      duration: 1.2,
                      ease: "easeOut",
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-[10px] font-semibold text-green-500">
                {item.status}
              </div>
              <div className="text-[10px] text-[#94A3B8]">{item.time}</div>
            </div>
          </div>
        </motion.div>
      ))}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="border border-green-200 bg-green-50 px-4 py-3 flex items-center gap-2.5"
      >
        <span className="text-green-500 text-[13px]">✔</span>
        <span className="text-[12px] font-semibold text-green-700">
          Both services live
        </span>
        <span className="ml-auto text-[11px] text-green-600 font-mono">
          2m 10s total
        </span>
      </motion.div>
    </div>
  );
}

/* ── Visual: Env sync ── */
function EnvSyncVisual() {
  return (
    <div className="w-full max-w-sm">
      <div className="border border-[#E2E8F0] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
        <div className="px-5 py-3 border-b border-[#E2E8F0]">
          <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#94A3B8]">
            Environment Variables
          </span>
        </div>
        <div className="p-4 font-mono text-[11.5px] flex flex-col gap-2">
          {[
            { key: "DATABASE_URL", value: "postgresql://…", injected: true },
            { key: "JWT_SECRET", value: "••••••••••••", injected: true },
            { key: "OPENAI_API_KEY", value: "sk-••••••••", injected: true },
            {
              key: "NEXT_PUBLIC_API_URL",
              value: "https://api-app.onrender.com",
              injected: true,
              auto: true,
            },
          ].map((env, i) => (
            <motion.div
              key={env.key}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.35 }}
              className={`flex items-start gap-2 p-2.5 ${
                env.auto ? "bg-blue-50 border border-blue-100" : "bg-gray-50 border border-[#E2E8F0]"
              }`}
            >
              <span className="text-[#64748B] flex-shrink-0">{env.key}=</span>
              <span
                className={`truncate flex-1 ${
                  env.auto ? "text-[#0070F3]" : "text-black"
                }`}
              >
                {env.value}
              </span>
              {env.auto && (
                <span className="text-[9px] font-bold text-[#0070F3] uppercase flex-shrink-0">
                  Auto
                </span>
              )}
            </motion.div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-[#E2E8F0] bg-gray-50">
          <span className="text-[11px] text-[#94A3B8]">
            4 variables synced across both services
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Feature data ── */
const features: Feature[] = [
  {
    n: "01",
    icon: Cpu,
    title: "Zero-Config\nStack Detection",
    subtitle: "AI understands your repo",
    description:
      "deplo.ai reads your package.json, config files, and file structure. It automatically identifies your framework, language, build command, output directory, and port — without a single YAML file.",
    bullets: [
      {
        title: "Framework Detection",
        desc: "Next.js, React, Vite, Express, Fastify — recognized from dependencies and config files.",
      },
      {
        title: "Build Command Inference",
        desc: "Correct build and start commands resolved automatically from package.json scripts.",
      },
      {
        title: "Env Variable Discovery",
        desc: "Scans for process.env and import.meta.env usage to surface required secrets.",
      },
    ],
    visual: <StackDetectVisual />,
  },
  {
    n: "02",
    icon: Zap,
    title: "Parallel\nDeployment Pipeline",
    subtitle: "Frontend + backend, simultaneously",
    description:
      "Backend deploys to Render while frontend builds on Vercel. No sequencing needed. Both are tracked in real time, and the dashboard shows live status from both platforms.",
    bullets: [
      {
        title: "Parallel Execution",
        desc: "Backend and frontend deploy concurrently, reducing total deploy time significantly.",
      },
      {
        title: "Real-Time Status",
        desc: "Live deployment logs and status from both Render and Vercel surfaced in one place.",
      },
      {
        title: "Failure Isolation",
        desc: "Backend and frontend failures are surfaced independently so you know exactly what to fix.",
      },
    ],
    visual: <DeployVisual />,
  },
  {
    n: "03",
    icon: Link,
    title: "Automatic\nEnv Sync",
    subtitle: "Backend URL injected into frontend",
    description:
      "Once the backend URL is ready on Render, it is automatically injected as NEXT_PUBLIC_API_URL into your Vercel frontend deployment. No copy-paste, no manual wiring.",
    bullets: [
      {
        title: "URL Auto-Injection",
        desc: "Backend URL flows into frontend environment variables before the Vercel build starts.",
      },
      {
        title: "Secure Secret Handling",
        desc: "Secrets are never stored in plain text and are injected using provider-level env APIs.",
      },
      {
        title: "Connected by Default",
        desc: "Frontend and backend are wired together and ready to talk on first deploy.",
      },
    ],
    visual: <EnvSyncVisual />,
  },
];

/* ── Feature card (sticky) ── */
function FeatureCard({
  feature,
  index,
  sticky,
}: {
  feature: Feature;
  index: number;
  sticky: boolean;
}) {
  const Icon = feature.icon;

  return (
    <div
      className={`bg-white border-t border-[#E2E8F0] ${
        sticky ? "sticky h-screen flex items-center" : "py-16 sm:py-20"
      }`}
      style={sticky ? { top: "56px", zIndex: 10 + index } : undefined}
    >
      <div className="w-full px-5 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center max-w-6xl mx-auto">
          {/* Left: text */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <span
                className="text-[11px] font-bold tracking-[2px] uppercase text-[#94A3B8]"
              >
                {feature.n}
              </span>
              <div className="w-7 h-7 border border-[#E2E8F0] flex items-center justify-center text-[#94A3B8]">
                <Icon size={14} strokeWidth={1.75} />
              </div>
            </div>

            <h3
              className="text-black font-semibold tracking-[-0.04em] leading-[1.08] whitespace-pre-line"
              style={{ fontSize: "clamp(2rem, 3.5vw, 2.75rem)" }}
            >
              {feature.title}
            </h3>

            <p className="text-[15px] leading-[1.7] text-[#64748B] max-w-sm">
              {feature.description}
            </p>

            <div className="flex flex-col gap-5 pt-2">
              {feature.bullets.map((b) => (
                <div key={b.title}>
                  <h4 className="text-[13.5px] font-semibold text-black mb-1 flex items-start gap-2">
                    <span className="text-[#E2E8F0] mt-[2px] flex-shrink-0">
                      •
                    </span>
                    {b.title}
                  </h4>
                  <p className="text-[13px] leading-relaxed text-[#64748B] pl-4">
                    {b.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: visual */}
          <div className="lg:col-span-7 flex items-center justify-center">
            {feature.visual}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Features section ── */
export function Features() {
  return (
    <section
      id="features"
      className="relative bg-white"
      style={{ height: `calc(${features.length * 100}vh + 220px)` }}
    >
      {/* Section header — scrolls normally so it doesn't clash with sticky cards */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="bg-white border-b border-[#E2E8F0] px-5 sm:px-8 py-16 sm:py-20"
      >
        <div className="max-w-6xl mx-auto">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[2px] text-[#94A3B8] mb-5">
            <span className="w-[5px] h-[5px] bg-[#94A3B8] inline-block rounded-full" />
            Features
          </span>
          <h2
            className="text-black font-semibold tracking-[-0.04em] leading-[1.05]"
            style={{ fontSize: "clamp(2rem, 4.5vw, 3rem)" }}
          >
            How deplo.ai thinks.
          </h2>
        </div>
      </motion.div>

      {/* Mobile: stacked cards */}
      <div className="lg:hidden">
        {features.map((feature, idx) => (
          <FeatureCard key={idx} feature={feature} index={idx} sticky={false} />
        ))}
      </div>

      {/* Desktop: sticky cards */}
      <div className="hidden lg:block">
        {features.map((feature, idx) => (
          <FeatureCard key={idx} feature={feature} index={idx} sticky={true} />
        ))}
      </div>
    </section>
  );
}

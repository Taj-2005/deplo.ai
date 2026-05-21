"use client";

import { motion } from "framer-motion";
import { Cpu, Layers, KeyRound, CheckCircle } from "lucide-react";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface Step {
  n: string;
  icon?: LucideIcon;
  logo?: string;
  logoBg?: string;
  title: string;
  desc: string;
  color: string;
}

const steps: Step[] = [
  {
    n: "01",
    logo: "/github.png",
    logoBg: "bg-white",
    title: "Connect GitHub",
    desc: "OAuth with GitHub in one click. Select your frontend repo, backend repo, or a monorepo.",
    color: "#24292e",
  },
  {
    n: "02",
    icon: Cpu,
    title: "AI Analyzes Repo",
    desc: "deplo.ai scans your package.json, config files, and directory structure automatically.",
    color: "#7928CA",
  },
  {
    n: "03",
    icon: Layers,
    title: "Stack Detected",
    desc: "Identifies Next.js, React, Express, Fastify — framework, language, build commands, ports.",
    color: "#0070F3",
  },
  {
    n: "04",
    icon: KeyRound,
    title: "Configure Env Vars",
    desc: "Lists all required environment variables found in your code. Fill them in once, securely.",
    color: "#F59E0B",
  },
  {
    n: "05",
    logo: "/render.png",
    logoBg: "bg-white",
    title: "Backend Deployed",
    desc: "Express or Fastify service deployed to Render with your env vars injected automatically.",
    color: "#46E3B7",
  },
  {
    n: "06",
    logo: "/vercel.png",
    logoBg: "bg-white",
    title: "Frontend Deployed",
    desc: "Next.js or React app deployed to Vercel. Backend URL auto-injected as NEXT_PUBLIC_API_URL.",
    color: "#000000",
  },
  {
    n: "07",
    icon: CheckCircle,
    title: "Production URLs",
    desc: "Both production URLs returned to your dashboard. Your app is live. Zero infrastructure owned.",
    color: "#22C55E",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

export function HowItWorks() {
  const { isAuthenticated } = useAuth();

  return (
    <section id="how-it-works" className="bg-white py-24 sm:py-32">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="mb-16 sm:mb-20"
        >
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[2px] text-[#94A3B8] mb-5">
            <span className="w-1.5 h-1.5 bg-[#94A3B8] inline-block rounded-full" />
            How it works
          </span>
          <h2
            className="text-black font-semibold leading-[1.05] tracking-[-0.04em]"
            style={{ fontSize: "clamp(2.25rem, 5vw, 3.5rem)" }}
          >
            Seven steps from repo
            <br />
            <span className="text-[#94A3B8]">to production.</span>
          </h2>
        </motion.div>

        {/* Steps grid */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 border-l border-t border-[#E2E8F0]"
        >
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.n}
                variants={item}
                className="group relative flex flex-col gap-4 p-7 border-r border-b border-[#E2E8F0] hover:bg-gray-50/60 transition-colors"
              >
                {/* Number badge */}
                <span
                  className="text-[11px] font-bold tracking-[2px] uppercase"
                  style={{ color: step.color }}
                >
                  {step.n}
                </span>

                {/* Icon — real logo or lucide */}
                <div
                  className="w-9 h-9 flex items-center justify-center border border-[#E2E8F0] bg-white group-hover:border-black/15 transition-colors overflow-hidden"
                  style={!step.logo ? { color: step.color } : undefined}
                >
                  {step.logo ? (
                    <Image
                      src={step.logo}
                      alt={step.title}
                      width={22}
                      height={22}
                      className="object-contain"
                    />
                  ) : Icon ? (
                    <Icon size={16} strokeWidth={1.75} />
                  ) : null}
                </div>

                {/* Text */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-[14.5px] font-semibold text-black tracking-[-0.02em]">
                      {step.title}
                    </h3>
                    {step.n === "01" && isAuthenticated && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.08em] text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5">
                        <span className="w-1 h-1 rounded-full bg-green-500" />
                        Connected
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] leading-[1.65] text-[#64748B]">
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}

          {/* Empty cell to complete the 3-col grid (7 items → need 9 cells) */}
          <div className="hidden lg:block border-r border-b border-[#E2E8F0]" />
        </motion.div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 text-[13px] text-[#94A3B8] text-center"
        >
          Total time: under 3 minutes.{" "}
          <a
            href="#"
            className="text-black underline underline-offset-2 hover:no-underline"
          >
            See a live demo
          </a>
        </motion.p>
      </div>
    </section>
  );
}

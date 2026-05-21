"use client";

import { motion, useInView } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { useRef, useState, useEffect } from "react";

/* ── Shared primitives ── */
function SparkIcon({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path d="M8 1L9 6.5H14.5L10 9.5L11.5 15L8 11.5L4.5 15L6 9.5L1.5 6.5H7L8 1Z" fill="currentColor" />
    </svg>
  );
}

/* ── Live pulsing dot ── */
function LiveDot({ color = "green" }: { color?: "green" | "cyan" }) {
  const ring = color === "cyan" ? "bg-cyan-400" : "bg-green-400";
  const fill = color === "cyan" ? "bg-cyan-500" : "bg-green-500";
  return (
    <span className="relative flex h-1.5 w-1.5 shrink-0">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${ring} opacity-75`} />
      <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${fill}`} />
    </span>
  );
}

/* ── Vertical connector ── */
function Connector({ accent = false }: { accent?: boolean }) {
  const dots = accent
    ? [
        { bg: "#000000", glow: "rgba(0,0,0,0.5)", delay: 0 },
        { bg: "#7928CA", glow: "rgba(121,40,202,0.7)", delay: 0.6 },
        { bg: "#000000", glow: "rgba(0,0,0,0.5)", delay: 1.2 },
      ]
    : [
        { bg: "#000000", glow: "rgba(0,0,0,0.5)", delay: 0 },
        { bg: "#000000", glow: "rgba(0,0,0,0.5)", delay: 0.6 },
        { bg: "#000000", glow: "rgba(0,0,0,0.5)", delay: 1.2 },
      ];

  return (
    <div className="flex justify-center">
      <div className="relative w-px h-14 bg-[#E2E8F0]">
        {dots.map((d, i) => (
          <div
            key={i}
            className="pv-packet absolute left-1/2 -translate-x-1/2 w-[6px] h-[6px] rounded-full"
            style={{
              backgroundColor: d.bg,
              boxShadow: `0 0 6px 1px ${d.glow}`,
              animationDelay: `${d.delay}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Stage cell ── */
type StageState = "waiting" | "active" | "done";
interface Stage { label: string; value: string; state: StageState }

function StageCell({ label, value, state }: Stage) {
  return (
    <div
      className={`relative overflow-hidden px-2.5 py-2.5 border transition-all duration-500 ${
        state === "active"
          ? "border-cyan-200 bg-white shadow-[0_0_0_1px_rgba(0,210,255,0.15),0_2px_8px_rgba(0,210,255,0.08)]"
          : state === "done"
          ? "border-green-200 bg-white"
          : "border-[#E2E8F0] bg-[#F8FAFC]"
      }`}
    >
      {/* Top accent bar */}
      <div
        className={`absolute top-0 inset-x-0 h-[2.5px] transition-all duration-500 ${
          state === "active"
            ? "opacity-100"
            : state === "done"
            ? "opacity-90"
            : "opacity-0"
        }`}
        style={{
          background:
            state === "active"
              ? "linear-gradient(90deg, #00D2FF, #00B8E0)"
              : state === "done"
              ? "#22C55E"
              : "transparent",
        }}
      />
      <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-[#94A3B8] mb-1.5">
        {label}
      </p>
      <p
        className={`text-[9.5px] sm:text-[11px] font-mono font-semibold truncate transition-colors duration-500 ${
          state === "active"
            ? "text-[#0EA5E9]"
            : state === "done"
            ? "text-green-500"
            : "text-[#CBD5E1]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/* ── Pipeline visualization ── */
function PipelineViz() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  const [stages, setStages] = useState<Stage[]>([
    { label: "Detect", value: "Next.js + Express", state: "done" },
    { label: "Build",  value: "Compiling…",        state: "active" },
    { label: "Route",  value: "Waiting",            state: "waiting" },
  ]);

  const [feStarted, setFeStarted] = useState(false);
  const [beStarted, setBeStarted] = useState(false);

  useEffect(() => {
    if (!isInView) return;
    const t1 = setTimeout(() => setStages([
      { label: "Detect", value: "Next.js + Express", state: "done" },
      { label: "Build",  value: "Built ✓",           state: "done" },
      { label: "Route",  value: "Routing…",           state: "active" },
    ]), 2800);
    const t2 = setTimeout(() => setStages([
      { label: "Detect", value: "Next.js + Express", state: "done" },
      { label: "Build",  value: "Built ✓",           state: "done" },
      { label: "Route",  value: "Dispatched ✓",      state: "done" },
    ]), 4800);
    const t3 = setTimeout(() => setFeStarted(true), 800);
    const t4 = setTimeout(() => setBeStarted(true), 1100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [isInView]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-lg mx-auto"
    >
      {/* Outer container with grid texture */}
      <div className="relative overflow-hidden border border-[#E2E8F0] bg-[#F8FAFC] p-4 sm:p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
        {/* Grid background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(0,0,0,0.025) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.025) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        {/* Radial edge fade */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 95% 90% at 50% 50%, transparent 35%, #F8FAFC 100%)",
          }}
        />

        <div className="relative z-10 flex flex-col">

          {/* ── SOURCE ── */}
          <div className="bg-white border border-[#E2E8F0] p-4 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-1.5 mb-3">
              <span className="w-[5px] h-[5px] rounded-full bg-[#CBD5E1] shrink-0" />
              <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]">Source</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 border border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-center shrink-0">
                <Image src="/github.png" alt="GitHub" width={20} height={20} className="object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-black leading-tight">GitHub Repository</p>
                <p className="text-[10.5px] text-[#94A3B8] font-mono mt-0.5">main · 3f8a2c1</p>
              </div>
              <div className="bg-[#0F0F0F] text-white px-3 py-1 text-[9px] font-bold uppercase tracking-[0.1em] shrink-0">
                Push
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#F1F5F9] min-w-0">
              <div className="w-2 h-2 rounded-full border-[1.5px] border-[#94A3B8] bg-white shrink-0" />
              <div className="flex-1 h-px bg-[#E2E8F0] min-w-0" />
              <span className="text-[9px] font-mono text-[#94A3B8] shrink-0 truncate max-w-[55%]">feat: add payment gateway</span>
            </div>
          </div>

          <Connector />

          {/* ── ORCHESTRATOR ── */}
          <div className="bg-white border border-black p-4 shadow-[0_2px_16px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.06)]">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                  <Image src="/logo.png" alt="deplo.ai" width={20} height={20} className="object-contain" />
                </div>
                <span className="text-[14px] font-semibold text-black tracking-[-0.03em]">
                  deplo<span className="text-[#94A3B8]">.ai</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 px-2 py-1">
                <LiveDot />
                <span className="text-[8.5px] font-bold uppercase tracking-[0.1em] text-green-600">Orchestrating</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 mb-2.5">
              <span className="w-[5px] h-[5px] rounded-full bg-[#CBD5E1] shrink-0" />
              <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]">Pipeline stages</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {stages.map((s) => <StageCell key={s.label} {...s} />)}
            </div>
          </div>

          <Connector accent />

          {/* ── ENV SYNC ── */}
          <div className="bg-white border border-[#E2E8F0] px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden relative">
            <div className="pv-env-sweep absolute inset-0 pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#64748B] shrink-0">
                Env sync
              </span>
              <div className="flex gap-1.5 flex-wrap flex-1">
                {["DATABASE_URL", "API_SECRET", "NEXT_PUBLIC_URL"].map((v, i) => (
                  <span
                    key={v}
                    className="pv-pill-in text-[8px] font-mono px-2 py-0.5 border border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] whitespace-nowrap"
                    style={{ animationDelay: `${1.0 + i * 0.3}s` }}
                  >
                    {v}
                  </span>
                ))}
              </div>
              <span
                className="pv-pill-in text-[9px] font-bold text-green-600 shrink-0 flex items-center gap-1"
                style={{ animationDelay: "2.2s" }}
              >
                <span className="w-1 h-1 rounded-full bg-green-500 inline-block" />
                Synced
              </span>
            </div>
          </div>

          <Connector accent />

          {/* ── OUTPUT ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Frontend → Vercel */}
            <div className="bg-white border border-[#E2E8F0] p-3.5 relative overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.05)] flex flex-col gap-2.5">
              {/* Bottom accent */}
              <div className="absolute bottom-0 inset-x-0 h-[3px] bg-black" />
              <div className="flex items-center gap-1.5">
                <LiveDot />
                <span className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]">Frontend</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 border border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-center shrink-0">
                  <Image src="/vercel.png" alt="Vercel" width={14} height={14} className="object-contain" />
                </div>
                <span className="text-[13px] font-semibold text-black tracking-[-0.01em]">Vercel</span>
              </div>
              <span className="text-[9px] font-mono text-[#64748B] truncate">myapp.vercel.app</span>
              <div className="h-[3px] bg-[#E2E8F0] mt-auto">
                <div
                  className="h-full bg-black"
                  style={{
                    width: feStarted ? "100%" : "0%",
                    transition: feStarted ? "width 3.2s cubic-bezier(0.4,0,0.2,1)" : "none",
                  }}
                />
              </div>
            </div>

            {/* Backend → Render */}
            <div className="bg-white border border-[#E2E8F0] p-3.5 relative overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.05)] flex flex-col gap-2.5">
              {/* Bottom accent */}
              <div className="absolute bottom-0 inset-x-0 h-[3px] bg-[#7928CA]" />
              <div className="flex items-center gap-1.5">
                <LiveDot />
                <span className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]">Backend</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 border border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-center shrink-0">
                  <Image src="/render.png" alt="Render" width={14} height={14} className="object-contain" />
                </div>
                <span className="text-[13px] font-semibold text-black tracking-[-0.01em]">Render</span>
              </div>
              <span className="text-[9px] font-mono text-[#7928CA] truncate">api.onrender.com</span>
              <div className="h-[3px] bg-[#E2E8F0] mt-auto">
                <div
                  className="h-full bg-[#7928CA]"
                  style={{
                    width: beStarted ? "100%" : "0%",
                    transition: beStarted ? "width 3.8s cubic-bezier(0.4,0,0.2,1)" : "none",
                  }}
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}

/* ── Stats strip ── */
const stats = [
  { value: "< 3 min", label: "Avg. deploy time" },
  { value: "Zero",    label: "Config files needed" },
  { value: "2 clouds", label: "Deployed simultaneously" },
];

/* ── Hero section ── */
export function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center pt-14 bg-white overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-24 flex flex-col items-center text-center gap-8">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex items-center gap-2 border border-black/8 bg-white/80 backdrop-blur-sm px-3.5 py-1.5"
        >
          <SparkIcon size={11} className="text-black" />
          <span className="text-[11.5px] font-semibold tracking-[0.04em] uppercase text-black">
            AI-Powered Deployment Orchestration
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-black leading-[1.0] tracking-[-0.045em] font-semibold"
          style={{ fontSize: "clamp(3rem, 7.5vw, 5.25rem)" }}
        >
          Code goes in.
          <br />
          Production URL
          <br />
          comes out.
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-xl text-[#64748B] leading-[1.65]"
          style={{ fontSize: "clamp(1rem, 2vw, 1.125rem)" }}
        >
          Connect your GitHub repo. deplo.ai detects your stack, deploys
          frontend to Vercel and backend to Render, syncs environment
          variables—and hands you production-ready URLs.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.42 }}
          className="flex flex-col sm:flex-row items-center gap-3"
        >
          <a
            href="#"
            className="flex items-center gap-2 h-11 px-6 bg-black text-white text-[13.5px] font-semibold tracking-[-0.01em] hover:bg-gray-900 transition-colors"
          >
            <SparkIcon size={12} />
            Launch App
          </a>
          <a
            href="#"
            className="flex items-center gap-2 h-11 px-6 border border-black/12 bg-white text-black text-[13.5px] font-medium hover:border-black/25 hover:bg-gray-50 transition-colors"
          >
            <Image src="/github.png" alt="" width={15} height={15} className="object-contain" />
            Connect GitHub
          </a>
          <a
            href="#how-it-works"
            className="flex items-center gap-1.5 h-11 px-4 text-[13px] font-medium text-[#64748B] hover:text-black transition-colors"
          >
            See how it works
            <ArrowRight size={13} />
          </a>
        </motion.div>

        {/* Pipeline visualization */}
        <PipelineViz />

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.75 }}
          className="w-full max-w-2xl border-t border-[#E2E8F0] pt-6 grid grid-cols-3 gap-2 sm:gap-4"
        >
          {stats.map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center gap-0.5">
              <span className="text-[15px] font-semibold text-black tracking-[-0.02em]">{value}</span>
              <span className="text-[11px] text-[#94A3B8]">{label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

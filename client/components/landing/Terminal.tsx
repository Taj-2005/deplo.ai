"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { motion } from "framer-motion";

type LineType = "command" | "info" | "success" | "url" | "blank" | "separator";

interface TerminalLine {
  text: string;
  type: LineType;
  delay?: number;
}

const terminalLines: TerminalLine[] = [
  { text: "$ deplo deploy --repo ./my-app --branch main", type: "command" },
  { text: "", type: "blank" },
  { text: "── Connecting to GitHub...           ✓", type: "info" },
  { text: "── Analyzing repository structure...", type: "info" },
  { text: "── Detected: Next.js 14 (frontend)", type: "info" },
  { text: "── Detected: Express.js (backend)", type: "info" },
  { text: "", type: "blank" },
  { text: "── Resolving environment variables...", type: "info" },
  { text: "── Injecting secrets securely...", type: "info" },
  { text: "", type: "blank" },
  { text: "── Deploying backend to Render...", type: "info" },
  { text: "── Backend ready:                    ✓", type: "info" },
  { text: "", type: "blank" },
  { text: "── Injecting NEXT_PUBLIC_API_URL...", type: "info" },
  { text: "── Deploying frontend to Vercel...", type: "info" },
  { text: "── Frontend ready:                   ✓", type: "info" },
  { text: "", type: "blank" },
  { text: "✔  Production URLs ready", type: "success" },
  { text: "   → https://my-app.vercel.app", type: "url" },
  { text: "   → https://api-my-app.onrender.com", type: "url" },
];

function lineColor(type: LineType): string {
  switch (type) {
    case "command":
      return "#F1F5F9";
    case "info":
      return "#94A3B8";
    case "success":
      return "#4ADE80";
    case "url":
      return "#00D2FF";
    case "separator":
      return "#334155";
    default:
      return "transparent";
  }
}

export function Terminal() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [visibleCount, setVisibleCount] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (!isInView) return;

    let index = 0;
    const interval = setInterval(() => {
      index++;
      setVisibleCount(index);
      if (index >= terminalLines.length) {
        clearInterval(interval);
        setShowCursor(false);
      }
    }, 110);

    return () => clearInterval(interval);
  }, [isInView]);

  return (
    <section className="bg-[#F9FAFB] py-24 sm:py-32 border-y border-[#E2E8F0]">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        {/* Section label */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mb-12 sm:mb-16"
        >
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[2px] text-[#94A3B8] mb-5">
            <span className="w-[5px] h-[5px] bg-[#94A3B8] inline-block rounded-full" />
            Terminal demo
          </span>
          <h2
            className="text-black font-semibold tracking-[-0.04em] leading-[1.05]"
            style={{ fontSize: "clamp(2rem, 4.5vw, 3rem)" }}
          >
            One command.
            <br />
            <span className="text-[#94A3B8]">Full-stack deployed.</span>
          </h2>
        </motion.div>

        {/* Terminal card */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="bg-[#0A0A0A] border border-[#1E2939] shadow-[0_32px_64px_rgba(0,0,0,0.18)]"
        >
          {/* Terminal header */}
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[#1E2939]">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#28CA41]" />
            </div>
            <div className="flex-1 flex justify-center">
              <span className="text-[11px] font-medium text-[#475569] tracking-wide">
                deplo — terminal
              </span>
            </div>
            <div className="w-[52px]" />
          </div>

          {/* Terminal body */}
          <div className="p-6 sm:p-8 font-mono text-[13px] sm:text-[14px] leading-[1.9] min-h-[360px]">
            {terminalLines.map((line, i) => {
              const visible = i < visibleCount;
              const isLast = i === visibleCount - 1 && showCursor;

              return (
                <div
                  key={i}
                  className={`transition-opacity duration-150 ${
                    visible ? "opacity-100" : "opacity-0"
                  }`}
                  style={{
                    color: lineColor(line.type),
                    height: line.type === "blank" ? "0.75em" : undefined,
                  }}
                >
                  {line.type !== "blank" && (
                    <>
                      {line.text}
                      {isLast && (
                        <span className="cursor-blink ml-px inline-block w-[7px] h-[14px] bg-[#64748B] translate-y-[2px]" />
                      )}
                    </>
                  )}
                </div>
              );
            })}

            {/* Final cursor after all lines */}
            {visibleCount >= terminalLines.length && (
              <div className="mt-2">
                <span className="text-[#94A3B8]">$ </span>
                <span className="cursor-blink inline-block w-[7px] h-[14px] bg-[#64748B] translate-y-[2px]" />
              </div>
            )}
          </div>
        </motion.div>

        {/* Caption */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="mt-6 text-center text-[13px] text-[#94A3B8]"
        >
          Works with Next.js, React, Express, and Fastify. More frameworks
          coming.
        </motion.p>
      </div>
    </section>
  );
}

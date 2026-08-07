"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { motion } from "framer-motion";
import { ShieldCheck, Zap, Code2 } from "lucide-react";

/* ── Animated counter ── */
function AnimatedCounter({
  value,
  suffix = "",
  prefix = "",
  isInView,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  isInView: boolean;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const duration = 1200;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(Math.round(increment * step), value);
      setCount(current);
      if (step >= steps) clearInterval(timer);
    }, duration / steps);

    return () => clearInterval(timer);
  }, [isInView, value]);

  return (
    <span>
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

interface LiveStats {
  deployments: number;
  avgMinutesToProduction: number | null;
}

export function Trust() {
  const statsRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(statsRef, { once: true, margin: "-80px" });

  // Live platform numbers from the public API. The backend runs on Render and
  // may be cold-starting, so retry with backoff until it answers — the stats
  // fill in the moment the server is live. Placeholders render meanwhile; the
  // landing page itself never depends on the API.
  const [live, setLive] = useState<LiveStats | null>(null);
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const attempt = (n: number) => {
      fetch("/api/v1/public/stats")
        .then((res) => (res.ok ? (res.json() as Promise<LiveStats>) : Promise.reject(new Error(String(res.status)))))
        .then((data) => {
          if (!cancelled && data && typeof data.deployments === "number") setLive(data);
        })
        .catch(() => {
          // Back off 2s → 4s → 8s → 15s (cap), ~12 tries ≈ 2.5 min — enough
          // to outlast a Render free-tier wake-up.
          if (!cancelled && n < 12) {
            timer = setTimeout(() => attempt(n + 1), Math.min(2000 * 2 ** n, 15_000));
          }
        });
    };
    attempt(0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  // value: null → data not loaded (or unavailable) → renders as "—", never a
  // made-up number.
  const stats: Array<{
    value: number | null;
    suffix?: string;
    prefix?: string;
    label: string;
    icon: typeof Zap;
  }> = [
    {
      value: live?.deployments ?? null,
      label: "Deployments orchestrated",
      icon: Zap,
    },
    {
      value: 100,
      suffix: "%",
      label: "Zero infrastructure owned",
      icon: ShieldCheck,
    },
    {
      value: live?.avgMinutesToProduction ?? null,
      prefix: "<",
      label: "Minutes to production, avg",
      icon: Code2,
    },
  ];

  return (
    <section className="bg-white py-24 sm:py-32 border-t border-[#E2E8F0]">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mb-16 sm:mb-20"
        >
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[2px] text-[#94A3B8] mb-5">
            <span className="w-[5px] h-[5px] bg-[#94A3B8] inline-block rounded-full" />
            Developer trust
          </span>
          <h2
            className="text-black font-semibold tracking-[-0.04em] leading-[1.05]"
            style={{ fontSize: "clamp(2rem, 4.5vw, 3rem)" }}
          >
            Built for developers
            <br />
            <span className="text-[#94A3B8]">who ship fast.</span>
          </h2>
        </motion.div>

        {/* Stats */}
        <div
          ref={statsRef}
          className="grid grid-cols-1 sm:grid-cols-3 gap-0 border border-[#E2E8F0]"
        >
          {stats.map(({ value, suffix = "", prefix = "", label, icon: Icon }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="flex flex-col gap-2 p-8 border-b sm:border-b-0 sm:border-r border-[#E2E8F0] last:border-0"
            >
              <div className="w-8 h-8 border border-[#E2E8F0] flex items-center justify-center text-[#94A3B8] mb-2">
                <Icon size={15} strokeWidth={1.75} />
              </div>
              <span
                className="text-black font-semibold tracking-[-0.04em]"
                style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
              >
                {value === null ? (
                  <span className="text-[#CBD5E1]">—</span>
                ) : (
                  <>
                    {prefix}
                    <AnimatedCounter value={value} suffix={suffix} isInView={isInView} />
                  </>
                )}
              </span>
              <span className="text-[13px] text-[#64748B]">{label}</span>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}

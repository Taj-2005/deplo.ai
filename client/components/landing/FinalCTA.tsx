"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useAuthNavigation } from "@/hooks/useAuthNavigation";

export function FinalCTA() {
  const { isAuthenticated } = useAuth();
  const { launchApp, connectGithub } = useAuthNavigation();

  return (
    <section className="relative overflow-hidden bg-white py-24 sm:py-36 border-t border-[#E2E8F0]">
      {/* Subtle radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(0,210,255,0.05) 0%, rgba(121,40,202,0.04) 50%, transparent 100%)",
        }}
      />

      {/* Grid texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-5 sm:px-8 flex flex-col items-center text-center gap-8">
        {/* Pipeline mini-visualization */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-0 text-[11px] font-mono text-[#94A3B8]"
        >
          <span
            className={`border px-3 py-1.5 bg-white flex items-center gap-1.5 ${
              isAuthenticated ? "border-green-200 text-green-700" : "border-[#E2E8F0]"
            }`}
          >
            <Image src="/github.png" alt="GitHub" width={12} height={12} className="object-contain opacity-70" />
            {isAuthenticated ? "github.com/you · connected" : "github.com/you/app"}
          </span>
          <span className="border-y border-[#E2E8F0] px-2 py-1.5 bg-[#F9FAFB]">→</span>
          <span className="border border-black px-3 py-1.5 bg-white text-black font-semibold flex items-center gap-1.5">
            <Image src="/logo.png" alt="deplo.ai" width={12} height={12} className="object-contain" />
            deplo.ai
          </span>
          <span className="border-y border-[#E2E8F0] px-2 py-1.5 bg-[#F9FAFB]">→</span>
          <span className="border border-[#E2E8F0] px-3 py-1.5 bg-white text-green-600 font-semibold">https://…</span>
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-black font-semibold tracking-[-0.045em] leading-[1.0]"
          style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)" }}
        >
          Ready to ship?
        </motion.h2>

        {/* Subline */}
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-md text-[#64748B] leading-[1.65]"
          style={{ fontSize: "clamp(1rem, 2vw, 1.125rem)" }}
        >
          Connect your GitHub repository. deplo.ai handles the rest—and returns
          production-ready URLs in under 4 minutes.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-3"
        >
          <button
            type="button"
            onClick={launchApp}
            className="flex items-center gap-2 h-12 px-7 bg-gray-200 text-black text-[14px] font-semibold tracking-[-0.01em] hover:bg-gray-300 transition-colors"
          >
            <Image src="/logo.png" alt="" width={15} height={15} className="object-contain" />
            {isAuthenticated ? "Go to Dashboard" : "Start deploying free"}
          </button>
          <button
            type="button"
            onClick={connectGithub}
            className={`flex items-center gap-2 h-12 px-6 border text-[14px] font-medium transition-colors ${
              isAuthenticated
                ? "border-green-200 bg-green-50 text-green-800 hover:border-green-300"
                : "border-black/12 bg-white text-black hover:border-black/25 hover:bg-gray-50"
            }`}
          >
            <Image src="/github.png" alt="" width={15} height={15} className="object-contain" />
            {isAuthenticated ? "GitHub Connected" : "Connect GitHub"}
          </button>
        </motion.div>

        {/* Footnote */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.45, duration: 0.4 }}
          className="text-[12px] text-[#94A3B8]"
        >
          Free to start · No credit card · No DevOps experience required
        </motion.p>
      </div>
    </section>
  );
}

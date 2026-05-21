"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";

interface Integration {
  name: string;
  role: string;
  logo: string;
  bg: string;
  padded?: boolean;
  live: boolean;
  authGated?: boolean;
}

const integrations: Integration[] = [
  {
    name: "GitHub",
    role: "Source Control",
    logo: "/github.png",
    bg: "bg-white",
    live: true,
    authGated: true,
  },
  {
    name: "Vercel",
    role: "Frontend Deploy",
    logo: "/vercel.png",
    bg: "bg-white",
    live: true,
  },
  {
    name: "Render",
    role: "Backend Deploy",
    logo: "/render.png",
    bg: "bg-white",
    padded: true,
    live: true,
  },
  {
    name: "Supabase",
    role: "Database",
    logo: "/supabase.png",
    bg: "bg-[#1C1C1C]",
    live: true,
  },
  {
    name: "Cloudflare",
    role: "Edge & DNS",
    logo: "/cloudflare.png",
    bg: "bg-white",
    padded: true,
    live: true,
  },
  {
    name: "Railway",
    role: "Infra (soon)",
    logo: "/railway.png",
    bg: "bg-white",
    live: false,
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: "easeOut" as const },
  },
};

function getStatusLabel(integration: Integration, isAuthenticated: boolean): string {
  if (integration.authGated && isAuthenticated) return "Connected";
  if (integration.live) return "Live";
  return "Soon";
}

function getStatusColor(integration: Integration, isAuthenticated: boolean): string {
  if (integration.authGated && isAuthenticated) return "bg-green-500";
  if (integration.live) return "bg-green-400";
  return "bg-[#E2E8F0]";
}

export function Integrations() {
  const { isAuthenticated } = useAuth();

  return (
    <section id="integrations" className="bg-white py-24 sm:py-32">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mb-16 sm:mb-20 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6"
        >
          <div>
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[2px] text-[#94A3B8] mb-5">
              <span className="w-[5px] h-[5px] bg-[#94A3B8] inline-block rounded-full" />
              Integrations
            </span>
            <h2
              className="text-black font-semibold tracking-[-0.04em] leading-[1.05]"
              style={{ fontSize: "clamp(2rem, 4.5vw, 3rem)" }}
            >
              Works with tools
              <br />
              <span className="text-[#94A3B8]">you already use.</span>
            </h2>
          </div>
          <p className="text-[14px] text-[#64748B] max-w-xs leading-relaxed">
            deplo.ai orchestrates across GitHub, Vercel, Render, and more — no
            account needed beyond GitHub OAuth.
          </p>
        </motion.div>

        {/* Integration grid */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-0 border-l border-t border-[#E2E8F0]"
        >
          {integrations.map((integration) => (
            <motion.div
              key={integration.name}
              variants={cardVariant}
              whileHover={{ y: -3, transition: { duration: 0.18 } }}
              className={`group flex flex-col items-center gap-4 p-6 sm:p-8 border-r border-b border-[#E2E8F0] cursor-default transition-colors ${
                integration.authGated && isAuthenticated
                  ? "bg-green-50/40 hover:bg-green-50/70"
                  : "hover:bg-gray-50/70"
              }`}
            >
              {/* Logo box */}
              <div
                className={`w-12 h-12 flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105 ${integration.bg} ${integration.padded ? "p-2" : ""}`}
              >
                <Image
                  src={integration.logo}
                  alt={integration.name}
                  width={40}
                  height={40}
                  className="object-contain w-full h-full"
                />
              </div>

              {/* Name + role */}
              <div className="text-center">
                <div className="text-[13px] font-semibold text-black tracking-[-0.01em]">
                  {integration.name}
                </div>
                <div className="text-[11px] text-[#94A3B8] mt-0.5">
                  {integration.role}
                </div>
              </div>

              {/* Status indicator */}
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${getStatusColor(integration, isAuthenticated)}`}
                />
                <span
                  className={`text-[10px] ${
                    integration.authGated && isAuthenticated
                      ? "text-green-700 font-medium"
                      : "text-[#94A3B8]"
                  }`}
                >
                  {getStatusLabel(integration, isAuthenticated)}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="mt-8 text-center text-[13px] text-[#94A3B8]"
        >
          More integrations shipping soon.{" "}
          <a
            href="#"
            className="text-black underline underline-offset-2 hover:no-underline"
          >
            Request one
          </a>
        </motion.p>
      </div>
    </section>
  );
}

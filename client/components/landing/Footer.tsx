"use client";

import Link from "next/link";
import Image from "next/image";

const footerLinks = [
  {
    group: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "How it works", href: "#how-it-works" },
      { label: "Integrations", href: "#integrations" },
      { label: "Pricing", href: "#pricing" },
    ],
  },
  {
    group: "Developers",
    links: [
      { label: "Documentation", href: "#" },
      { label: "GitHub", href: "#" },
      { label: "API Reference", href: "#" },
      { label: "Changelog", href: "#" },
    ],
  },
  {
    group: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Twitter", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
  {
    group: "Legal",
    links: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
      { label: "Security", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-white border-t border-[#E2E8F0]">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-8 lg:gap-12">
          {/* Brand column */}
          <div className="col-span-2 flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2 group w-fit">
              <Image src="/logo.png" alt="deplo.ai" width={24} height={24} className="object-contain" />
              <span
                className="text-[15px] font-semibold tracking-[-0.04em] text-black"
              >
                deplo<span className="text-[#94A3B8]">.ai</span>
              </span>
            </Link>
            <p className="text-[13px] text-[#64748B] leading-relaxed max-w-[220px]">
              AI-powered deployment orchestration. GitHub to production in
              minutes.
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[11px] text-[#94A3B8]">
                All systems operational
              </span>
            </div>
          </div>

          {/* Link columns */}
          {footerLinks.map(({ group, links }) => (
            <div key={group} className="flex flex-col gap-4">
              <span className="text-[11px] font-bold uppercase tracking-[1.8px] text-black">
                {group}
              </span>
              <div className="flex flex-col gap-2.5">
                {links.map(({ label, href }) => (
                  <a
                    key={label}
                    href={href}
                    className="text-[13px] text-[#64748B] hover:text-black transition-colors w-fit"
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-[#94A3B8]">
            © {new Date().getFullYear()} deplo.ai · All rights reserved
          </p>
          <p className="text-[12px] text-[#94A3B8]">
            Made for indie hackers, students, and startup founders
          </p>
        </div>
      </div>
    </footer>
  );
}

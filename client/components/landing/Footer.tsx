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
      { label: "GitHub", href: "https://github.com/deplolabs" },
      { label: "API Reference", href: "#" },
      { label: "Changelog", href: "#" },
    ],
  },
  {
    group: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Blog", href: "#" },
      { label: "LinkedIn", href: "https://www.linkedin.com/company/deplo-ai" },
      { label: "GitHub", href: "https://github.com/deplolabs" },
      { label: "Twitter", href: "#" },
      { label: "Contact", href: "mailto:deploai201@gmail.com" },
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
            <div className="flex items-center gap-2 mt-1">
              <a
                href="https://www.linkedin.com/company/deplo-ai"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="deplo.ai on LinkedIn"
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E2E8F0] text-[#64748B] hover:text-[#0A66C2] hover:border-[#0A66C2] transition-colors"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
              <a
                href="https://github.com/deplolabs"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="deplo.ai on GitHub"
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E2E8F0] text-[#64748B] hover:text-black hover:border-black transition-colors"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                </svg>
              </a>
              <a
                href="mailto:deploai201@gmail.com"
                aria-label="Email deplo.ai"
                className="group w-8 h-8 flex items-center justify-center rounded-lg border border-[#E2E8F0] hover:border-[#EA4335] transition-colors"
              >
                <span className="w-[19px] h-[19px]">
                  <Image
                    src="/gmail.webp"
                    alt=""
                    width={19}
                    height={19}
                    className="w-full h-full object-contain grayscale opacity-60 transition-all group-hover:grayscale-0 group-hover:opacity-100"
                    aria-hidden="true"
                  />
                </span>
              </a>
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
                    {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
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
          <a
            href="mailto:deploai201@gmail.com"
            className="text-[12px] text-[#94A3B8] hover:text-black transition-colors"
          >
            deploai201@gmail.com
          </a>
        </div>
      </div>
    </footer>
  );
}

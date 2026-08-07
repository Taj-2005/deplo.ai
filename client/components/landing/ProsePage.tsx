import type { ReactNode } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

/**
 * Shell for long-form marketing-site pages (legal pages, blog posts):
 * landing navbar + footer around a measured prose column. Typography for
 * the children comes from the `.prose-page` styles in globals.css.
 */
export function ProsePage({
  eyebrow,
  title,
  meta,
  children,
}: {
  eyebrow: string;
  title: string;
  meta?: string;
  children: ReactNode;
}) {
  return (
    <main className="bg-white min-h-screen">
      <Navbar />
      <div className="max-w-3xl mx-auto px-5 sm:px-8 pt-36 pb-24">
        <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[2px] text-[#94A3B8] mb-5">
          <span className="w-[5px] h-[5px] bg-[#94A3B8] inline-block rounded-full" />
          {eyebrow}
        </span>
        <h1
          className="text-black font-semibold tracking-[-0.04em] leading-[1.08] mb-3"
          style={{ fontSize: "clamp(2rem, 4.5vw, 2.75rem)" }}
        >
          {title}
        </h1>
        {meta && <p className="text-[13px] text-[#94A3B8] mb-10">{meta}</p>}
        <div className="prose-page">{children}</div>
      </div>
      <Footer />
    </main>
  );
}

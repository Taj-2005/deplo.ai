"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, Moon, Search, Sun, X } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { DOCS_NAV, findDocPage, prevNext } from "@/lib/docs/navigation";
import { SearchModal } from "./SearchModal";
import { Toc } from "./Toc";

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Documentation" className="space-y-7 pb-16">
      {DOCS_NAV.map((section) => (
        <div key={section.title}>
          <div className="mb-2 text-[11px] font-mono uppercase tracking-wider text-ds-on-variant">
            {section.title}
          </div>
          <ul className="space-y-px">
            {section.pages.map((page) => {
              const active = pathname === page.href;
              return (
                <li key={page.href}>
                  <Link
                    href={page.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`block border-l py-1.5 pl-3 pr-2 text-[13.5px] leading-snug transition-colors ${
                      active
                        ? "border-l-[var(--accent-cyan)] text-ds-on-surface font-medium bg-ds-surface-low"
                        : "border-l-ds-outline-variant text-ds-on-variant hover:text-ds-on-surface hover:border-l-ds-outline"
                    }`}
                  >
                    {page.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

// ─── Breadcrumbs + prev/next ──────────────────────────────────────────────────

function Breadcrumbs() {
  const pathname = usePathname();
  const page = findDocPage(pathname);
  if (!page || page.href === "/docs") return null;
  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-[12px] font-mono text-ds-on-variant">
      <Link href="/docs" className="hover:text-ds-on-surface transition-colors">
        Docs
      </Link>
      <span className="text-ds-outline">/</span>
      <span>{page.section}</span>
      <span className="text-ds-outline">/</span>
      <span className="text-ds-on-surface">{page.title}</span>
    </nav>
  );
}

function PrevNextNav() {
  const pathname = usePathname();
  const { prev, next } = prevNext(pathname);
  if (!prev && !next) return null;
  return (
    <nav aria-label="Pagination" className="mt-16 grid gap-3 border-t border-ds-outline-variant pt-6 sm:grid-cols-2">
      {prev ? (
        <Link
          href={prev.href}
          className="group border border-ds-outline-variant bg-ds-surface p-4 hover:border-ds-outline transition-colors"
        >
          <div className="text-[11px] font-mono uppercase tracking-wider text-ds-on-variant">← Previous</div>
          <div className="mt-1 text-[14px] font-medium text-ds-on-surface">{prev.title}</div>
        </Link>
      ) : (
        <div />
      )}
      {next && (
        <Link
          href={next.href}
          className="group border border-ds-outline-variant bg-ds-surface p-4 text-right hover:border-ds-outline transition-colors"
        >
          <div className="text-[11px] font-mono uppercase tracking-wider text-ds-on-variant">Next →</div>
          <div className="mt-1 text-[14px] font-medium text-ds-on-surface">{next.title}</div>
        </Link>
      )}
    </nav>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export function DocsShell({ children }: { children: React.ReactNode }) {
  const { resolvedTheme, toggle } = useTheme();
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // ⌘K / Ctrl+K opens search anywhere in the docs.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);

  return (
    <div className="min-h-screen bg-ds-bg text-ds-on-surface">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-ds-outline-variant bg-ds-bg/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[88rem] items-center gap-4 px-4 sm:px-6">
          <button
            className="lg:hidden -ml-1 p-1.5 text-ds-on-variant hover:text-ds-on-surface"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={17} strokeWidth={1.5} />
          </button>

          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="" width={22} height={22} className="object-contain dark:hidden" />
            <Image src="/logo-dark.png" alt="" width={22} height={22} className="object-contain hidden dark:block" />
            <span className="text-[15px] font-semibold tracking-[-0.04em] text-ds-on-surface">
              deplo<span className="text-[#94A3B8]">.ai</span>
            </span>
          </Link>
          <Link href="/docs" className="text-[13px] font-mono text-ds-on-variant hover:text-ds-on-surface transition-colors">
            /docs
          </Link>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 border border-ds-outline-variant px-2.5 py-1.5 text-[12.5px] text-ds-on-variant hover:text-ds-on-surface hover:border-ds-outline transition-colors"
              aria-label="Search documentation"
            >
              <Search size={13} strokeWidth={1.5} />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden sm:inline border border-ds-outline-variant px-1 text-[10px] font-mono">⌘K</kbd>
            </button>
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="p-2 text-ds-on-variant hover:text-ds-on-surface transition-colors"
            >
              {resolvedTheme === "dark" ? <Sun size={15} strokeWidth={1.5} /> : <Moon size={15} strokeWidth={1.5} />}
            </button>
            <Link
              href="/dashboard"
              className="hidden sm:block border border-ds-outline-variant px-3 py-1.5 text-[12.5px] font-mono text-ds-on-surface hover:border-ds-outline transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[88rem] px-4 sm:px-6">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-60 shrink-0 border-r border-ds-outline-variant">
          <div className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto py-8 pr-5">
            <SidebarNav />
          </div>
        </aside>

        {/* Mobile drawer */}
        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/40" onClick={closeMobileNav} />
            <div className="absolute inset-y-0 left-0 w-72 overflow-y-auto border-r border-ds-outline-variant bg-ds-bg p-5">
              <div className="mb-5 flex items-center justify-between">
                <span className="text-[13px] font-mono text-ds-on-variant">Documentation</span>
                <button onClick={closeMobileNav} aria-label="Close navigation" className="p-1 text-ds-on-variant">
                  <X size={16} strokeWidth={1.5} />
                </button>
              </div>
              <SidebarNav onNavigate={closeMobileNav} />
            </div>
          </div>
        )}

        {/* Content */}
        <main className="min-w-0 flex-1 py-10 lg:px-10">
          <Breadcrumbs />
          <article>{children}</article>
          <PrevNextNav />
          <footer className="mt-12 border-t border-ds-outline-variant pt-5 pb-16 text-[12px] font-mono text-ds-on-variant">
            <span key={pathname}>
              deplo.ai docs ·{" "}
              <a
                href="mailto:deploai201@gmail.com"
                className="hover:text-ds-on-surface transition-colors"
              >
                deploai201@gmail.com
              </a>
            </span>
          </footer>
        </main>

        {/* ToC rail */}
        <aside className="hidden xl:block w-56 shrink-0">
          <div className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto py-10 pl-6">
            <Toc />
          </div>
        </aside>
      </div>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

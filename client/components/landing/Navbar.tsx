"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { APP_ENABLED } from "@/lib/flags";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#integrations", label: "Integrations" },
  { href: "#pricing", label: "Pricing" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, isLoading, signIn, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  function handleLaunchApp() {
    if (isAuthenticated) {
      router.push("/dashboard");
    } else {
      signIn();
    }
  }

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-black focus:text-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium"
      >
        Skip to content
      </a>
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/92 backdrop-blur-xl border-b border-black/5 shadow-[0_1px_0_rgba(0,0,0,0.04)]"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
              <Image
                src="/logo.png"
                alt="deplo.ai logo"
                width={48}
                height={48}
                className="object-contain"
                priority
              />
              <span
                className="text-[15px] font-semibold tracking-[-0.04em] text-black"
                style={{ letterSpacing: "-0.04em" }}
              >
                deplo<span className="text-[#94A3B8]">.ai</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  className="px-3.5 py-1.5 text-[13.5px] font-medium text-[#64748B] hover:text-black transition-colors rounded"
                >
                  {label}
                </a>
              ))}
            </nav>

            {/* Desktop CTAs */}
            <div className="hidden md:flex items-center gap-3">
              {APP_ENABLED ? (
                <>
                  {!isLoading && (
                    isAuthenticated ? (
                      <button
                        onClick={signOut}
                        className="text-[13px] font-medium text-[#64748B] hover:text-black transition-colors"
                      >
                        Sign out
                      </button>
                    ) : (
                      <button
                        onClick={signIn}
                        className="text-[13px] font-medium text-[#64748B] hover:text-black transition-colors"
                      >
                        Sign in
                      </button>
                    )
                  )}
                  <button
                    onClick={handleLaunchApp}
                    className="flex items-center gap-1.5 h-8 px-4 text-black text-[13px] font-semibold tracking-[-0.01em] hover:bg-gray-100 rounded transition-colors"
                  >
                    <Image src="/logo.png" alt="" width={28} height={28} className="object-contain" />
                    {isAuthenticated ? "Dashboard" : "Launch App"}
                  </button>
                </>
              ) : (
                <span className="h-7 px-3 flex items-center text-[12px] font-medium text-[#94A3B8] border border-[#E2E8F0] bg-[#F8FAFC] select-none">
                  Coming soon
                </span>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 text-gray-600 hover:text-black transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="fixed top-14 left-0 right-0 z-40 bg-white border-b border-black/5 shadow-sm md:hidden"
          >
            <div className="max-w-6xl mx-auto px-5 py-4 flex flex-col gap-1">
              {navLinks.map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2.5 text-[14px] font-medium text-gray-700 hover:text-black hover:bg-gray-50 rounded transition-colors"
                >
                  {label}
                </a>
              ))}
              <div className="pt-3 mt-2 border-t border-black/5 flex flex-col gap-2">
                {APP_ENABLED ? (
                  <>
                    {!isLoading && (
                      isAuthenticated ? (
                        <button
                          onClick={() => { setMobileOpen(false); signOut(); }}
                          className="px-3 py-2.5 text-[14px] font-medium text-gray-700 hover:text-black transition-colors text-left"
                        >
                          Sign out
                        </button>
                      ) : (
                        <button
                          onClick={() => { setMobileOpen(false); signIn(); }}
                          className="px-3 py-2.5 text-[14px] font-medium text-gray-700 hover:text-black transition-colors text-left"
                        >
                          Sign in with GitHub
                        </button>
                      )
                    )}
                    <button
                      onClick={() => { setMobileOpen(false); handleLaunchApp(); }}
                      className="flex items-center justify-center gap-2 h-10 bg-black text-white text-[13px] font-semibold hover:bg-gray-900 transition-colors"
                    >
                      <Image src="/logo.png" alt="" width={28} height={28} className="object-contain" />
                      {isAuthenticated ? "Dashboard" : "Launch App"}
                    </button>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-10 border border-[#E2E8F0] text-[13px] font-medium text-[#94A3B8] bg-[#F8FAFC] select-none">
                    Coming soon
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

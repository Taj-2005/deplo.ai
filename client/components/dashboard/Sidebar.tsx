"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  Layers,
  History,
  Settings,
  Plus,
  FileText,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Overview", exact: true },
  { href: "/dashboard/repositories", icon: Layers, label: "Projects", exact: false },
  { href: "/dashboard/deployments", icon: History, label: "History", exact: false },
  { href: "/dashboard/settings", icon: Settings, label: "Settings", exact: false },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <aside className="group fixed left-0 top-0 h-screen w-14 hover:w-[220px] flex flex-col border-r border-ds-outline-variant bg-ds-bg z-50 overflow-hidden transition-[width] duration-200 ease-out hover:shadow-[4px_0_20px_rgba(0,0,0,0.18)]">
      {/* Logo */}
      <div className="h-16 flex items-center px-3.5 gap-3 shrink-0 border-b border-ds-outline-variant">
        {/* Light mode logo */}
        <Image
          src="/logo.png"
          alt="deplo.ai"
          width={40}
          height={40}
          className="shrink-0 object-contain dark:hidden"
          priority
        />
        {/* Dark mode logo */}
        <Image
          src="/logo-dark.png"
          alt="deplo.ai"
          width={40}
          height={40}
          className="shrink-0 object-contain hidden dark:block"
          priority
        />
        <div className="flex flex-col leading-tight overflow-hidden whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-75">
          <span className="text-[15px] font-bold tracking-[-0.02em] text-ds-on-surface">
            deplo.ai
          </span>
          <span className="text-[11px] text-ds-on-variant">Developer Platform</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 mt-2 px-2 flex flex-col gap-0.5 overflow-hidden">
        {NAV_ITEMS.map(({ href, icon: Icon, label, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={`flex items-center gap-3 px-2.5 py-2.5 transition-colors duration-75 active:scale-[0.98] ${
                active
                  ? "bg-ds-primary text-ds-on-primary"
                  : "text-ds-on-variant hover:bg-ds-surface-highest hover:text-ds-on-surface"
              }`}
            >
              <Icon size={18} strokeWidth={1.5} className="shrink-0" />
              <span className="text-[13px] font-mono font-medium whitespace-nowrap overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-75">
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="p-2 flex flex-col gap-0.5 shrink-0 border-t border-ds-outline-variant pt-3 mt-2">
        {/* New deployment CTA */}
        <Link
          href="/dashboard/repositories"
          title="New Deployment"
          className="flex items-center justify-center gap-2 px-2.5 py-2.5 mb-1 bg-ds-primary text-ds-on-primary hover:opacity-90 transition-opacity active:scale-[0.98] overflow-hidden"
        >
          <Plus size={15} strokeWidth={2} className="shrink-0" />
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider whitespace-nowrap overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-75">
            New Deployment
          </span>
        </Link>

        <a
          href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/docs`}
          target="_blank"
          rel="noopener noreferrer"
          title="Docs"
          className="flex items-center gap-3 px-2.5 py-2.5 text-ds-on-variant hover:bg-ds-surface-highest hover:text-ds-on-surface transition-colors"
        >
          <FileText size={18} strokeWidth={1.5} className="shrink-0" />
          <span className="text-[13px] font-mono font-medium whitespace-nowrap overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-75">
            Docs
          </span>
        </a>

        <button
          onClick={signOut}
          title={user?.email ?? "Sign out"}
          className="flex items-center gap-3 px-2.5 py-2.5 text-ds-on-variant hover:bg-ds-surface-highest hover:text-ds-on-surface transition-colors w-full text-left"
        >
          <LogOut size={18} strokeWidth={1.5} className="shrink-0" />
          <span className="text-[13px] font-mono font-medium whitespace-nowrap overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-75">
            {user?.email ? user.email.split("@")[0] : "Sign out"}
          </span>
        </button>
      </div>
    </aside>
  );
}

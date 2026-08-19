"use client";

import Link from "next/link";
import { Sun, Moon, Bell, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { UserAvatar } from "./UserAvatar";
import { useTheme } from "@/components/providers/ThemeProvider";

export function TopBar() {
  const { user } = useAuth();
  const { resolvedTheme, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-40 flex justify-between items-center w-full h-16 px-6 bg-ds-bg/80 backdrop-blur-md border-b border-ds-outline-variant">
      {/* Search */}
      <div className="flex items-center flex-1 max-w-md">
        <div className="relative w-full">
          <Search
            size={16}
            strokeWidth={1.5}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ds-on-variant pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search projects..."
            className="w-full pl-10 pr-4 py-2 bg-ds-surface border border-ds-outline-variant focus:border-ds-primary outline-none text-[14px] font-mono text-ds-on-surface placeholder:text-ds-on-variant transition-colors"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          className="p-2 text-ds-on-variant hover:text-ds-on-surface transition-colors"
          aria-label="Notifications"
        >
          <Bell size={20} strokeWidth={1.5} />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="p-2 text-ds-on-variant hover:text-ds-on-surface transition-colors"
          aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {resolvedTheme === "dark" ? (
            <Sun size={20} strokeWidth={1.5} />
          ) : (
            <Moon size={20} strokeWidth={1.5} />
          )}
        </button>

        <div className="h-8 w-px bg-ds-outline-variant mx-2" />

        <Link
          href="/dashboard/settings"
          title={user?.githubLogin ? `@${user.githubLogin} — account settings` : "Account settings"}
          aria-label="Account settings"
          className="shrink-0 hover:opacity-80 transition-opacity"
        >
          <UserAvatar avatarUrl={user?.avatarUrl} name={user?.name ?? user?.email} size={32} />
        </Link>
      </div>
    </header>
  );
}

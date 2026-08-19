"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * Context-aware back link for detail pages.
 *
 * Detail pages are reachable from several places, so a hardcoded "Back to
 * deployments" strands anyone who arrived from Live apps or the overview.
 * Linking pages tag their destination with `?from=…`; this resolves that tag
 * to the right label and href, falling back to deployment history for direct
 * hits (bookmarks, emails) where there is no origin to honour.
 */

export type BackOrigin = "live" | "overview" | "history" | "projects";

const ORIGINS: Record<BackOrigin, { href: string; label: string }> = {
  live: { href: "/dashboard/active", label: "Back to live apps" },
  overview: { href: "/dashboard", label: "Back to overview" },
  history: { href: "/dashboard/deployments", label: "Back to deployments" },
  projects: { href: "/dashboard/repositories", label: "Back to projects" },
};

function isOrigin(value: string | null): value is BackOrigin {
  return value !== null && value in ORIGINS;
}

function BackLinkInner({ fallback, size, className }: { fallback: BackOrigin; size: number; className: string }) {
  const from = useSearchParams().get("from");
  const target = ORIGINS[isOrigin(from) ? from : fallback];

  return (
    <Link href={target.href} className={className}>
      <ArrowLeft size={size} strokeWidth={1.5} />
      {target.label}
    </Link>
  );
}

export function BackLink({
  fallback = "history",
  size = 13,
  className = "flex items-center gap-1.5 text-[13px] font-mono text-ds-on-variant hover:text-ds-on-surface mb-6 transition-colors w-fit",
}: {
  fallback?: BackOrigin;
  size?: number;
  className?: string;
}) {
  // useSearchParams needs a Suspense boundary; keeping it here means callers
  // can drop <BackLink /> anywhere without thinking about it.
  return (
    <Suspense fallback={<span className={className} />}>
      <BackLinkInner fallback={fallback} size={size} className={className} />
    </Suspense>
  );
}

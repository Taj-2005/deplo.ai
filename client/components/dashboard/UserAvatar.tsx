"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * The user's GitHub avatar, with a graceful fallback.
 *
 * Circular — the one place the design system's sharp corners give way, since a
 * round profile picture is the universal convention.
 *
 * The avatar URL comes from the server profile (`/auth/me`), so it is absent
 * for the moment before that resolves — and can 404 if the GitHub account is
 * renamed. Both cases fall back to the initial rather than a broken image.
 */
export function UserAvatar({
  avatarUrl,
  name,
  size = 36,
  className = "",
}: {
  avatarUrl?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const initial = (name ?? "U").trim()[0]?.toUpperCase() ?? "U";

  if (!avatarUrl || failed) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`shrink-0 rounded-full bg-ds-primary-dim border border-ds-outline-variant flex items-center justify-center font-mono text-ds-on-primary-dim ${className}`}
      >
        <span style={{ fontSize: Math.round(size * 0.36) }}>{initial}</span>
      </div>
    );
  }

  return (
    <Image
      src={avatarUrl}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-full border border-ds-outline-variant object-cover ${className}`}
      style={{ width: size, height: size }}
      unoptimized
    />
  );
}

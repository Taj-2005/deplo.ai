import Image from "next/image";

/**
 * Shared full-page/section loading indicator — the deplo.ai mark pulsing
 * inside two expanding cyan/violet rings. Pure CSS (keyframes in
 * globals.css), so this needs no "use client": prefers-reduced-motion is a
 * media query, not JS state. Mirrors the mobile app's BrandLoader, which
 * uses the same two brand colors and the same pulse-then-ring-fade timing.
 *
 * Reserved for full-page/section loading states — inline button-busy
 * spinners (Loader2 + animate-spin) stay as they are; a full logo animation
 * doesn't fit inside a 24px button.
 */
export function BrandLoader({ label, size = 40 }: { label?: string; size?: number }) {
  const ringSize = Math.round(size * 1.17);
  const boxSize = Math.round(ringSize * 1.85);

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="relative flex items-center justify-center" style={{ height: boxSize, width: boxSize }}>
        <span
          aria-hidden
          className="brand-loader-ring-cyan absolute rounded-full border-[1.5px]"
          style={{ height: ringSize, width: ringSize, borderColor: "var(--accent-cyan)" }}
        />
        <span
          aria-hidden
          className="brand-loader-ring-violet absolute rounded-full border-[1.5px]"
          style={{ height: ringSize, width: ringSize, borderColor: "var(--accent-violet)" }}
        />
        <Image
          src="/logo.png"
          alt="deplo.ai"
          width={size}
          height={size}
          priority
          className="brand-loader-mark object-contain dark:hidden"
        />
        <Image
          src="/logo-dark.png"
          alt="deplo.ai"
          width={size}
          height={size}
          priority
          className="brand-loader-mark object-contain hidden dark:block"
        />
      </div>
      {label ? (
        <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-ds-on-variant">{label}</span>
      ) : null}
    </div>
  );
}

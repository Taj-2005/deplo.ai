import type { ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, Info, Lightbulb, ShieldAlert, Sparkles } from "lucide-react";

/**
 * Server-safe building blocks for docs pages. Every content page composes
 * these — no raw <h2>/<p> in pages, so typography stays consistent and
 * headings automatically get anchor ids for the ToC.
 */

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function textOf(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(textOf).join("");
  return "";
}

// ─── Typography ───────────────────────────────────────────────────────────────

export function PageTitle({ children, lead }: { children: ReactNode; lead?: ReactNode }) {
  return (
    <header className="mb-10">
      <h1 className="text-[32px] font-bold tracking-[-0.02em] text-ds-on-surface text-balance">{children}</h1>
      {lead && <p className="mt-3 text-[16px] leading-relaxed text-ds-on-variant max-w-[65ch]">{lead}</p>}
    </header>
  );
}

export function H2({ children, id }: { children: ReactNode; id?: string }) {
  const anchor = id ?? slugify(textOf(children));
  return (
    <h2
      id={anchor}
      className="group mt-12 mb-4 text-[22px] font-semibold tracking-[-0.01em] text-ds-on-surface scroll-mt-24"
    >
      <a href={`#${anchor}`} className="no-underline">
        {children}
        <span className="ml-2 opacity-0 group-hover:opacity-100 text-ds-outline transition-opacity select-none">#</span>
      </a>
    </h2>
  );
}

export function H3({ children, id }: { children: ReactNode; id?: string }) {
  const anchor = id ?? slugify(textOf(children));
  return (
    <h3
      id={anchor}
      className="group mt-8 mb-3 text-[16px] font-semibold text-ds-on-surface scroll-mt-24"
    >
      <a href={`#${anchor}`} className="no-underline">
        {children}
        <span className="ml-2 opacity-0 group-hover:opacity-100 text-ds-outline transition-opacity select-none">#</span>
      </a>
    </h3>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p className="my-4 text-[15px] leading-[1.75] text-ds-on-surface/90 max-w-[70ch]">{children}</p>;
}

export function Lead({ children }: { children: ReactNode }) {
  return <p className="my-4 text-[16px] leading-relaxed text-ds-on-variant max-w-[65ch]">{children}</p>;
}

export function A({ href, children }: { href: string; children: ReactNode }) {
  const external = href.startsWith("http");
  const cls =
    "text-ds-on-surface underline decoration-ds-outline-variant underline-offset-4 hover:decoration-[var(--accent-cyan)] transition-colors";
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {children}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 text-[13px] font-mono bg-ds-surface-low border border-ds-outline-variant text-ds-on-surface whitespace-nowrap">
      {children}
    </code>
  );
}

export function Ul({ children }: { children: ReactNode }) {
  return <ul className="my-4 space-y-2 pl-1 max-w-[70ch]">{children}</ul>;
}

export function Li({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3 text-[15px] leading-[1.7] text-ds-on-surface/90">
      <span className="mt-[11px] h-px w-3 shrink-0 bg-ds-outline" aria-hidden />
      <span>{children}</span>
    </li>
  );
}

// ─── Callouts ─────────────────────────────────────────────────────────────────

const CALLOUT_STYLES = {
  note: { icon: Info, border: "border-l-ds-outline", label: "Note" },
  tip: { icon: Lightbulb, border: "border-l-[#0891b2] dark:border-l-[#22d3ee]", label: "Tip" },
  warning: { icon: AlertTriangle, border: "border-l-amber-500", label: "Warning" },
  danger: { icon: ShieldAlert, border: "border-l-red-500", label: "Caution" },
  ai: { icon: Sparkles, border: "border-l-[#7c3aed] dark:border-l-[#a78bfa]", label: "AI" },
} as const;

export function Callout({
  type = "note",
  title,
  children,
}: {
  type?: keyof typeof CALLOUT_STYLES;
  title?: string;
  children: ReactNode;
}) {
  const style = CALLOUT_STYLES[type];
  const Icon = style.icon;
  return (
    <div className={`my-6 border border-ds-outline-variant border-l-2 ${style.border} bg-ds-surface px-4 py-3.5 max-w-[70ch]`}>
      <div className="flex items-center gap-2 mb-1.5">
        <Icon size={13} strokeWidth={1.5} className="text-ds-on-variant" />
        <span className="text-[11px] font-mono uppercase tracking-wider text-ds-on-variant">{title ?? style.label}</span>
      </div>
      <div className="text-[14px] leading-[1.7] text-ds-on-surface/90 [&>p]:my-1.5 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[12.5px] [&_code]:font-mono [&_code]:bg-ds-surface-low [&_code]:border [&_code]:border-ds-outline-variant">
        {children}
      </div>
    </div>
  );
}

// ─── Steps ────────────────────────────────────────────────────────────────────

export function Steps({ children }: { children: ReactNode }) {
  return <ol className="my-6 [counter-reset:step]">{children}</ol>;
}

export function Step({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li className="relative pl-10 pb-8 border-l border-ds-outline-variant ml-3 last:border-l-transparent last:pb-2 [counter-increment:step]">
      <span
        aria-hidden
        className="absolute -left-3 top-0 flex h-6 w-6 items-center justify-center border border-ds-outline-variant bg-ds-surface text-[11px] font-mono text-ds-on-surface before:content-[counter(step)]"
      />
      <h3 className="text-[15px] font-semibold text-ds-on-surface mb-2 scroll-mt-24" id={slugify(title)}>
        {title}
      </h3>
      <div className="text-[14.5px] leading-[1.7] text-ds-on-surface/90 [&>p]:my-2 max-w-[68ch]">{children}</div>
    </li>
  );
}

// ─── Tables ───────────────────────────────────────────────────────────────────

export function DocTable({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="my-6 overflow-x-auto border border-ds-outline-variant">
      <table className="w-full text-left text-[13.5px] leading-relaxed">
        <thead>
          <tr className="bg-ds-surface-low border-b border-ds-outline-variant">
            {head.map((h) => (
              <th key={h} className="px-4 py-2.5 text-[11px] font-mono uppercase tracking-wider text-ds-on-variant font-medium whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ds-outline-variant/60">{children}</tbody>
      </table>
    </div>
  );
}

export function Tr({ children }: { children: ReactNode }) {
  return <tr className="align-top">{children}</tr>;
}

export function Td({ children, mono }: { children: ReactNode; mono?: boolean }) {
  return (
    <td className={`px-4 py-2.5 text-ds-on-surface/90 ${mono ? "font-mono text-[12.5px] whitespace-nowrap" : ""}`}>
      {children}
    </td>
  );
}

// ─── Status pills ─────────────────────────────────────────────────────────────

export function Pill({ variant, children }: { variant: "live" | "planned" | "beta"; children?: ReactNode }) {
  const styles = {
    live: "text-green-700 dark:text-green-400 border-green-300 dark:border-green-900",
    planned: "text-ds-on-variant border-ds-outline-variant",
    beta: "text-[#7c3aed] dark:text-[#a78bfa] border-[#7c3aed]/30",
  }[variant];
  const label = children ?? { live: "Live", planned: "Planned", beta: "Beta" }[variant];
  return (
    <span className={`inline-block align-middle px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider border ${styles}`}>
      {label}
    </span>
  );
}

// ─── Cards ────────────────────────────────────────────────────────────────────

export function CardGrid({ children }: { children: ReactNode }) {
  return <div className="my-6 grid gap-3 sm:grid-cols-2">{children}</div>;
}

export function DocCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="group border border-ds-outline-variant bg-ds-surface p-4 hover:border-ds-outline transition-colors"
    >
      <div className="text-[14px] font-semibold text-ds-on-surface group-hover:text-ds-on-surface">
        {title}
        <span className="ml-1.5 inline-block text-ds-outline group-hover:translate-x-0.5 transition-transform">→</span>
      </div>
      <p className="mt-1 text-[13px] leading-relaxed text-ds-on-variant">{description}</p>
    </Link>
  );
}

// ─── Flow diagram ─────────────────────────────────────────────────────────────

/** Vertical pipeline diagram: boxes joined by arrows, matching the brand's terminal aesthetic. */
export function FlowDiagram({ steps }: { steps: Array<{ label: string; detail?: string; accent?: boolean }> }) {
  return (
    <div className="my-8 flex flex-col items-stretch max-w-md" role="img" aria-label={steps.map((s) => s.label).join(" → ")}>
      {steps.map((step, i) => (
        <div key={step.label} className="flex flex-col items-center">
          <div
            className={`w-full border px-4 py-3 text-center bg-ds-surface ${
              step.accent ? "border-[var(--accent-cyan)]/50" : "border-ds-outline-variant"
            }`}
          >
            <div className="text-[13.5px] font-mono text-ds-on-surface">{step.label}</div>
            {step.detail && <div className="mt-0.5 text-[12px] text-ds-on-variant">{step.detail}</div>}
          </div>
          {i < steps.length - 1 && (
            <div className="flex flex-col items-center py-1 text-ds-outline" aria-hidden>
              <span className="h-3 w-px bg-ds-outline-variant" />
              <span className="text-[10px] leading-none">▼</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft } from "lucide-react";
import { ALL_DOC_PAGES } from "@/lib/docs/navigation";

interface Result {
  href: string;
  title: string;
  description: string;
  section: string;
  score: number;
}

/** Rank pages: title match > search-term match > description match. */
function search(query: string): Result[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const words = q.split(/\s+/);

  return ALL_DOC_PAGES.map((page) => {
    const title = page.title.toLowerCase();
    const desc = page.description.toLowerCase();
    const terms = (page.searchTerms ?? []).join(" ").toLowerCase();
    let score = 0;
    for (const w of words) {
      if (title === w) score += 30;
      else if (title.startsWith(w)) score += 18;
      else if (title.includes(w)) score += 12;
      if (terms.includes(w)) score += 8;
      if (desc.includes(w)) score += 4;
      if (page.section.toLowerCase().includes(w)) score += 2;
    }
    // Every word must land somewhere.
    const haystack = `${title} ${desc} ${terms} ${page.section.toLowerCase()}`;
    if (!words.every((w) => haystack.includes(w))) score = 0;
    return { href: page.href, title: page.title, description: page.description, section: page.section, score };
  })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

export function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const results = useMemo(() => search(query), [query]);

  useEffect(() => {
    if (!open) return undefined;
    // Focus after the dialog paints.
    const t = setTimeout(() => inputRef.current?.focus(), 10);
    return () => clearTimeout(t);
  }, [open]);

  // Reset on the way out (not in an effect) so each open starts clean.
  const close = useCallback(() => {
    setQuery("");
    setSelected(0);
    onClose();
  }, [onClose]);

  const go = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter" && results[selected]) {
      e.preventDefault();
      go(results[selected].href);
    } else if (e.key === "Escape") {
      close();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-[2px] pt-[15vh] px-4"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Search documentation"
    >
      <div
        className="w-full max-w-lg border border-ds-outline-variant bg-ds-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-ds-outline-variant px-4">
          <Search size={14} strokeWidth={1.5} className="text-ds-on-variant shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search docs — commands, endpoints, guides…"
            className="w-full bg-transparent py-3.5 text-[14px] text-ds-on-surface placeholder:text-ds-outline focus:outline-none"
          />
          <kbd className="shrink-0 border border-ds-outline-variant px-1.5 py-0.5 text-[10px] font-mono text-ds-on-variant">
            esc
          </kbd>
        </div>

        {query.trim() && (
          <ul className="max-h-[50vh] overflow-y-auto py-1.5">
            {results.length === 0 && (
              <li className="px-4 py-6 text-center text-[13px] font-mono text-ds-on-variant">
                No results for &ldquo;{query}&rdquo;
              </li>
            )}
            {results.map((r, i) => (
              <li key={r.href}>
                <button
                  onClick={() => go(r.href)}
                  onMouseEnter={() => setSelected(i)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === selected ? "bg-ds-surface-low" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[13.5px] font-medium text-ds-on-surface">{r.title}</span>
                      <span className="text-[10.5px] font-mono uppercase tracking-wider text-ds-on-variant">
                        {r.section}
                      </span>
                    </div>
                    <div className="truncate text-[12px] text-ds-on-variant">{r.description}</div>
                  </div>
                  {i === selected && <CornerDownLeft size={12} strokeWidth={1.5} className="shrink-0 text-ds-on-variant" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

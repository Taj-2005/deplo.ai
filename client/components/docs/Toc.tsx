"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface Heading {
  id: string;
  text: string;
  level: number;
}

/**
 * "On this page" rail. Harvests h2/h3 elements from the rendered article
 * (no per-page config needed) and highlights the active section via
 * IntersectionObserver.
 */
export function Toc() {
  const pathname = usePathname();
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    let observer: IntersectionObserver | null = null;

    // Defer one frame so the new page's article is in the DOM.
    const frame = requestAnimationFrame(() => {
      const nodes = Array.from(document.querySelectorAll("article h2[id], article h3[id]"));
      setHeadings(
        nodes.map((n) => ({
          id: n.id,
          text: (n.textContent ?? "").replace(/#$/, "").trim(),
          level: n.tagName === "H2" ? 2 : 3,
        })),
      );

      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setActive(entry.target.id);
              break;
            }
          }
        },
        { rootMargin: "-80px 0px -70% 0px", threshold: 0 },
      );
      nodes.forEach((n) => observer?.observe(n));
    });

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [pathname]);

  if (headings.length < 2) return null;

  return (
    <nav aria-label="On this page" className="text-[12.5px] leading-relaxed">
      <div className="mb-3 text-[11px] font-mono uppercase tracking-wider text-ds-on-variant">On this page</div>
      <ul className="space-y-0.5 border-l border-ds-outline-variant">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className={`block border-l -ml-px py-1 pr-2 transition-colors hover:text-ds-on-surface ${
                h.level === 3 ? "pl-6" : "pl-3"
              } ${active === h.id ? "doc-toc-active border-l-[var(--accent-cyan)]" : "border-l-transparent text-ds-on-variant"}`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

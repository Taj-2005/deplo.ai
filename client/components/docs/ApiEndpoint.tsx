import type { ReactNode } from "react";
import { slugify } from "./primitives";

const METHOD_STYLES: Record<string, string> = {
  GET: "text-green-700 dark:text-green-400 border-green-300 dark:border-green-900",
  POST: "text-[#0891b2] dark:text-[#22d3ee] border-[#0891b2]/40",
  PUT: "text-amber-600 dark:text-amber-400 border-amber-400/40",
  PATCH: "text-amber-600 dark:text-amber-400 border-amber-400/40",
  DELETE: "text-red-600 dark:text-red-400 border-red-300 dark:border-red-900",
};

/**
 * API reference entry: method badge + path + auth requirement, followed by
 * request/response examples (CodeBlocks) and parameter tables as children.
 */
export function ApiEndpoint({
  method,
  path,
  auth = "bearer",
  description,
  children,
}: {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  auth?: "bearer" | "public" | "signature";
  description: string;
  children?: ReactNode;
}) {
  const authLabel = { bearer: "Bearer token", public: "Public", signature: "Signed" }[auth];
  const anchor = slugify(`${method} ${path}`);
  return (
    <section id={anchor} className="my-10 border border-ds-outline-variant bg-ds-surface scroll-mt-24">
      <div className="flex flex-wrap items-center gap-3 border-b border-ds-outline-variant bg-ds-surface-low px-4 py-3">
        <span className={`px-1.5 py-0.5 text-[11px] font-mono font-semibold border ${METHOD_STYLES[method]}`}>
          {method}
        </span>
        <a href={`#${anchor}`} className="font-mono text-[13.5px] text-ds-on-surface break-all">
          {path}
        </a>
        <span className="ml-auto text-[10px] font-mono uppercase tracking-wider text-ds-on-variant border border-ds-outline-variant px-1.5 py-0.5">
          {authLabel}
        </span>
      </div>
      <div className="px-4 py-4">
        <p className="text-[14px] leading-[1.7] text-ds-on-surface/90 max-w-[68ch]">{description}</p>
        <div className="[&>*]:max-w-full">{children}</div>
      </div>
    </section>
  );
}

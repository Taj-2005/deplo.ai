"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { highlight } from "@/lib/docs/highlight";

/**
 * Docs code block — terminal-styled (dark surface in both themes, matching
 * the brand's landing-page terminal), with language/filename label and a
 * copy button.
 */
export function CodeBlock({
  code,
  language = "bash",
  title,
}: {
  code: string;
  language?: string;
  title?: string;
}) {
  const [copied, setCopied] = useState(false);
  const trimmed = code.replace(/^\n+|\s+$/g, "");

  const onCopy = async () => {
    try {
      // Strip leading "$ " prompts so pasted commands run as-is.
      await navigator.clipboard.writeText(trimmed.replace(/^\$ /gm, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — text remains selectable
    }
  };

  return (
    <div className="doc-codeblock my-5 max-w-[76ch] border border-ds-outline-variant dark:border-[#262626] bg-[var(--doc-code-bg)] text-[#e6e6e6]">
      <div className="flex items-center justify-between border-b border-[#262626] px-3.5 py-2">
        <span className="text-[11px] font-mono text-[#9ba1a6]">{title ?? language}</span>
        <button
          onClick={onCopy}
          aria-label="Copy code"
          className="flex items-center gap-1.5 text-[11px] font-mono text-[#9ba1a6] hover:text-[#e6e6e6] transition-colors"
        >
          {copied ? <Check size={12} strokeWidth={1.5} className="text-[#34d399]" /> : <Copy size={12} strokeWidth={1.5} />}
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3.5 text-[13px] leading-[1.7] font-mono">
        <code>{highlight(trimmed, language)}</code>
      </pre>
    </div>
  );
}

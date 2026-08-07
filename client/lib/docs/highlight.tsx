import type { ReactNode } from "react";

/**
 * Tiny dependency-free syntax highlighter for docs code blocks.
 * Token colors come from the `doc-tok-*` classes in globals.css so both
 * themes stay on the design system. Deliberately approximate — docs snippets
 * are short; correctness of rendering beats grammar completeness.
 */

type TokenClass = "cmt" | "str" | "kw" | "num" | "fn" | "prompt" | "flag" | "url" | "plain";

interface Rule {
  pattern: RegExp;
  cls: TokenClass;
}

const RULES: Record<string, Rule[]> = {
  bash: [
    { pattern: /^#.*$/m, cls: "cmt" },
    { pattern: /^\$(?=\s)/m, cls: "prompt" },
    { pattern: /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/, cls: "str" },
    { pattern: /https?:\/\/[^\s"')]+/, cls: "url" },
    { pattern: /(?<=\s)--?[a-zA-Z][\w-]*/, cls: "flag" },
    { pattern: /\b(npm|npx|git|node|deplo|curl|brew|export|cd|unset|echo|docker)\b/, cls: "kw" },
  ],
  json: [
    { pattern: /"(?:[^"\\]|\\.)*"(?=\s*:)/, cls: "fn" },
    { pattern: /"(?:[^"\\]|\\.)*"/, cls: "str" },
    { pattern: /\b(true|false|null)\b/, cls: "kw" },
    { pattern: /-?\b\d+(?:\.\d+)?\b/, cls: "num" },
  ],
  ts: [
    { pattern: /\/\/.*$/m, cls: "cmt" },
    { pattern: /\/\*[\s\S]*?\*\//, cls: "cmt" },
    { pattern: /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/, cls: "str" },
    { pattern: /\b(const|let|var|function|return|if|else|for|while|import|from|export|default|async|await|new|type|interface|extends|implements|class|throw|try|catch|typeof|keyof|in|of|null|undefined|true|false)\b/, cls: "kw" },
    { pattern: /-?\b\d+(?:\.\d+)?\b/, cls: "num" },
    { pattern: /\b[a-zA-Z_$][\w$]*(?=\()/, cls: "fn" },
  ],
  yaml: [
    { pattern: /#.*$/m, cls: "cmt" },
    { pattern: /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/, cls: "str" },
    { pattern: /^\s*-?\s*[\w.[\]/-]+(?=\s*:)/m, cls: "fn" },
    { pattern: /\$\{\{[^}]*\}\}/, cls: "kw" },
    { pattern: /-?\b\d+(?:\.\d+)?\b/, cls: "num" },
  ],
  http: [
    { pattern: /^(GET|POST|PUT|PATCH|DELETE)\b/m, cls: "kw" },
    { pattern: /https?:\/\/[^\s"')]+|\/[\w/:.{}-]+/, cls: "url" },
    { pattern: /^[\w-]+(?=:)/m, cls: "fn" },
  ],
  env: [
    { pattern: /#.*$/m, cls: "cmt" },
    { pattern: /^[A-Z][A-Z0-9_]*(?==)/m, cls: "fn" },
    { pattern: /"(?:[^"\\]|\\.)*"/, cls: "str" },
  ],
};

const ALIASES: Record<string, string> = {
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  js: "ts",
  jsx: "ts",
  tsx: "ts",
  typescript: "ts",
  javascript: "ts",
  yml: "yaml",
  dotenv: "env",
};

export function highlight(code: string, language: string): ReactNode[] {
  const rules = RULES[ALIASES[language] ?? language];
  if (!rules) return [code];

  // Build one combined regex; earlier rules win on ties by group order.
  const combined = new RegExp(rules.map((r) => `(${r.pattern.source})`).join("|"), "gm");
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;

  for (const match of code.matchAll(combined)) {
    const index = match.index ?? 0;
    if (index > last) out.push(code.slice(last, index));
    const groupIndex = match.slice(1).findIndex((g) => g !== undefined);
    const cls = rules[groupIndex]?.cls ?? "plain";
    out.push(
      <span key={key++} className={`doc-tok-${cls}`}>
        {match[0]}
      </span>,
    );
    last = index + match[0].length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

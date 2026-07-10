import type { Evidence, FrameworkCandidate } from "../../domain/analysis/types";
import type { RepoSnapshot } from "./ports";
import {
  CONTENT_SCAN_FILES,
  FRAMEWORK_PRIORITY,
  FRAMEWORK_SIGNATURES,
  type FrameworkSignature,
} from "./frameworkSignatures";

interface PkgJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  engines?: { node?: string };
  packageManager?: string;
}

/** Everything a signature needs to be scored, gathered once per component. */
export interface ComponentContext {
  path: string;
  deps: Set<string>;
  scripts: Record<string, string>;
  /** Signature-referenced files present in the component. */
  files: Set<string>;
  /** Contents of scanned files (manifests, entrypoints). */
  contents: Map<string, string>;
  pkg: PkgJson | null;
}

/** Sum of the two largest weights — the score at which a match is "confident". */
function saturationScore(weights: number[]): number {
  const sorted = [...weights].sort((a, b) => b - a);
  return (sorted[0] ?? 0) + (sorted[1] ?? 0);
}

function scoreSignature(sig: FrameworkSignature, ctx: ComponentContext): FrameworkCandidate {
  const evidence: Evidence[] = [];
  const weights: number[] = [];
  let score = 0;

  for (const d of sig.dependencies ?? []) {
    weights.push(d.weight);
    if (ctx.deps.has(d.name)) {
      score += d.weight;
      evidence.push({ signal: `dependency:${d.name}`, weight: d.weight, detail: `declares dependency "${d.name}"` });
    }
  }
  for (const f of sig.files ?? []) {
    weights.push(f.weight);
    if (ctx.files.has(f.path)) {
      score += f.weight;
      evidence.push({ signal: `file:${f.path}`, weight: f.weight, detail: `found ${f.path}` });
    }
  }
  for (const s of sig.scripts ?? []) {
    weights.push(s.weight);
    if (ctx.scripts[s.name]) {
      score += s.weight;
      evidence.push({ signal: `script:${s.name}`, weight: s.weight, detail: `has "${s.name}" script` });
    }
  }
  for (const c of sig.content ?? []) {
    weights.push(c.weight);
    const content = ctx.contents.get(c.file);
    if (content && c.pattern.test(content)) {
      score += c.weight;
      evidence.push({ signal: `content:${c.file}`, weight: c.weight, detail: `${c.file} matches /${c.pattern.source}/` });
    }
  }

  const saturation = saturationScore(weights);
  const confidence = saturation > 0 ? Math.min(1, score / saturation) : 0;
  return { framework: sig.framework, kind: sig.kind, language: sig.language, score, confidence, evidence };
}

/**
 * Layer 1 — deterministic, evidence-scored framework detection for one
 * component directory. Returns every framework that has any supporting
 * evidence, best-first (confidence, then priority).
 */
export class FrameworkDetector {
  constructor(private readonly snapshot: RepoSnapshot) {}

  async detect(componentPath: string): Promise<FrameworkCandidate[]> {
    const ctx = await this.buildContext(componentPath);
    const candidates = FRAMEWORK_SIGNATURES.map((sig) => scoreSignature(sig, ctx)).filter((c) => c.score > 0);

    candidates.sort(
      (a, b) => b.confidence - a.confidence || FRAMEWORK_PRIORITY[b.framework] - FRAMEWORK_PRIORITY[a.framework],
    );
    return candidates;
  }

  /** Reads package.json + relevant files once so scoring is pure/synchronous. */
  async buildContext(componentPath: string): Promise<ComponentContext> {
    const join = (rel: string): string => (componentPath ? `${componentPath}/${rel}` : rel);

    const pkg = await this.snapshot.readJson<PkgJson>(join("package.json"));
    const deps = new Set<string>([
      ...Object.keys(pkg?.dependencies ?? {}),
      ...Object.keys(pkg?.devDependencies ?? {}),
    ]);

    const fileIndicators = new Set<string>();
    const contentFiles = new Set<string>(CONTENT_SCAN_FILES);
    contentFiles.add("package.json");
    for (const sig of FRAMEWORK_SIGNATURES) {
      for (const f of sig.files ?? []) fileIndicators.add(f.path);
      for (const c of sig.content ?? []) contentFiles.add(c.file);
    }

    const present = new Set<string>();
    await Promise.all(
      [...fileIndicators].map(async (rel) => {
        if (await this.snapshot.hasFile(join(rel))) present.add(rel);
      }),
    );

    const contents = new Map<string, string>();
    await Promise.all(
      [...contentFiles].map(async (rel) => {
        const c = await this.snapshot.readFile(join(rel));
        if (c !== null) contents.set(rel, c);
      }),
    );

    return { path: componentPath, deps, scripts: pkg?.scripts ?? {}, files: present, contents, pkg };
  }
}

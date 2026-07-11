import type {
  ComponentAnalysis,
  FrameworkCandidate,
  Language,
  ProjectComponent,
  RepositoryAnalysis,
} from "../../domain/analysis/types";
import { BuildCommandResolver } from "./BuildCommandResolver";
import { ConfidenceEvaluator, UNKNOWN_CANDIDATE } from "./ConfidenceEvaluator";
import { DeploymentStrategyResolver } from "./DeploymentStrategyResolver";
import { FrameworkDetector } from "./FrameworkDetector";
import { LanguageDetector } from "./LanguageDetector";
import type { RepoSnapshot } from "./ports";
import { RuntimeResolver } from "./RuntimeResolver";
import { StructureAnalyzer } from "./StructureAnalyzer";

/**
 * RepositoryAnalyzer — the deterministic (Layer 1 + Layer 2) analysis pipeline.
 *
 *   structure → per-component: framework + language + confidence
 *             → runtime → build plan → deployment strategy
 *             → aggregate confidence + AI-escalation decision
 *
 * AI reasoning (Layer 3, Groq) is a separate service that consumes this result
 * when `needsAiFallback` is true; it is intentionally not wired in here.
 */
export class RepositoryAnalyzer {
  private readonly structure: StructureAnalyzer;
  private readonly frameworks: FrameworkDetector;
  private readonly languages: LanguageDetector;
  private readonly runtimes: RuntimeResolver;
  private readonly builds: BuildCommandResolver;
  private readonly strategies: DeploymentStrategyResolver;
  private readonly confidence: ConfidenceEvaluator;

  constructor(private readonly snapshot: RepoSnapshot) {
    this.structure = new StructureAnalyzer(snapshot);
    this.frameworks = new FrameworkDetector(snapshot);
    this.languages = new LanguageDetector(snapshot);
    this.runtimes = new RuntimeResolver(snapshot);
    this.builds = new BuildCommandResolver(snapshot);
    this.strategies = new DeploymentStrategyResolver();
    this.confidence = new ConfidenceEvaluator();
  }

  async analyze(): Promise<RepositoryAnalysis> {
    const structure = await this.structure.analyze();

    const perComponent = await Promise.all(
      structure.components.map((component) => this.analyzeComponent(component)),
    );
    const components = perComponent.flat();

    const primaries = components.map((c) => c.framework);
    const overallConfidence = this.confidence.overall(primaries);
    const needsAiFallback = components.length === 0 || this.confidence.needsFallback(primaries);

    const primaryLanguage = mostCommonLanguage(components);
    const evidence = components.flatMap((c) =>
      c.framework.evidence.map((e) => ({ ...e, signal: c.path ? `${c.path}:${e.signal}` : e.signal })),
    );

    return { structure, components, primaryLanguage, overallConfidence, needsAiFallback, evidence };
  }

  /** A single structural component may yield a frontend and/or a backend unit. */
  private async analyzeComponent(component: ProjectComponent): Promise<ComponentAnalysis[]> {
    const { path } = component;
    const [candidates, pathLanguage] = await Promise.all([
      this.frameworks.detect(path),
      this.languages.detect(path),
    ]);

    const frontend = this.confidence.selectPrimary(candidates, "frontend");
    const backend = this.confidence.selectPrimary(candidates, "backend");
    const staticSite = this.confidence.selectPrimary(candidates, "static");

    const out: ComponentAnalysis[] = [];

    if (frontend) out.push(await this.buildComponent(path, "frontend", frontend, candidates, pathLanguage));
    if (backend) out.push(await this.buildComponent(path, "backend", backend, candidates, pathLanguage));

    if (out.length === 0 && staticSite) {
      out.push(await this.buildComponent(path, "frontend", staticSite, candidates, "html"));
    }

    // Nothing detected — still report the component so failures are visible.
    if (out.length === 0) {
      const role: "frontend" | "backend" = component.role === "backend" ? "backend" : "frontend";
      out.push(await this.buildComponent(path, role, UNKNOWN_CANDIDATE, candidates, pathLanguage));
    }

    return out;
  }

  private async buildComponent(
    path: string,
    role: "frontend" | "backend",
    primary: FrameworkCandidate,
    candidates: FrameworkCandidate[],
    pathLanguage: Language,
  ): Promise<ComponentAnalysis> {
    // Hard runtimes (python/go/java) come from the framework; JS/TS/HTML from the tree.
    const language = isHardLanguage(primary.language) ? primary.language : pathLanguage;
    const runtime = await this.runtimes.resolve(path, language);
    const build = await this.builds.resolve(path, primary.framework, language, runtime);
    const strategy = this.strategies.resolve(primary, build, runtime);

    return { path, role, framework: { ...primary, language }, candidates, strategy };
  }
}

function isHardLanguage(lang: Language): boolean {
  return lang === "python" || lang === "go" || lang === "java";
}

function mostCommonLanguage(components: ComponentAnalysis[]): Language {
  const counts = new Map<Language, number>();
  for (const c of components) counts.set(c.framework.language, (counts.get(c.framework.language) ?? 0) + 1);
  let best: Language = "unknown";
  let max = 0;
  for (const [lang, n] of counts) {
    if (lang !== "unknown" && n > max) {
      best = lang;
      max = n;
    }
  }
  return best;
}

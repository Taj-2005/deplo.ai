import type { Language } from "../../domain/analysis/types";
import type { RepoSnapshot } from "./ports";

/**
 * Detects the dominant language of a component from manifests and file
 * extensions. Manifest presence (go.mod, requirements.txt, pom.xml) is a
 * strong signal; TS-vs-JS is decided by tsconfig + file counts.
 */
export class LanguageDetector {
  constructor(private readonly snapshot: RepoSnapshot) {}

  async detect(componentPath: string): Promise<Language> {
    const join = (rel: string): string => (componentPath ? `${componentPath}/${rel}` : rel);
    const inComponent = (p: string): boolean => (componentPath ? p.startsWith(`${componentPath}/`) : true);

    // Strong manifest signals first.
    if (await this.snapshot.hasFile(join("go.mod"))) return "go";
    if (
      (await this.snapshot.hasFile(join("pom.xml"))) ||
      (await this.snapshot.hasFile(join("build.gradle"))) ||
      (await this.snapshot.hasFile(join("build.gradle.kts")))
    ) {
      return "java";
    }
    if (
      (await this.snapshot.hasFile(join("requirements.txt"))) ||
      (await this.snapshot.hasFile(join("pyproject.toml"))) ||
      (await this.snapshot.hasFile(join("Pipfile"))) ||
      (await this.snapshot.hasFile(join("manage.py")))
    ) {
      return "python";
    }

    const hasPkg = await this.snapshot.hasFile(join("package.json"));
    const hasTsconfig =
      (await this.snapshot.hasFile(join("tsconfig.json"))) || (await this.snapshot.hasFile(join("tsconfig.base.json")));

    if (hasPkg || hasTsconfig) {
      const [ts, js] = await Promise.all([
        this.snapshot.countFiles((p) => inComponent(p) && /\.(ts|tsx)$/.test(p) && !p.endsWith(".d.ts")),
        this.snapshot.countFiles((p) => inComponent(p) && /\.(js|jsx|mjs|cjs)$/.test(p)),
      ]);
      if (hasTsconfig || ts >= js) return "typescript";
      return "javascript";
    }

    // Extension-based fallback.
    const [py, go, ts, js, html] = await Promise.all([
      this.snapshot.countFiles((p) => inComponent(p) && p.endsWith(".py")),
      this.snapshot.countFiles((p) => inComponent(p) && p.endsWith(".go")),
      this.snapshot.countFiles((p) => inComponent(p) && /\.(ts|tsx)$/.test(p)),
      this.snapshot.countFiles((p) => inComponent(p) && /\.(js|jsx|mjs|cjs)$/.test(p)),
      this.snapshot.countFiles((p) => inComponent(p) && p.endsWith(".html")),
    ]);

    const ranked: Array<[Language, number]> = [
      ["python", py],
      ["go", go],
      ["typescript", ts],
      ["javascript", js],
      ["html", html],
    ];
    ranked.sort((a, b) => b[1] - a[1]);
    return ranked[0] && ranked[0][1] > 0 ? ranked[0][0] : "unknown";
  }
}

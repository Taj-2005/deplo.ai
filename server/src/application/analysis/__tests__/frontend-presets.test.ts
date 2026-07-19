import { RepositoryAnalyzer } from "../RepositoryAnalyzer";
import { RepoSnapshot, type ISourceProvider, type RepoBlob } from "../ports";
import { toDetectedStack } from "../legacyMapper";
import { defaultFrontendApiKeys } from "../EnvVarScanner";
import type { RepositoryAnalysis } from "../../../domain/analysis/types";

class FakeSource implements ISourceProvider {
  constructor(private readonly files: Record<string, string>) {}
  async getTree(): Promise<RepoBlob[]> {
    return Object.entries(this.files).map(([path, content]) => ({ path, size: content.length }));
  }
  async readFile(path: string): Promise<string | null> {
    return this.files[path] ?? null;
  }
}

function analyze(files: Record<string, string>): Promise<RepositoryAnalysis> {
  return new RepositoryAnalyzer(new RepoSnapshot(new FakeSource(files))).analyze();
}

const pkg = (obj: unknown): string => JSON.stringify(obj);

describe("Frontend presets (Phase 3, slice 2)", () => {
  const cases: Array<{
    name: string;
    files: Record<string, string>;
    framework: string;
    preset: string | null;
    legacy: string;
  }> = [
    {
      name: "Nuxt",
      files: {
        "package.json": pkg({ dependencies: { nuxt: "3" }, scripts: { build: "nuxt build" } }),
        "nuxt.config.ts": "export default defineNuxtConfig({})",
      },
      framework: "nuxt",
      preset: "nuxtjs",
      legacy: "NUXT",
    },
    {
      name: "SvelteKit (modern preset slug)",
      files: {
        "package.json": pkg({ devDependencies: { "@sveltejs/kit": "2", svelte: "4" }, scripts: { build: "vite build" } }),
        "svelte.config.js": "export default {}",
      },
      framework: "sveltekit",
      preset: "sveltekit-1",
      legacy: "SVELTEKIT",
    },
    {
      name: "Astro",
      files: {
        "package.json": pkg({ dependencies: { astro: "4" }, scripts: { build: "astro build" } }),
        "astro.config.mjs": "export default {}",
      },
      framework: "astro",
      preset: "astro",
      legacy: "ASTRO",
    },
    {
      name: "Angular",
      files: {
        "package.json": pkg({ dependencies: { "@angular/core": "17" }, scripts: { build: "ng build" } }),
        "angular.json": "{}",
      },
      framework: "angular",
      preset: "angular",
      legacy: "ANGULAR",
    },
    {
      name: "Gatsby",
      files: {
        "package.json": pkg({ dependencies: { gatsby: "5", react: "18" }, scripts: { build: "gatsby build" } }),
        "gatsby-config.js": "module.exports = {}",
      },
      framework: "gatsby",
      preset: "gatsby",
      legacy: "GATSBY",
    },
  ];

  for (const c of cases) {
    it(`${c.name}: deployable via Vercel preset "${c.preset}"`, async () => {
      const result = await analyze(c.files);
      const fe = result.components.find((comp) => comp.role === "frontend")!;
      expect(fe.framework.framework).toBe(c.framework);
      expect(fe.strategy.provider).toBe("vercel");
      expect(fe.strategy.preset).toBe(c.preset);
      expect(fe.strategy.deployable).toBe(true);
      expect(toDetectedStack(result).frontend).toBe(c.legacy);
    });
  }

  it("static HTML site is deployable with no preset", async () => {
    const result = await analyze({
      "index.html": "<!doctype html><h1>hi</h1>",
      "styles.css": "body{}",
    });
    const fe = result.components.find((c) => c.role === "frontend")!;
    expect(fe.framework.framework).toBe("static-html");
    expect(fe.strategy.deployable).toBe(true);
    expect(fe.strategy.preset).toBeNull();
    expect(toDetectedStack(result).frontend).toBe("STATIC");
  });

  it("framework-default API keys cover the new frontends", () => {
    expect(defaultFrontendApiKeys("NUXT")).toEqual(["NUXT_PUBLIC_API_URL"]);
    expect(defaultFrontendApiKeys("SVELTEKIT")).toEqual(["PUBLIC_API_URL"]);
    expect(defaultFrontendApiKeys("GATSBY")).toEqual(["GATSBY_API_URL"]);
    expect(defaultFrontendApiKeys("VUE")).toEqual(["VITE_API_URL"]);
    expect(defaultFrontendApiKeys("REMIX")).toEqual(["API_URL"]);
  });
});

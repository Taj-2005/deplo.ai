import type { ISourceProvider, RepoBlob } from "../ports";
import { RepoSnapshot } from "../ports";
import { RepositoryAnalyzer } from "../RepositoryAnalyzer";
import { FrameworkDetector } from "../FrameworkDetector";
import { StructureAnalyzer } from "../StructureAnalyzer";
import { toDetectedStack } from "../legacyMapper";
import type { RepositoryAnalysis } from "../../../domain/analysis/types";

/** In-memory source provider from a { path: content } map. */
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

describe("FrameworkDetector", () => {
  it("prefers Next.js over React (meta-framework wins)", async () => {
    const snap = new RepoSnapshot(
      new FakeSource({
        "package.json": pkg({ dependencies: { next: "14", react: "18", "react-dom": "18" }, scripts: { build: "next build" } }),
        "next.config.js": "module.exports = {}",
        "app/page.tsx": "export default function Page() {}",
      }),
    );
    const candidates = await new FrameworkDetector(snap).detect("");
    expect(candidates[0]!.framework).toBe("nextjs");
    expect(candidates.map((c) => c.framework)).toContain("react");
    expect(candidates[0]!.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("detects FastAPI from requirements.txt + entrypoint (no package.json)", async () => {
    const snap = new RepoSnapshot(
      new FakeSource({
        "requirements.txt": "fastapi==0.110\nuvicorn[standard]==0.29",
        "main.py": "from fastapi import FastAPI\napp = FastAPI()",
      }),
    );
    const candidates = await new FrameworkDetector(snap).detect("");
    expect(candidates[0]!.framework).toBe("fastapi");
    expect(candidates[0]!.language).toBe("python");
  });
});

describe("StructureAnalyzer", () => {
  it("treats a Next.js app/ router as a single app, not a monorepo", async () => {
    const structure = await new StructureAnalyzer(
      new RepoSnapshot(
        new FakeSource({
          "package.json": pkg({ dependencies: { next: "14" } }),
          "app/page.tsx": "x",
          "app/layout.tsx": "x",
        }),
      ),
    ).analyze();
    expect(structure.kind).toBe("single");
    expect(structure.components).toHaveLength(1);
    expect(structure.components[0]!.path).toBe("");
  });

  it("detects a pnpm workspace monorepo and resolves package globs", async () => {
    const structure = await new StructureAnalyzer(
      new RepoSnapshot(
        new FakeSource({
          "package.json": pkg({ private: true }),
          "pnpm-workspace.yaml": "packages:\n  - 'apps/*'\n  - 'packages/*'\n",
          "apps/web/package.json": pkg({ dependencies: { next: "14" } }),
          "apps/api/package.json": pkg({ dependencies: { express: "4" } }),
          "packages/ui/package.json": pkg({ name: "ui" }),
        }),
      ),
    ).analyze();
    expect(structure.kind).toBe("monorepo");
    expect(structure.workspace.tool).toBe("pnpm");
    expect(structure.components.map((c) => c.path).sort()).toEqual(["apps/api", "apps/web", "packages/ui"]);
  });

  it("detects a classic frontend/backend split", async () => {
    const structure = await new StructureAnalyzer(
      new RepoSnapshot(
        new FakeSource({
          "client/package.json": pkg({ dependencies: { react: "18" }, devDependencies: { vite: "5" } }),
          "server/package.json": pkg({ dependencies: { express: "4" } }),
        }),
      ),
    ).analyze();
    expect(structure.kind).toBe("frontend-backend");
    expect(structure.components.find((c) => c.role === "frontend")!.path).toBe("client");
    expect(structure.components.find((c) => c.role === "backend")!.path).toBe("server");
  });
});

describe("RepositoryAnalyzer (end-to-end)", () => {
  it("maps a Vite+React SPA to the legacy REACT_VITE stack", async () => {
    const result = await analyze({
      "package.json": pkg({ dependencies: { react: "18", "react-dom": "18" }, devDependencies: { vite: "5" }, scripts: { build: "vite build" } }),
      "vite.config.ts": "export default {}",
      "index.html": "<!doctype html>",
      "src/main.tsx": "console.log(import.meta.env.VITE_API)",
    });
    const stack = toDetectedStack(result);
    expect(stack.frontend).toBe("REACT_VITE");
    expect(stack.outputDir).toBe("dist");
    expect(result.components[0]!.framework.framework).toBe("vite");
  });

  it("analyzes a pnpm monorepo into frontend + backend components", async () => {
    const result = await analyze({
      "package.json": pkg({ private: true }),
      "pnpm-workspace.yaml": "packages:\n  - 'apps/*'\n",
      "apps/web/package.json": pkg({ dependencies: { next: "14" }, scripts: { build: "next build" } }),
      "apps/web/next.config.ts": "export default {}",
      "apps/api/package.json": pkg({ dependencies: { express: "4" }, scripts: { start: "node ." } }),
    });
    const web = result.components.find((c) => c.path === "apps/web")!;
    const api = result.components.find((c) => c.path === "apps/api")!;
    expect(web.role).toBe("frontend");
    expect(web.framework.framework).toBe("nextjs");
    expect(api.role).toBe("backend");
    expect(api.framework.framework).toBe("express");
    expect(result.structure.kind).toBe("monorepo");
  });

  it("detects a Go backend with the right build/start plan (deployable)", async () => {
    const result = await analyze({
      "go.mod": "module example.com/app\n\ngo 1.22\n\nrequire github.com/gin-gonic/gin v1.9.1\n",
      "main.go": "package main\nfunc main() {}",
    });
    const c = result.components[0]!;
    expect(c.framework.framework).toBe("go");
    expect(c.framework.language).toBe("go");
    expect(c.strategy.provider).toBe("render");
    expect(c.strategy.deployable).toBe(true);
    expect(c.strategy.buildCommand).toBe("go build -o app .");
    expect(c.strategy.startCommand).toBe("./app");
  });

  it("flags AI fallback when nothing is confidently detected", async () => {
    const result = await analyze({ "README.md": "# just docs", "LICENSE": "MIT" });
    expect(result.needsAiFallback).toBe(true);
    expect(result.overallConfidence).toBeLessThan(0.5);
  });
});

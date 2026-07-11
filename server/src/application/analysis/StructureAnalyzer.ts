import type {
  ComponentRole,
  ProjectComponent,
  ProjectStructure,
  WorkspaceInfo,
  WorkspaceTool,
} from "../../domain/analysis/types";
import type { RepoSnapshot } from "./ports";

/** Project manifest filenames — a directory containing one is a component root. */
const MANIFEST_FILES = [
  "package.json",
  "requirements.txt",
  "pyproject.toml",
  "Pipfile",
  "go.mod",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "manage.py",
];

// Deliberately NOT including "app" (that misfired on Next.js app/ routers).
const FRONTEND_HINTS = ["frontend", "client", "web", "www", "ui", "site"];
const BACKEND_HINTS = ["backend", "server", "api", "service", "backend-api"];

function roleFromName(name: string): ComponentRole {
  const lower = name.toLowerCase();
  if (BACKEND_HINTS.some((h) => lower === h || lower.includes(h))) return "backend";
  if (FRONTEND_HINTS.some((h) => lower === h || lower.includes(h))) return "frontend";
  return "app";
}

function dirOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i);
}

function baseName(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? path : path.slice(i + 1);
}

/**
 * Layer 2 — folder-structure analysis. Uses the full tree (not name guessing)
 * to classify the repo as a single app, a frontend/backend split, or a
 * workspace-managed monorepo, and to enumerate the component directories.
 */
export class StructureAnalyzer {
  constructor(private readonly snapshot: RepoSnapshot) {}

  async analyze(): Promise<ProjectStructure> {
    const paths = await this.snapshot.paths();

    // Directories that contain a project manifest ("" = repo root).
    const manifestDirs = new Set<string>();
    for (const p of paths) {
      if (MANIFEST_FILES.includes(baseName(p))) manifestDirs.add(dirOf(p));
    }

    const workspace = await this.detectWorkspace(manifestDirs);

    // 1. Workspace-managed monorepo.
    if (workspace.packages.length > 0) {
      return {
        kind: "monorepo",
        workspace,
        components: workspace.packages.map((path) => ({ path, role: roleFromName(baseName(path)) })),
      };
    }

    const subDirs = [...manifestDirs].filter((d) => d !== "" && !d.includes("/"));

    // 2. Classic frontend/backend split at the top level.
    const frontendDir = subDirs.find((d) => roleFromName(baseName(d)) === "frontend");
    const backendDir = subDirs.find((d) => roleFromName(baseName(d)) === "backend");
    if (frontendDir && backendDir) {
      return {
        kind: "frontend-backend",
        workspace,
        components: [
          { path: frontendDir, role: "frontend" },
          { path: backendDir, role: "backend" },
        ],
      };
    }

    // 3. Root is itself an app (fullstack or single). Prefer root when present.
    if (manifestDirs.has("")) {
      return { kind: "single", workspace, components: [{ path: "", role: "app" }] };
    }

    // 4. No root manifest but one or more sub-apps (loose multi-package repo).
    if (subDirs.length > 0) {
      const components: ProjectComponent[] = subDirs.map((path) => ({ path, role: roleFromName(baseName(path)) }));
      return { kind: subDirs.length > 1 ? "monorepo" : "single", workspace, components };
    }

    // 5. Static site with no manifest at all.
    if (paths.has("index.html")) {
      return { kind: "single", workspace, components: [{ path: "", role: "app" }] };
    }

    return { kind: "unknown", workspace, components: [{ path: "", role: "app" }] };
  }

  private async detectWorkspace(manifestDirs: Set<string>): Promise<WorkspaceInfo> {
    const paths = await this.snapshot.paths();
    let tool: WorkspaceTool = null;
    let patterns: string[] = [];

    if (paths.has("turbo.json")) tool = "turborepo";
    else if (paths.has("nx.json")) tool = "nx";

    // Workspace globs come from pnpm-workspace.yaml or package.json "workspaces".
    const pnpmWs = await this.snapshot.readFile("pnpm-workspace.yaml");
    if (pnpmWs) {
      if (!tool) tool = "pnpm";
      patterns = parseYamlPackages(pnpmWs);
    }

    if (patterns.length === 0) {
      const rootPkg = await this.snapshot.readJson<{ workspaces?: string[] | { packages?: string[] } }>("package.json");
      const ws = rootPkg?.workspaces;
      const list = Array.isArray(ws) ? ws : (ws?.packages ?? []);
      if (list.length > 0) {
        patterns = list;
        if (!tool) tool = (await this.snapshot.hasFile("yarn.lock")) ? "yarn" : "npm";
      }
    }

    // Turborepo/Nx without explicit globs → default conventional locations.
    if (tool && patterns.length === 0) patterns = ["apps/*", "packages/*"];

    const packages = expandGlobs(patterns, manifestDirs).sort();
    return { tool, packages };
  }
}

/** Expand simple workspace globs ("apps/*", "packages/*", exact paths). */
function expandGlobs(patterns: string[], manifestDirs: Set<string>): string[] {
  const out = new Set<string>();
  for (const raw of patterns) {
    const pattern = raw.replace(/\/+$/, "");
    if (pattern.endsWith("/*")) {
      const base = pattern.slice(0, -2);
      for (const dir of manifestDirs) {
        if (dir !== "" && dirOf(dir) === base) out.add(dir);
      }
    } else if (manifestDirs.has(pattern)) {
      out.add(pattern);
    }
  }
  return [...out];
}

/** Minimal parse of the `packages:` list in pnpm-workspace.yaml. */
function parseYamlPackages(yaml: string): string[] {
  const out: string[] = [];
  let inPackages = false;
  for (const line of yaml.split("\n")) {
    if (/^packages\s*:/.test(line)) {
      inPackages = true;
      continue;
    }
    if (inPackages) {
      const m = line.match(/^\s*-\s*["']?([^"'#]+?)["']?\s*$/);
      if (m && m[1]) out.push(m[1].trim());
      else if (/^\S/.test(line)) break; // dedent → end of list
    }
  }
  return out;
}

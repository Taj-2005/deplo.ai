import type { EnvScope, EnvVariable } from "../../domain/deployment/Deployment";
import type { RepoSnapshot } from "./ports";

/**
 * Tree-driven environment variable detection.
 *
 * Unlike the previous fixed-filename approach, this walks the ACTUAL repository
 * tree, so it works regardless of how a user structures their project:
 *  - every .env* file anywhere in the repo (example files provide defaults;
 *    real .env files contribute keys only — their values are never reused)
 *  - every source file (bounded, prioritised) is scanned for references:
 *    process.env.X, process.env["X"], destructuring `const {A, B} = process.env`,
 *    import.meta.env.X, os.getenv/environ (Python)
 *  - each variable is scoped frontend/backend/shared from the file's location
 *    within the detected components (plus prefix rules like NEXT_PUBLIC_/VITE_)
 *  - keys that reference the backend URL (VITE_API_URL, NEXT_PUBLIC_API_URL, …)
 *    are detected for auto-injection instead of being asked of the user
 */

// ── Reference patterns ────────────────────────────────────────────────────────

const PROCESS_ENV_DOT = /process\.env\.([A-Z][A-Z0-9_]*)/g;
const PROCESS_ENV_BRACKET = /process\.env\[["']([A-Z][A-Z0-9_]*)["']\]/g;
const PROCESS_ENV_DESTRUCTURE = /(?:const|let|var)\s*\{([^}]+)\}\s*=\s*process\.env/g;
const IMPORT_META = /import\.meta\.env\.([A-Z][A-Z0-9_]*)/g;
const PY_GETENV = /os\.(?:getenv|environ\.get)\(\s*["']([A-Z][A-Z0-9_]*)["']/g;
const PY_ENVIRON_BRACKET = /os\.environ\[["']([A-Z][A-Z0-9_]*)["']\]/g;

/** Platform variables the hosting providers manage — never ask the user. */
const PLATFORM_MANAGED = new Set([
  "NODE_ENV", "PORT", "HOST", "HOSTNAME", "CI",
  "VERCEL", "VERCEL_URL", "VERCEL_ENV", "VERCEL_REGION",
  "VERCEL_GIT_COMMIT_SHA", "VERCEL_GIT_COMMIT_REF", "VERCEL_GIT_PROVIDER", "VERCEL_DEPLOYMENT_ID",
  "RENDER", "RENDER_EXTERNAL_URL", "RENDER_EXTERNAL_HOSTNAME", "RENDER_SERVICE_ID",
  "PYTHON_VERSION", "NODE_VERSION",
]);

/**
 * Frontend keys that hold the backend/API base URL — deplo.ai injects the live
 * backend URL into these at deploy time instead of asking the user.
 */
const FRONTEND_API_KEY_RE =
  /^(NEXT_PUBLIC_|VITE_|REACT_APP_|NUXT_PUBLIC_|PUBLIC_)(API|BACKEND|SERVER)_?(BASE_?)?(URL|URI|HOST|ENDPOINT)$/;

/** Backend-side keys deplo.ai injects itself (frontend origin for CORS, etc.). */
const BACKEND_INJECTED = new Set(["FRONTEND_URL", "CLIENT_URL", "CORS_ORIGIN", "ALLOWED_ORIGINS_URL"]);

const FRONTEND_PREFIX_RE = /^(NEXT_PUBLIC_|VITE_|REACT_APP_|NUXT_PUBLIC_|GATSBY_|PUBLIC_)/;

const SOURCE_EXT_RE = /\.(js|jsx|ts|tsx|mjs|cjs|py)$/;
const EXCLUDED_PATH_RE = /(^|\/)(node_modules|dist|build|out|coverage|\.next|\.nuxt|__tests__|__pycache__)\//;
const TEST_FILE_RE = /\.(test|spec)\.[jt]sx?$/;

/** Higher-priority files are scanned first when the cap applies. */
const PRIORITY_PATH_RE = /(env|config|settings|database|db|server|index|main|app)\.[jt]s$|settings\.py$|config\.py$|main\.py$|app\.py$/i;

const MAX_SOURCE_FILES = 60;
const MAX_FILE_SIZE = 200_000;

export interface EnvScanComponent {
  path: string;
  role: "frontend" | "backend";
}

export interface EnvScanResult {
  /** User-facing variables (platform/auto-injected keys excluded). */
  vars: EnvVariable[];
  /** Frontend keys to auto-inject with the live backend URL at deploy time. */
  frontendApiKeys: string[];
}

export class EnvVarScanner {
  constructor(private readonly snapshot: RepoSnapshot) {}

  async scan(components: EnvScanComponent[]): Promise<EnvScanResult> {
    const tree = await this.snapshot.tree();
    const varMap = new Map<string, EnvVariable>();
    const frontendApiKeys = new Set<string>();

    const scopeOf = (filePath: string, key: string): EnvScope => {
      if (FRONTEND_PREFIX_RE.test(key)) return "frontend";
      for (const c of components) {
        if (c.path && filePath.startsWith(`${c.path}/`)) return c.role;
      }
      // Root files in a single-component repo inherit that component's role.
      const roles = new Set(components.map((c) => c.role));
      if (roles.size === 1 && components.every((c) => c.path === "")) {
        return components[0]!.role;
      }
      return "shared";
    };

    const record = (key: string, filePath: string, opts: { value?: string; isRequired?: boolean; source: EnvVariable["source"] }): void => {
      if (PLATFORM_MANAGED.has(key) || BACKEND_INJECTED.has(key)) return;
      if (FRONTEND_API_KEY_RE.test(key)) {
        frontendApiKeys.add(key);
        return; // auto-injected — never ask the user
      }
      const existing = varMap.get(key);
      if (existing) {
        // dotenv defaults enrich code-found vars; required-ness is sticky.
        if (opts.value && existing.value === "") existing.value = opts.value;
        if (existing.scope !== scopeOf(filePath, key) && existing.scope !== "shared") {
          // Same key seen on both sides → shared.
          const s = scopeOf(filePath, key);
          if (s !== existing.scope) existing.scope = "shared";
        }
        return;
      }
      varMap.set(key, {
        key,
        value: opts.value ?? "",
        isRequired: opts.isRequired ?? true,
        source: opts.source,
        scope: scopeOf(filePath, key),
      });
    };

    // ── 1. Every .env* file in the tree ─────────────────────────────────────
    const envFiles = tree
      .map((b) => b.path)
      .filter((p) => {
        const base = p.split("/").pop()!;
        return base === ".env" || base.startsWith(".env.");
      })
      // example/template files first — their values are safe defaults
      .sort((a, b) => Number(isRealEnvFile(b)) - Number(isRealEnvFile(a)) || a.localeCompare(b));

    for (const path of envFiles) {
      const content = await this.snapshot.readFile(path);
      if (!content) continue;
      const real = isRealEnvFile(path);
      for (const entry of parseEnvFile(content)) {
        record(entry.key, path, {
          // Never reuse values from a real .env — they may be actual secrets.
          value: real ? "" : entry.value,
          isRequired: real ? true : entry.isRequired,
          source: "dotenv",
        });
      }
    }

    // ── 2. Source files from the tree (bounded, prioritised) ───────────────
    const sourceFiles = tree
      .filter(
        (b) =>
          SOURCE_EXT_RE.test(b.path) &&
          !EXCLUDED_PATH_RE.test(b.path) &&
          !TEST_FILE_RE.test(b.path) &&
          b.size > 0 &&
          b.size < MAX_FILE_SIZE,
      )
      .sort((a, b) => Number(PRIORITY_PATH_RE.test(b.path)) - Number(PRIORITY_PATH_RE.test(a.path)))
      .slice(0, MAX_SOURCE_FILES);

    const BATCH = 10;
    for (let i = 0; i < sourceFiles.length; i += BATCH) {
      const batch = sourceFiles.slice(i, i + BATCH);
      const contents = await Promise.all(batch.map((b) => this.snapshot.readFile(b.path)));
      batch.forEach((b, idx) => {
        const content = contents[idx];
        if (!content) return;
        for (const key of extractEnvRefs(content)) {
          record(key, b.path, { source: "process_env" });
        }
      });
    }

    const vars = [...varMap.values()].sort((a, b) => {
      if (a.isRequired !== b.isRequired) return a.isRequired ? -1 : 1;
      return a.key.localeCompare(b.key);
    });

    return { vars, frontendApiKeys: [...frontendApiKeys].sort() };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** True for real env files (.env, .env.local, .env.production) vs example/template ones. */
function isRealEnvFile(path: string): boolean {
  const base = path.split("/").pop()!.toLowerCase();
  return !/(example|sample|template|dist|defaults)/.test(base);
}

export function extractEnvRefs(content: string): Set<string> {
  const keys = new Set<string>();
  for (const re of [PROCESS_ENV_DOT, PROCESS_ENV_BRACKET, IMPORT_META, PY_GETENV, PY_ENVIRON_BRACKET]) {
    re.lastIndex = 0;
    for (const m of content.matchAll(re)) if (m[1]) keys.add(m[1]);
  }
  PROCESS_ENV_DESTRUCTURE.lastIndex = 0;
  for (const m of content.matchAll(PROCESS_ENV_DESTRUCTURE)) {
    for (const raw of m[1]!.split(",")) {
      const name = raw.split(/[:=]/)[0]!.trim();
      if (/^[A-Z][A-Z0-9_]*$/.test(name)) keys.add(name);
    }
  }
  return keys;
}

function parseEnvFile(content: string): Array<{ key: string; value: string; isRequired: boolean }> {
  const result: Array<{ key: string; value: string; isRequired: boolean }> = [];
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).replace(/^export\s+/, "").trim();
    if (!/^[A-Z][A-Z0-9_]*$/.test(key)) continue;
    const raw = trimmed.slice(eqIdx + 1).trim();
    const value = raw.replace(/^["']|["']$/g, "");
    const isRequired = raw === "" || raw.toUpperCase() === "REQUIRED" || raw === '""' || raw === "''";
    result.push({ key, value: isRequired ? "" : value, isRequired });
  }
  return result;
}

/** Framework-default backend-URL keys — always injected even if not referenced yet. */
export function defaultFrontendApiKeys(frontend: string | null): string[] {
  switch (frontend) {
    case "NEXTJS":
      return ["NEXT_PUBLIC_API_URL"];
    case "REACT_VITE":
      return ["VITE_API_URL"];
    default:
      return [];
  }
}

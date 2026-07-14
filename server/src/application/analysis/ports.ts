/**
 * Ports (interfaces) the analysis pipeline depends on. Infrastructure provides
 * concrete implementations — the application layer never imports GitHub/HTTP.
 */

export interface RepoBlob {
  /** Path relative to repo root, POSIX separators. */
  path: string;
  size: number;
}

/**
 * Read-only source access to a single repository at a ref. Implementations
 * (e.g. GitHub) bind the token + repo + ref up front.
 */
export interface ISourceProvider {
  /** Flat list of all file blobs in the repo (directories excluded). */
  getTree(): Promise<RepoBlob[]>;
  /** File content as UTF-8 text, or null if missing / unreadable / binary. */
  readFile(path: string): Promise<string | null>;
}

/**
 * LLM completion port (Layer 3 reasoning). Implementations must return an
 * object that validates against the supplied JSON schema (strict structured
 * output) or throw. The application layer never sees HTTP/provider details.
 */
export interface ILlmClient {
  completeJson<T>(params: {
    /** System prompt framing the task. */
    system: string;
    /** User content (curated repo context — never the whole repository). */
    user: string;
    /** JSON schema the response must conform to (strict mode). */
    schema: Record<string, unknown>;
    /** Schema name for the provider's structured-output envelope. */
    schemaName: string;
  }): Promise<T>;
}

/**
 * A cached snapshot of a repository built once per analysis. Wraps an
 * ISourceProvider with memoised reads and cheap tree queries so detectors can
 * ask "does this file/dir exist?" without extra network calls.
 */
export class RepoSnapshot {
  private treeCache: RepoBlob[] | null = null;
  private readonly fileCache = new Map<string, string | null>();

  constructor(private readonly source: ISourceProvider) {}

  async tree(): Promise<RepoBlob[]> {
    if (this.treeCache === null) {
      this.treeCache = await this.source.getTree();
    }
    return this.treeCache;
  }

  /** Set of all file paths (memoised). */
  async paths(): Promise<Set<string>> {
    const tree = await this.tree();
    return new Set(tree.map((b) => b.path));
  }

  async hasFile(path: string): Promise<boolean> {
    return (await this.paths()).has(normalize(path));
  }

  /** True if any file exists directly under `dir` (non-recursive). */
  async hasDir(dir: string): Promise<boolean> {
    const prefix = dir ? `${normalize(dir)}/` : "";
    if (!prefix) return true;
    for (const p of await this.paths()) {
      if (p.startsWith(prefix)) return true;
    }
    return false;
  }

  /** Immediate child file/dir names under `dir` (non-recursive). */
  async listDir(dir: string): Promise<{ files: string[]; dirs: string[] }> {
    const prefix = dir ? `${normalize(dir)}/` : "";
    const files = new Set<string>();
    const dirs = new Set<string>();
    for (const p of await this.paths()) {
      if (prefix && !p.startsWith(prefix)) continue;
      const rest = p.slice(prefix.length);
      const slash = rest.indexOf("/");
      if (slash === -1) files.add(rest);
      else dirs.add(rest.slice(0, slash));
    }
    return { files: [...files], dirs: [...dirs] };
  }

  async readFile(path: string): Promise<string | null> {
    const key = normalize(path);
    if (!this.fileCache.has(key)) {
      this.fileCache.set(key, await this.source.readFile(key));
    }
    return this.fileCache.get(key) ?? null;
  }

  /** Read + JSON.parse a file, returning null on missing/invalid JSON. */
  async readJson<T>(path: string): Promise<T | null> {
    const raw = await this.readFile(path);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  /** Count files matching a predicate — used for language heuristics. */
  async countFiles(predicate: (path: string) => boolean): Promise<number> {
    let n = 0;
    for (const p of await this.paths()) if (predicate(p)) n++;
    return n;
  }
}

function normalize(path: string): string {
  return path.replace(/^\.?\//, "").replace(/\/+$/, "");
}

import type { ISourceProvider, RepoBlob } from "../../application/analysis/ports";
import type { GitHubAdapter } from "./GitHubAdapter";

/**
 * Adapts the GitHubAdapter to the analysis engine's ISourceProvider port,
 * binding a specific token + repo + ref. The full tree is fetched once
 * (recursive) so detectors can reason about structure without extra calls;
 * individual files are fetched on demand via the Contents API.
 */
export class RepoSourceAdapter implements ISourceProvider {
  constructor(
    private readonly github: GitHubAdapter,
    private readonly token: string,
    private readonly fullName: string,
    private readonly ref: string,
  ) {}

  async getTree(): Promise<RepoBlob[]> {
    const tree = await this.github.getRepoTree(this.token, this.fullName, this.ref);
    return tree.map((t) => ({ path: t.path, size: t.size }));
  }

  async readFile(path: string): Promise<string | null> {
    return this.github.getFileContent(this.token, this.fullName, path);
  }
}

import { AppError } from "../../shared/errors/AppError";
import { env } from "../../config/env";
import { logger } from "../../shared/logger/logger";

interface GitHubUserProfile {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  clone_url: string;
  default_branch: string;
  private: boolean;
  language: string | null;
  description: string | null;
}

interface GitHubOAuthToken {
  access_token: string;
  token_type: string;
  scope: string;
}

export class GitHubAdapter {
  private readonly apiBase = "https://api.github.com";

  async exchangeCodeForToken(code: string): Promise<string> {
    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: env.GITHUB_REDIRECT_URI,
      }),
    });

    const data = (await res.json()) as GitHubOAuthToken & {
      error?: string;
      error_description?: string;
    };

    if (!res.ok || data.error) {
      const detail = data.error_description ?? data.error ?? res.statusText;
      logger.error("GitHub token exchange failed", { status: res.status, detail });
      throw AppError.externalService("GitHub", detail);
    }

    return data.access_token;
  }

  async getUserProfile(accessToken: string): Promise<GitHubUserProfile> {
    const res = await this.request<GitHubUserProfile>(
      "/user",
      accessToken,
    );
    return res;
  }

  async listRepositories(accessToken: string): Promise<GitHubRepo[]> {
    const repos: GitHubRepo[] = [];
    let page = 1;

    while (true) {
      const batch = await this.request<GitHubRepo[]>(
        `/user/repos?per_page=100&page=${page}&sort=updated`,
        accessToken,
      );
      repos.push(...batch);
      if (batch.length < 100) break;
      page++;
    }

    return repos;
  }

  async getFileContent(
    accessToken: string,
    fullName: string,
    path: string,
  ): Promise<string | null> {
    try {
      const data = await this.request<{ content: string; encoding: string }>(
        `/repos/${fullName}/contents/${path}`,
        accessToken,
      );
      return Buffer.from(data.content, "base64").toString("utf8");
    } catch {
      return null;
    }
  }

  /** List entries in a directory (returns [] on error). */
  async listDirectory(
    accessToken: string,
    fullName: string,
    path: string,
  ): Promise<Array<{ name: string; type: "file" | "dir" }>> {
    try {
      const entries = await this.request<Array<{ name: string; type: string }>>(
        `/repos/${fullName}/contents/${path}`,
        accessToken,
      );
      return entries
        .filter((e) => e.type === "file" || e.type === "dir")
        .map((e) => ({ name: e.name, type: e.type as "file" | "dir" }));
    } catch {
      return [];
    }
  }

  /** Get the flat recursive file tree for a ref. Truncated trees fall back gracefully. */
  async getRepoTree(
    accessToken: string,
    fullName: string,
    ref: string,
  ): Promise<Array<{ path: string; sha: string; size: number }>> {
    try {
      const data = await this.request<{
        tree: Array<{ path: string; type: string; sha: string; size?: number }>;
        truncated: boolean;
      }>(`/repos/${fullName}/git/trees/${ref}?recursive=1`, accessToken);
      return data.tree
        .filter((e) => e.type === "blob")
        .map((e) => ({ path: e.path, sha: e.sha, size: e.size ?? 0 }));
    } catch {
      return [];
    }
  }

  /** Download a blob by its SHA as a Buffer. */
  async getBlob(
    accessToken: string,
    fullName: string,
    sha: string,
  ): Promise<Buffer> {
    const data = await this.request<{ content: string; encoding: string }>(
      `/repos/${fullName}/git/blobs/${sha}`,
      accessToken,
    );
    return Buffer.from(data.content, "base64");
  }

  private async request<T>(path: string, token: string): Promise<T> {
    const res = await fetch(`${this.apiBase}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw AppError.externalService(
        "GitHub",
        `${res.status} ${res.statusText}: ${body}`,
      );
    }

    return res.json() as Promise<T>;
  }
}

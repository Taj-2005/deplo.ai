import { AppError } from "../../shared/errors/AppError";
import { env } from "../../config/env";

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

    if (!res.ok) {
      throw AppError.externalService("GitHub", "Token exchange failed");
    }

    const data = (await res.json()) as GitHubOAuthToken & { error?: string };
    if (data.error) {
      throw AppError.externalService("GitHub", data.error);
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
      const data = await this.request<{
        content: string;
        encoding: string;
      }>(`/repos/${fullName}/contents/${path}`, accessToken);
      return Buffer.from(data.content, "base64").toString("utf8");
    } catch {
      return null;
    }
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
